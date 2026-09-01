-- Shared current-window math for admit + reset. Do not GRANT this helper.
CREATE OR REPLACE FUNCTION proxy_quota_window_starts(
    p_proxy_key_id UUID,
    p_tz TEXT
)
RETURNS TABLE (
    minute_start TIMESTAMPTZ,
    day_start TIMESTAMPTZ,
    month_start TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    resolved_day TIMESTAMPTZ;
    resolved_month TIMESTAMPTZ;
BEGIN
    SELECT w.window_start
    INTO resolved_day
    FROM proxy_key_quota_windows w
    WHERE w.proxy_key_id = p_proxy_key_id
      AND w.window_type = 'day'
      AND w.window_start <= NOW()
      AND w.window_start + INTERVAL '1 day' > NOW()
    ORDER BY w.window_start DESC
    LIMIT 1;
    IF resolved_day IS NULL THEN
        resolved_day := (date_trunc('day', NOW() AT TIME ZONE p_tz) AT TIME ZONE p_tz);
    END IF;

    SELECT w.window_start
    INTO resolved_month
    FROM proxy_key_quota_windows w
    WHERE w.proxy_key_id = p_proxy_key_id
      AND w.window_type = 'month'
      AND w.window_start <= NOW()
      AND w.window_start + INTERVAL '1 month' > NOW()
    ORDER BY w.window_start DESC
    LIMIT 1;
    IF resolved_month IS NULL THEN
        resolved_month := (date_trunc('month', NOW() AT TIME ZONE p_tz) AT TIME ZONE p_tz);
    END IF;

    RETURN QUERY SELECT
        date_trunc('minute', NOW()),
        resolved_day,
        resolved_month;
END;
$$;

COMMENT ON FUNCTION proxy_quota_window_starts(UUID, TEXT) IS
    'Current minute/day/month window_start values. Reuses an unexpired day/month bucket when timezone changes mid-period.';

REVOKE ALL ON FUNCTION proxy_quota_window_starts(UUID, TEXT) FROM PUBLIC;

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

    SELECT s.minute_start, s.day_start, s.month_start
    INTO minute_start, day_start, month_start
    FROM proxy_quota_window_starts(p_proxy_key_id, owner_tz) AS s;

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

CREATE OR REPLACE FUNCTION reset_proxy_key_quota(
    p_proxy_key_id UUID,
    p_window_types TEXT[]
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
    window_kind TEXT;
    target_start TIMESTAMPTZ;
    reset_arr TEXT[] := ARRAY[]::TEXT[];
    skipped_arr TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT *
    INTO proxy_key
    FROM proxy_api_keys
    WHERE id = p_proxy_key_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'unknown proxy key'
            USING ERRCODE = 'P0002';
    END IF;
    IF auth.role() <> 'service_role'
       AND proxy_key.user_id <> (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'forbidden'
            USING ERRCODE = '42501';
    END IF;
    IF p_window_types IS NULL
       OR cardinality(p_window_types) = 0
       OR EXISTS (
           SELECT 1
           FROM unnest(p_window_types) AS requested(window_type)
           WHERE requested.window_type IS NULL
              OR requested.window_type NOT IN ('minute', 'day', 'month')
       )
       OR cardinality(p_window_types)
           <> (SELECT count(DISTINCT requested.window_type) FROM unnest(p_window_types) AS requested(window_type))
    THEN
        RAISE EXCEPTION 'invalid window types'
            USING ERRCODE = '22023';
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
        RAISE EXCEPTION 'invalid timezone: %', owner_tz
            USING ERRCODE = '22023';
    END IF;

    SELECT s.minute_start, s.day_start, s.month_start
    INTO minute_start, day_start, month_start
    FROM proxy_quota_window_starts(p_proxy_key_id, owner_tz) AS s;

    FOREACH window_kind IN ARRAY ARRAY['minute', 'day', 'month']::TEXT[]
    LOOP
        IF NOT window_kind = ANY (p_window_types) THEN
            CONTINUE;
        END IF;
        target_start := CASE window_kind
            WHEN 'minute' THEN minute_start
            WHEN 'day' THEN day_start
            ELSE month_start
        END;

        PERFORM 1
        FROM proxy_key_quota_windows
        WHERE proxy_key_id = p_proxy_key_id
          AND window_type = window_kind
          AND window_start = target_start
        FOR UPDATE;

        IF NOT FOUND THEN
            skipped_arr := array_append(skipped_arr, window_kind);
            CONTINUE;
        END IF;

        UPDATE proxy_key_quota_windows
        SET
            request_count = 0,
            token_count = 0,
            reserved_tokens = 0,
            reserved_cost_usd = 0,
            settled_cost_usd = 0
        WHERE proxy_key_id = p_proxy_key_id
          AND window_type = window_kind
          AND window_start = target_start;

        reset_arr := array_append(reset_arr, window_kind);
    END LOOP;

    RETURN jsonb_build_object(
        'reset', to_jsonb(reset_arr),
        'skipped', to_jsonb(skipped_arr)
    );
END;
$$;

COMMENT ON FUNCTION reset_proxy_key_quota(UUID, TEXT[]) IS
    'Zeros selected current quota-window counters. Does not delete rows, rewrite request_logs, or change lifetime counters.';

CREATE OR REPLACE FUNCTION current_proxy_key_quota(p_proxy_key_id UUID)
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
    minute_window proxy_key_quota_windows%ROWTYPE;
    day_window proxy_key_quota_windows%ROWTYPE;
    month_window proxy_key_quota_windows%ROWTYPE;
BEGIN
    SELECT *
    INTO proxy_key
    FROM proxy_api_keys
    WHERE id = p_proxy_key_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'unknown proxy key'
            USING ERRCODE = 'P0002';
    END IF;
    IF auth.role() <> 'service_role'
       AND proxy_key.user_id <> (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'forbidden'
            USING ERRCODE = '42501';
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
        RAISE EXCEPTION 'invalid timezone: %', owner_tz
            USING ERRCODE = '22023';
    END IF;

    SELECT s.minute_start, s.day_start, s.month_start
    INTO minute_start, day_start, month_start
    FROM proxy_quota_window_starts(p_proxy_key_id, owner_tz) AS s;

    SELECT *
    INTO minute_window
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'minute'
      AND window_start = minute_start;

    SELECT *
    INTO day_window
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'day'
      AND window_start = day_start;

    SELECT *
    INTO month_window
    FROM proxy_key_quota_windows
    WHERE proxy_key_id = p_proxy_key_id
      AND window_type = 'month'
      AND window_start = month_start;

    RETURN jsonb_build_object(
        'minute', jsonb_build_object(
            'window_start', minute_start,
            'exists', minute_window.proxy_key_id IS NOT NULL,
            'request_count', COALESCE(minute_window.request_count, 0),
            'token_count', COALESCE(minute_window.token_count, 0),
            'reserved_tokens', COALESCE(minute_window.reserved_tokens, 0),
            'reserved_cost_usd', COALESCE(minute_window.reserved_cost_usd, 0),
            'settled_cost_usd', COALESCE(minute_window.settled_cost_usd, 0)
        ),
        'day', jsonb_build_object(
            'window_start', day_start,
            'exists', day_window.proxy_key_id IS NOT NULL,
            'request_count', COALESCE(day_window.request_count, 0),
            'token_count', COALESCE(day_window.token_count, 0),
            'reserved_tokens', COALESCE(day_window.reserved_tokens, 0),
            'reserved_cost_usd', COALESCE(day_window.reserved_cost_usd, 0),
            'settled_cost_usd', COALESCE(day_window.settled_cost_usd, 0)
        ),
        'month', jsonb_build_object(
            'window_start', month_start,
            'exists', month_window.proxy_key_id IS NOT NULL,
            'request_count', COALESCE(month_window.request_count, 0),
            'token_count', COALESCE(month_window.token_count, 0),
            'reserved_tokens', COALESCE(month_window.reserved_tokens, 0),
            'reserved_cost_usd', COALESCE(month_window.reserved_cost_usd, 0),
            'settled_cost_usd', COALESCE(month_window.settled_cost_usd, 0)
        )
    );
END;
$$;

COMMENT ON FUNCTION current_proxy_key_quota(UUID) IS
    'Current minute/day/month quota counters for a proxy key the caller owns.';

REVOKE ALL ON FUNCTION reset_proxy_key_quota(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION current_proxy_key_quota(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_proxy_key_quota(UUID, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_proxy_key_quota(UUID) TO authenticated, service_role;
