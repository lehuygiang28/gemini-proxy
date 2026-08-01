-- Ops console: Realtime publication + dashboard period filter
-- Apply in Supabase SQL editor (or any Postgres with supabase_realtime publication).

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE request_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE api_keys;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE proxy_api_keys;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP FUNCTION IF EXISTS get_dashboard_statistics(UUID);
CREATE OR REPLACE FUNCTION get_dashboard_statistics(
    p_user_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    result JSON;
    effective_user_id UUID;
    total_api_keys BIGINT;
    total_proxy_keys BIGINT;
    total_requests BIGINT;
    successful_requests BIGINT;
    total_tokens_sum BIGINT;
    avg_response_time_ms NUMERIC;
    avg_total_response_time_ms NUMERIC;
    success_rate NUMERIC;
BEGIN
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;

    SELECT COUNT(*) INTO total_api_keys
    FROM api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND is_active = true;

    SELECT COUNT(*) INTO total_proxy_keys
    FROM proxy_api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND is_active = true;

    SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_successful = true) as successful_count,
        COALESCE(
            SUM(
                CASE
                    WHEN (performance_metrics->>'duration_ms') ~ '^[0-9]+(\.[0-9]+)?$'
                    THEN (performance_metrics->>'duration_ms')::NUMERIC
                    ELSE 0
                END
            ),
            0
        ) / NULLIF(COUNT(*), 0) as avg_response_time,
        COALESCE(
            SUM(
                CASE
                    WHEN (performance_metrics->>'total_response_time_ms') ~ '^[0-9]+(\.[0-9]+)?$'
                    THEN (performance_metrics->>'total_response_time_ms')::NUMERIC
                    ELSE 0
                END
            ),
            0
        ) / NULLIF(COUNT(*), 0) as avg_total_response_time
    INTO total_requests, successful_requests, avg_response_time_ms, avg_total_response_time_ms
    FROM request_logs
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND (p_days_back IS NULL OR created_at >= NOW() - (p_days_back || ' days')::INTERVAL);

    SELECT COALESCE(SUM(total_tokens), 0) INTO total_tokens_sum
    FROM proxy_api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id);

    success_rate := CASE
        WHEN total_requests > 0 THEN
            ROUND((successful_requests::NUMERIC / total_requests::NUMERIC) * 100, 2)
        ELSE 0
    END;

    result := json_build_object(
        'total_api_keys', total_api_keys,
        'total_proxy_keys', total_proxy_keys,
        'total_requests', total_requests,
        'successful_requests', successful_requests,
        'total_tokens', total_tokens_sum,
        'avg_response_time_ms', COALESCE(ROUND(avg_response_time_ms), 0),
        'avg_total_response_time_ms', COALESCE(ROUND(avg_total_response_time_ms), 0),
        'success_rate', success_rate,
        'active_keys', total_api_keys + total_proxy_keys,
        'period_days', p_days_back
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_statistics(UUID, INTEGER) TO authenticated;
COMMENT ON FUNCTION get_dashboard_statistics(UUID, INTEGER) IS 'Returns dashboard statistics; request aggregates honor optional p_days_back, key inventory is all-time';
