-- Reject unknown IANA names at write time (CHECK cannot subquery pg_timezone_names).
-- Keep using an unexpired day/month quota row when timezone changes mid-period.

CREATE OR REPLACE FUNCTION reject_invalid_user_settings_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public', pg_catalog
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_timezone_names
        WHERE name = NEW.timezone
    ) THEN
        RAISE EXCEPTION 'invalid timezone: %', NEW.timezone
            USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_invalid_user_settings_timezone ON user_settings;
CREATE TRIGGER reject_invalid_user_settings_timezone
    BEFORE INSERT OR UPDATE OF timezone ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION reject_invalid_user_settings_timezone();

CREATE OR REPLACE FUNCTION admit_proxy_request(
    p_proxy_key_id UUID,
    p_model TEXT,
    p_estimated_tokens BIGINT,
    p_estimated_usd NUMERIC,
    p_body_bytes INTEGER DEFAULT 0,
    p_managed BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    proxy_key proxy_api_keys%ROWTYPE;
    owner_tz TEXT := 'UTC';
    minute_start TIMESTAMPTZ;
    day_start TIMESTAMPTZ;
    month_start TIMESTAMPTZ;
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

    SELECT COALESCE(NULLIF(us.timezone, ''), 'UTC')
    INTO owner_tz
    FROM user_settings us
    WHERE us.id = proxy_key.user_id;
    IF owner_tz IS NULL THEN
        owner_tz := 'UTC';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM pg_timezone_names
        WHERE name = owner_tz
    ) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_timezone');
    END IF;

    -- RPM is UTC minute. Reuse an unexpired day/month bucket so a timezone
    -- change does not zero the active window; the new zone applies next period.
    minute_start := date_trunc('minute', NOW());

    SELECT window_start
    INTO day_start
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'day'
      AND window_start <= NOW()
      AND window_start + INTERVAL '1 day' > NOW()
    ORDER BY window_start DESC
    LIMIT 1;
    IF day_start IS NULL THEN
        day_start := (date_trunc('day', NOW() AT TIME ZONE owner_tz) AT TIME ZONE owner_tz);
    END IF;

    SELECT window_start
    INTO month_start
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'month'
      AND window_start <= NOW()
      AND window_start + INTERVAL '1 month' > NOW()
    ORDER BY window_start DESC
    LIMIT 1;
    IF month_start IS NULL THEN
        month_start := (date_trunc('month', NOW() AT TIME ZONE owner_tz) AT TIME ZONE owner_tz);
    END IF;

    IF COALESCE(p_managed, TRUE) THEN
        IF NULLIF(p_model, '') IS NULL
           AND COALESCE(cardinality(proxy_key.allowed_models), 0) > 0 THEN
            RETURN jsonb_build_object('ok', false, 'code', 'model_required');
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
                      AND left(
                          p_model,
                          char_length(left(pattern, length(pattern) - 1))
                      ) = left(pattern, length(pattern) - 1)
                  )
           ) THEN
            RETURN jsonb_build_object('ok', false, 'code', 'model_denied');
        END IF;
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
    IF proxy_key.token_day_limit IS NOT NULL
       AND day_window.token_count
           + day_window.reserved_tokens
           + estimated_tokens > proxy_key.token_day_limit THEN
        RETURN jsonb_build_object('ok', false, 'code', 'tokens');
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

COMMENT ON FUNCTION admit_proxy_request(UUID, TEXT, BIGINT, NUMERIC, INTEGER, BOOLEAN) IS
    'Atomically checks RPM/RPD (hard) and token-day/USD-month (guardrails). Passthrough (p_managed=false) skips allowlist. p_body_bytes is unused. Day/month windows follow user_settings.timezone. Changing timezone keeps the unexpired bucket until window_start + 1 day/month.';
COMMENT ON COLUMN user_settings.timezone IS
    'IANA timezone for civil day/month quota windows. Default UTC. Changing timezone does not rewrite or zero the active window_start row.';
