-- Statistics RPC Functions for Gemini Proxy
-- These functions move statistical calculations from frontend to database side

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_statistics(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_api_keys BIGINT;
    total_proxy_keys BIGINT;
    total_requests BIGINT;
    successful_requests BIGINT;
    total_tokens_sum BIGINT;
    avg_response_time_ms NUMERIC;
    success_rate NUMERIC;
BEGIN
    -- Get API keys count
    SELECT COUNT(*) INTO total_api_keys
    FROM api_keys
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND is_active = true;
    
    -- Get proxy keys count
    SELECT COUNT(*) INTO total_proxy_keys
    FROM proxy_api_keys
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND is_active = true;
    
    -- Get request logs statistics
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_successful = true) as successful_count,
        COALESCE(SUM((performance_metrics->>'duration')::NUMERIC), 0) / NULLIF(COUNT(*), 0) as avg_response_time
    INTO total_requests, successful_requests, avg_response_time_ms
    FROM request_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id);
    
    -- Get total tokens from proxy keys
    SELECT COALESCE(SUM(total_tokens), 0) INTO total_tokens_sum
    FROM proxy_api_keys
    WHERE (p_user_id IS NULL OR user_id = p_user_id);
    
    -- Calculate success rate
    success_rate := CASE 
        WHEN total_requests > 0 THEN 
            ROUND((successful_requests::NUMERIC / total_requests::NUMERIC) * 100, 2)
        ELSE 0 
    END;
    
    -- Build result JSON
    result := json_build_object(
        'total_api_keys', total_api_keys,
        'total_proxy_keys', total_proxy_keys,
        'total_requests', total_requests,
        'successful_requests', successful_requests,
        'total_tokens', total_tokens_sum,
        'avg_response_time_ms', COALESCE(ROUND(avg_response_time_ms), 0),
        'success_rate', success_rate,
        'active_keys', total_api_keys + total_proxy_keys
    );
    
    RETURN result;
END;
$$;

-- Function to get retry statistics
CREATE OR REPLACE FUNCTION get_retry_statistics(
    p_user_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_requests BIGINT;
    requests_with_retries BIGINT;
    total_retry_attempts BIGINT;
    retry_rate NUMERIC;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate cutoff date
    cutoff_date := NOW() - INTERVAL '1 day' * p_days_back;
    
    -- Get retry statistics from request logs
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE jsonb_array_length(retry_attempts) > 0) as retry_count,
        COALESCE(SUM(jsonb_array_length(retry_attempts)), 0) as total_attempts
    INTO total_requests, requests_with_retries, total_retry_attempts
    FROM request_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at >= cutoff_date;
    
    -- Calculate retry rate
    retry_rate := CASE 
        WHEN total_requests > 0 THEN 
            ROUND((requests_with_retries::NUMERIC / total_requests::NUMERIC) * 100, 2)
        ELSE 0 
    END;
    
    -- Build result JSON
    result := json_build_object(
        'total_requests', total_requests,
        'requests_with_retries', requests_with_retries,
        'total_retry_attempts', total_retry_attempts,
        'retry_rate', retry_rate,
        'period_days', p_days_back
    );
    
    RETURN result;
END;
$$;

