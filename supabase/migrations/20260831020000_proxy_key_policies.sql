ALTER TABLE proxy_api_keys
    ADD COLUMN IF NOT EXISTS rpm_limit INTEGER,
    ADD COLUMN IF NOT EXISTS tpm_limit INTEGER,
    ADD COLUMN IF NOT EXISTS rpd_limit INTEGER,
    ADD COLUMN IF NOT EXISTS max_concurrent INTEGER,
    ADD COLUMN IF NOT EXISTS daily_budget_usd NUMERIC(12,6),
    ADD COLUMN IF NOT EXISTS monthly_budget_usd NUMERIC(12,6),
    ADD COLUMN IF NOT EXISTS allowed_models TEXT[],
    ADD COLUMN IF NOT EXISTS denied_models TEXT[],
    ADD COLUMN IF NOT EXISTS max_output_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS max_request_body_bytes INTEGER,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS inflight_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE proxy_api_keys
    ADD CONSTRAINT proxy_api_keys_rpm_limit_pos CHECK (rpm_limit IS NULL OR rpm_limit > 0),
    ADD CONSTRAINT proxy_api_keys_tpm_limit_pos CHECK (tpm_limit IS NULL OR tpm_limit > 0),
    ADD CONSTRAINT proxy_api_keys_rpd_limit_pos CHECK (rpd_limit IS NULL OR rpd_limit > 0),
    ADD CONSTRAINT proxy_api_keys_max_concurrent_pos
        CHECK (max_concurrent IS NULL OR max_concurrent > 0),
    ADD CONSTRAINT proxy_api_keys_max_output_pos
        CHECK (max_output_tokens IS NULL OR max_output_tokens > 0),
    ADD CONSTRAINT proxy_api_keys_max_body_pos
        CHECK (max_request_body_bytes IS NULL OR max_request_body_bytes > 0),
    ADD CONSTRAINT proxy_api_keys_inflight_nonneg CHECK (inflight_count >= 0);

CREATE TABLE IF NOT EXISTS proxy_key_quota_windows (
    proxy_key_id UUID NOT NULL REFERENCES proxy_api_keys(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'day', 'month')),
    window_start TIMESTAMPTZ NOT NULL,
    request_count BIGINT NOT NULL DEFAULT 0,
    token_count BIGINT NOT NULL DEFAULT 0,
    reserved_tokens BIGINT NOT NULL DEFAULT 0,
    reserved_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    settled_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    PRIMARY KEY (proxy_key_id, window_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_proxy_key_quota_windows_start
    ON proxy_key_quota_windows (window_start);

ALTER TABLE proxy_key_quota_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quota windows for their proxy keys"
    ON proxy_key_quota_windows FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM proxy_api_keys p
            WHERE p.id = proxy_key_id
              AND (
                  p.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    );

CREATE OR REPLACE FUNCTION admit_proxy_request(
    p_proxy_key_id UUID,
    p_model TEXT,
    p_estimated_tokens BIGINT,
    p_estimated_usd NUMERIC,
    p_body_bytes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    proxy_key proxy_api_keys%ROWTYPE;
    minute_start TIMESTAMPTZ := date_trunc('minute', NOW());
    day_start TIMESTAMPTZ := date_trunc('day', NOW());
    month_start TIMESTAMPTZ := date_trunc('month', NOW());
    estimated_tokens BIGINT := GREATEST(COALESCE(p_estimated_tokens, 0), 0);
    estimated_usd NUMERIC := GREATEST(COALESCE(p_estimated_usd, 0), 0);
    minute_window proxy_key_quota_windows%ROWTYPE;
    day_window proxy_key_quota_windows%ROWTYPE;
    month_window proxy_key_quota_windows%ROWTYPE;
BEGIN
    SELECT *
    INTO proxy_key
    FROM proxy_api_keys
    WHERE id = p_proxy_key_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'unknown_key');
    END IF;
    IF NOT proxy_key.is_active THEN
        RETURN jsonb_build_object('ok', false, 'code', 'inactive_key');
    END IF;
    IF proxy_key.expires_at IS NOT NULL AND proxy_key.expires_at <= NOW() THEN
        RETURN jsonb_build_object('ok', false, 'code', 'expired_key');
    END IF;
    IF NULLIF(p_model, '') IS NULL
       AND COALESCE(cardinality(proxy_key.allowed_models), 0) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'model_required');
    END IF;
    IF NULLIF(p_model, '') IS NOT NULL
       AND COALESCE(cardinality(proxy_key.denied_models), 0) > 0
       AND EXISTS (
           SELECT 1
           FROM unnest(proxy_key.denied_models) AS pattern
           WHERE p_model = pattern
              OR (
                  right(pattern, 1) = '*'
                  AND position('*' IN left(pattern, length(pattern) - 1)) = 0
                  AND p_model LIKE replace(pattern, '*', '%')
              )
       ) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'model_denied');
    END IF;
    IF NULLIF(p_model, '') IS NOT NULL
       AND COALESCE(cardinality(proxy_key.allowed_models), 0) > 0
       AND NOT EXISTS (
           SELECT 1
           FROM unnest(proxy_key.allowed_models) AS pattern
           WHERE p_model = pattern
              OR (
                  right(pattern, 1) = '*'
                  AND position('*' IN left(pattern, length(pattern) - 1)) = 0
                  AND p_model LIKE replace(pattern, '*', '%')
              )
       ) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'model_denied');
    END IF;
    IF proxy_key.max_request_body_bytes IS NOT NULL
       AND COALESCE(p_body_bytes, 0) > proxy_key.max_request_body_bytes THEN
        RETURN jsonb_build_object('ok', false, 'code', 'body_too_large');
    END IF;
    IF proxy_key.max_concurrent IS NOT NULL
       AND proxy_key.inflight_count >= proxy_key.max_concurrent THEN
        RETURN jsonb_build_object('ok', false, 'code', 'concurrency');
    END IF;

    INSERT INTO proxy_key_quota_windows (proxy_key_id, window_type, window_start)
    VALUES
        (p_proxy_key_id, 'minute', minute_start),
        (p_proxy_key_id, 'day', day_start),
        (p_proxy_key_id, 'month', month_start)
    ON CONFLICT (proxy_key_id, window_type, window_start) DO NOTHING;

    SELECT *
    INTO minute_window
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'minute'
      AND window_start = minute_start
    FOR UPDATE;

    SELECT *
    INTO day_window
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'day'
      AND window_start = day_start
    FOR UPDATE;

    SELECT *
    INTO month_window
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'month'
      AND window_start = month_start
    FOR UPDATE;

    IF proxy_key.rpm_limit IS NOT NULL
       AND minute_window.request_count >= proxy_key.rpm_limit THEN
        RETURN jsonb_build_object('ok', false, 'code', 'rpm');
    END IF;
    IF proxy_key.rpd_limit IS NOT NULL
       AND day_window.request_count >= proxy_key.rpd_limit THEN
        RETURN jsonb_build_object('ok', false, 'code', 'rpd');
    END IF;
    IF proxy_key.tpm_limit IS NOT NULL
       AND minute_window.token_count
           + minute_window.reserved_tokens
           + estimated_tokens > proxy_key.tpm_limit THEN
        RETURN jsonb_build_object('ok', false, 'code', 'tpm');
    END IF;
    IF proxy_key.daily_budget_usd IS NOT NULL
       AND day_window.reserved_cost_usd
           + day_window.settled_cost_usd
           + estimated_usd > proxy_key.daily_budget_usd THEN
        RETURN jsonb_build_object('ok', false, 'code', 'budget');
    END IF;
    IF proxy_key.monthly_budget_usd IS NOT NULL
       AND month_window.reserved_cost_usd
           + month_window.settled_cost_usd
           + estimated_usd > proxy_key.monthly_budget_usd THEN
        RETURN jsonb_build_object('ok', false, 'code', 'budget');
    END IF;

    UPDATE proxy_api_keys
    SET inflight_count = inflight_count + 1
    WHERE id = p_proxy_key_id;

    UPDATE proxy_key_quota_windows
    SET
        request_count = request_count + 1,
        reserved_tokens = reserved_tokens + estimated_tokens,
        reserved_cost_usd = reserved_cost_usd + estimated_usd
    WHERE proxy_key_id = p_proxy_key_id
      AND (
          (window_type = 'minute' AND window_start = minute_start)
          OR (window_type = 'day' AND window_start = day_start)
          OR (window_type = 'month' AND window_start = month_start)
      );

    RETURN jsonb_build_object(
        'ok', true,
        'reserved_tokens', estimated_tokens,
        'reserved_usd', estimated_usd,
        'window_starts', jsonb_build_object(
            'minute', minute_start,
            'day', day_start,
            'month', month_start
        )
    );
