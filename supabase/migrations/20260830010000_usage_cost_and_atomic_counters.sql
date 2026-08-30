-- Atomic usage counters + thoughts / tool-use / estimated cost on request-log stats.

CREATE OR REPLACE FUNCTION increment_api_key_usage(
    p_id UUID,
    p_success BIGINT DEFAULT 0,
    p_failure BIGINT DEFAULT 0,
    p_prompt BIGINT DEFAULT 0,
    p_completion BIGINT DEFAULT 0,
    p_total BIGINT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
BEGIN
    UPDATE api_keys
    SET
        success_count = success_count + COALESCE(p_success, 0),
        failure_count = failure_count + COALESCE(p_failure, 0),
        prompt_tokens = prompt_tokens + COALESCE(p_prompt, 0),
        completion_tokens = completion_tokens + COALESCE(p_completion, 0),
        total_tokens = total_tokens + COALESCE(p_total, 0),
        last_used_at = CASE
            WHEN COALESCE(p_success, 0) > 0 THEN NOW()
            ELSE last_used_at
        END,
        last_error_at = CASE
            WHEN COALESCE(p_failure, 0) > 0 THEN NOW()
            ELSE last_error_at
        END,
        updated_at = NOW()
    WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_proxy_api_key_usage(
    p_id UUID,
    p_success BIGINT DEFAULT 0,
    p_failure BIGINT DEFAULT 0,
    p_prompt BIGINT DEFAULT 0,
    p_completion BIGINT DEFAULT 0,
    p_total BIGINT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
BEGIN
    UPDATE proxy_api_keys
    SET
        success_count = success_count + COALESCE(p_success, 0),
        failure_count = failure_count + COALESCE(p_failure, 0),
        prompt_tokens = prompt_tokens + COALESCE(p_prompt, 0),
        completion_tokens = completion_tokens + COALESCE(p_completion, 0),
        total_tokens = total_tokens + COALESCE(p_total, 0),
        last_used_at = CASE
            WHEN COALESCE(p_success, 0) > 0 THEN NOW()
            ELSE last_used_at
        END,
        last_error_at = CASE
            WHEN COALESCE(p_failure, 0) > 0 THEN NOW()
            ELSE last_error_at
        END,
        updated_at = NOW()
    WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_api_key_usage(UUID, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT)
    TO service_role;
GRANT EXECUTE ON FUNCTION increment_proxy_api_key_usage(UUID, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT)
    TO service_role;

CREATE OR REPLACE FUNCTION get_request_logs_statistics(
    p_user_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT 7
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    result JSON;
    effective_user_id UUID;
    cutoff_date TIMESTAMP WITH TIME ZONE;
    total_requests BIGINT;
    successful_requests BIGINT;
    failed_requests BIGINT;
    total_tokens_sum BIGINT;
    prompt_tokens_sum BIGINT;
    completion_tokens_sum BIGINT;
    cache_tokens_sum BIGINT;
    thoughts_tokens_sum BIGINT;
    tool_use_prompt_tokens_sum BIGINT;
    estimated_cost_usd_sum NUMERIC;
    avg_response_time_ms NUMERIC;
    avg_total_response_time_ms NUMERIC;
    success_rate NUMERIC;
    requests_by_format JSON;
    requests_by_hour JSON;
BEGIN
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;
    cutoff_date := NOW() - INTERVAL '1 day' * p_days_back;

    SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_successful = true) as successful_count,
        COUNT(*) FILTER (WHERE is_successful = false) as failed_count,
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
    INTO total_requests, successful_requests, failed_requests, avg_response_time_ms, avg_total_response_time_ms
    FROM request_logs
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND created_at >= cutoff_date;

    SELECT
        COALESCE(SUM(
            CASE
                WHEN (usage_metadata->>'total_tokens') ~ '^[0-9]+$'
                THEN (usage_metadata->>'total_tokens')::BIGINT
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN (usage_metadata->>'prompt_tokens') ~ '^[0-9]+$'
                THEN (usage_metadata->>'prompt_tokens')::BIGINT
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN (usage_metadata->>'completion_tokens') ~ '^[0-9]+$'
                THEN (usage_metadata->>'completion_tokens')::BIGINT
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN (usage_metadata->>'cache_tokens') ~ '^[0-9]+$'
                THEN (usage_metadata->>'cache_tokens')::BIGINT
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN (usage_metadata->>'thoughts_tokens') ~ '^[0-9]+$'
                THEN (usage_metadata->>'thoughts_tokens')::BIGINT
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN (usage_metadata->>'tool_use_prompt_tokens') ~ '^[0-9]+$'
                THEN (usage_metadata->>'tool_use_prompt_tokens')::BIGINT
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN (usage_metadata->>'estimated_cost_usd') ~ '^[0-9]+(\.[0-9]+)?$'
                THEN (usage_metadata->>'estimated_cost_usd')::NUMERIC
                ELSE 0
            END
        ), 0)
    INTO total_tokens_sum, prompt_tokens_sum, completion_tokens_sum, cache_tokens_sum,
         thoughts_tokens_sum, tool_use_prompt_tokens_sum, estimated_cost_usd_sum
    FROM request_logs
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND created_at >= cutoff_date
    AND usage_metadata IS NOT NULL;

    success_rate := CASE
        WHEN total_requests > 0 THEN
            ROUND((successful_requests::NUMERIC / total_requests::NUMERIC) * 100, 2)
        ELSE 0
    END;

    SELECT json_object_agg(api_format, format_count)
    INTO requests_by_format
    FROM (
        SELECT api_format, COUNT(*) as format_count
        FROM request_logs
        WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
        AND created_at >= cutoff_date
        GROUP BY api_format
    ) format_stats;

    SELECT json_object_agg(hour_bucket, hour_count)
    INTO requests_by_hour
    FROM (
        SELECT
            EXTRACT(HOUR FROM created_at)::TEXT as hour_bucket,
            COUNT(*) as hour_count
        FROM request_logs
        WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
        AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY EXTRACT(HOUR FROM created_at)
    ) hour_stats;

    result := json_build_object(
        'total_requests', total_requests,
        'successful_requests', successful_requests,
        'failed_requests', failed_requests,
        'total_tokens', total_tokens_sum,
        'prompt_tokens', prompt_tokens_sum,
        'completion_tokens', completion_tokens_sum,
        'cache_tokens', cache_tokens_sum,
        'thoughts_tokens', thoughts_tokens_sum,
        'tool_use_prompt_tokens', tool_use_prompt_tokens_sum,
        'estimated_cost_usd', COALESCE(ROUND(estimated_cost_usd_sum, 6), 0),
        'avg_response_time_ms', COALESCE(ROUND(avg_response_time_ms), 0),
        'avg_total_response_time_ms', COALESCE(ROUND(avg_total_response_time_ms), 0),
        'success_rate', success_rate,
        'requests_by_format', COALESCE(requests_by_format, '{}'::json),
        'requests_by_hour', COALESCE(requests_by_hour, '{}'::json),
        'period_days', p_days_back
    );

    RETURN result;
END;
$$;

COMMENT ON FUNCTION get_request_logs_statistics(UUID, INTEGER) IS
    'Request-log stats including prompt/completion/cache/thoughts/tool-use tokens and estimated USD';