-- Function to get API key usage statistics
CREATE OR REPLACE FUNCTION get_api_key_statistics(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_keys BIGINT;
    active_keys BIGINT;
    total_success_count BIGINT;
    total_failure_count BIGINT;
    total_usage_count BIGINT;
    success_rate NUMERIC;
BEGIN
    -- Get API key statistics
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COALESCE(SUM(success_count), 0) as total_success,
        COALESCE(SUM(failure_count), 0) as total_failure
    INTO total_keys, active_keys, total_success_count, total_failure_count
    FROM api_keys
    WHERE (p_user_id IS NULL OR user_id = p_user_id);
    
    -- Calculate totals and success rate
    total_usage_count := total_success_count + total_failure_count;
    success_rate := CASE 
        WHEN total_usage_count > 0 THEN 
            ROUND((total_success_count::NUMERIC / total_usage_count::NUMERIC) * 100, 2)
        ELSE 0 
    END;
    
    -- Build result JSON
    result := json_build_object(
        'total_keys', total_keys,
        'active_keys', active_keys,
        'inactive_keys', total_keys - active_keys,
        'total_success_count', total_success_count,
        'total_failure_count', total_failure_count,
        'total_usage_count', total_usage_count,
        'success_rate', success_rate
    );
    
    RETURN result;
END;
$$;

-- Function to get proxy key usage statistics
CREATE OR REPLACE FUNCTION get_proxy_key_statistics(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_keys BIGINT;
    active_keys BIGINT;
    total_success_count BIGINT;
    total_failure_count BIGINT;
    total_tokens_sum BIGINT;
    total_prompt_tokens BIGINT;
    total_completion_tokens BIGINT;
    success_rate NUMERIC;
BEGIN
    -- Get proxy key statistics
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COALESCE(SUM(success_count), 0) as total_success,
        COALESCE(SUM(failure_count), 0) as total_failure,
        COALESCE(SUM(total_tokens), 0) as total_tokens_sum,
        COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as total_completion_tokens
    INTO total_keys, active_keys, total_success_count, total_failure_count, 
         total_tokens_sum, total_prompt_tokens, total_completion_tokens
    FROM proxy_api_keys
    WHERE (p_user_id IS NULL OR user_id = p_user_id);
    
    -- Calculate success rate
    success_rate := CASE 
        WHEN (total_success_count + total_failure_count) > 0 THEN 
            ROUND((total_success_count::NUMERIC / (total_success_count + total_failure_count)::NUMERIC) * 100, 2)
        ELSE 0 
    END;
    
    -- Build result JSON
    result := json_build_object(
        'total_keys', total_keys,
        'active_keys', active_keys,
        'inactive_keys', total_keys - active_keys,
        'total_success_count', total_success_count,
        'total_failure_count', total_failure_count,
        'total_tokens', total_tokens_sum,
        'total_prompt_tokens', total_prompt_tokens,
        'total_completion_tokens', total_completion_tokens,
        'success_rate', success_rate
    );
    
    RETURN result;
END;
$$;

-- Function to get request logs summary statistics
CREATE OR REPLACE FUNCTION get_request_logs_statistics(
    p_user_id UUID DEFAULT NULL,
    p_days_back INTEGER DEFAULT 7
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    cutoff_date TIMESTAMP WITH TIME ZONE;
    total_requests BIGINT;
    successful_requests BIGINT;
    failed_requests BIGINT;
    total_tokens_sum BIGINT;
    avg_response_time_ms NUMERIC;
    success_rate NUMERIC;
    requests_by_format JSON;
    requests_by_hour JSON;
BEGIN
    -- Calculate cutoff date
    cutoff_date := NOW() - INTERVAL '1 day' * p_days_back;
    
    -- Get basic request statistics
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_successful = true) as successful_count,
        COUNT(*) FILTER (WHERE is_successful = false) as failed_count,
        COALESCE(SUM((performance_metrics->>'duration')::NUMERIC), 0) / NULLIF(COUNT(*), 0) as avg_response_time
    INTO total_requests, successful_requests, failed_requests, avg_response_time_ms
    FROM request_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at >= cutoff_date;
    
    -- Get total tokens from usage_metadata
    SELECT COALESCE(SUM((usage_metadata->>'total_tokens')::BIGINT), 0)
    INTO total_tokens_sum
    FROM request_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at >= cutoff_date
    AND usage_metadata IS NOT NULL;
    
    -- Calculate success rate
    success_rate := CASE 
        WHEN total_requests > 0 THEN 
            ROUND((successful_requests::NUMERIC / total_requests::NUMERIC) * 100, 2)
        ELSE 0 
    END;
    
    -- Get requests by API format
    SELECT json_object_agg(api_format, format_count)
    INTO requests_by_format
    FROM (
        SELECT api_format, COUNT(*) as format_count
        FROM request_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at >= cutoff_date
        GROUP BY api_format
    ) format_stats;
    
    -- Get requests by hour (last 24 hours)
    SELECT json_object_agg(hour_bucket, hour_count)
    INTO requests_by_hour
    FROM (
        SELECT 
            EXTRACT(HOUR FROM created_at)::TEXT as hour_bucket,
            COUNT(*) as hour_count
        FROM request_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour_bucket::INTEGER
    ) hour_stats;
    
    -- Build result JSON
    result := json_build_object(
        'total_requests', total_requests,
        'successful_requests', successful_requests,
        'failed_requests', failed_requests,
        'total_tokens', total_tokens_sum,
        'avg_response_time_ms', COALESCE(ROUND(avg_response_time_ms), 0),
        'success_rate', success_rate,
        'requests_by_format', COALESCE(requests_by_format, '{}'::json),
        'requests_by_hour', COALESCE(requests_by_hour, '{}'::json),
        'period_days', p_days_back
    );
    
    RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_retry_statistics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_key_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_proxy_key_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_request_logs_statistics(UUID, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_dashboard_statistics(UUID) IS 'Returns comprehensive dashboard statistics including API keys, proxy keys, requests, and performance metrics';
COMMENT ON FUNCTION get_retry_statistics(UUID, INTEGER) IS 'Returns retry attempt statistics for request logs within specified time period';
COMMENT ON FUNCTION get_api_key_statistics(UUID) IS 'Returns usage statistics for API keys including success/failure rates';
COMMENT ON FUNCTION get_proxy_key_statistics(UUID) IS 'Returns usage statistics for proxy keys including token usage and success rates';
COMMENT ON FUNCTION get_request_logs_statistics(UUID, INTEGER) IS 'Returns detailed request logs statistics including format breakdown and hourly distribution';