END;
$$;

COMMENT ON FUNCTION admit_proxy_request(UUID, TEXT, BIGINT, NUMERIC, INTEGER) IS
    'Atomically checks proxy-key limits, increments inflight/request counts, and reserves estimated tokens and cost. Estimates stay in reserved ledgers until settle moves actual usage to token_count and settled_cost_usd.';

CREATE OR REPLACE FUNCTION settle_proxy_request(
    p_proxy_key_id UUID,
    p_request_id TEXT,
    p_reserved_tokens BIGINT,
    p_reserved_usd NUMERIC,
    p_actual_tokens BIGINT,
    p_actual_usd NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    minute_start TIMESTAMPTZ := date_trunc('minute', NOW());
    day_start TIMESTAMPTZ := date_trunc('day', NOW());
    month_start TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
    UPDATE proxy_api_keys
    SET inflight_count = GREATEST(inflight_count - 1, 0)
    WHERE id = p_proxy_key_id
      AND deleted_at IS NULL;

    UPDATE proxy_key_quota_windows
    SET
        reserved_tokens = GREATEST(
            reserved_tokens - GREATEST(COALESCE(p_reserved_tokens, 0), 0),
            0
        ),
        reserved_cost_usd = GREATEST(
            reserved_cost_usd - GREATEST(COALESCE(p_reserved_usd, 0), 0),
            0
        ),
        token_count = token_count + GREATEST(COALESCE(p_actual_tokens, 0), 0),
        settled_cost_usd = settled_cost_usd + GREATEST(COALESCE(p_actual_usd, 0), 0)
    WHERE proxy_key_id = p_proxy_key_id
      AND (
          (window_type = 'minute' AND window_start = minute_start)
          OR (window_type = 'day' AND window_start = day_start)
          OR (window_type = 'month' AND window_start = month_start)
      );

    PERFORM p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION admit_proxy_request(UUID, TEXT, BIGINT, NUMERIC, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION settle_proxy_request(UUID, TEXT, BIGINT, NUMERIC, BIGINT, NUMERIC)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admit_proxy_request(UUID, TEXT, BIGINT, NUMERIC, INTEGER)
    TO service_role;
GRANT EXECUTE ON FUNCTION settle_proxy_request(UUID, TEXT, BIGINT, NUMERIC, BIGINT, NUMERIC)
    TO service_role;
