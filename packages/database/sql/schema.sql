-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- API Keys table - stores Google AI Studio API keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_key_value TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'googleaistudio' CHECK (provider IN ('googleaistudio')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    success_count BIGINT NOT NULL DEFAULT 0,
    failure_count BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_error_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name),
    CONSTRAINT api_keys_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT api_keys_api_key_value_length CHECK (char_length(api_key_value) >= 10)
);

-- Proxy API Keys table - stores proxy access keys
CREATE TABLE IF NOT EXISTS proxy_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proxy_key_value TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    success_count BIGINT NOT NULL DEFAULT 0,
    failure_count BIGINT NOT NULL DEFAULT 0,
    prompt_tokens BIGINT NOT NULL DEFAULT 0,
    completion_tokens BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_error_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT proxy_api_keys_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT proxy_api_keys_proxy_key_value_length CHECK (char_length(proxy_key_value) >= 10)
);

-- Request Logs table - stores detailed request logs
CREATE TABLE IF NOT EXISTS request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proxy_key_id UUID REFERENCES proxy_api_keys(id) ON DELETE SET NULL,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    request_id TEXT NOT NULL UNIQUE,
    api_format TEXT NOT NULL DEFAULT 'gemini' CHECK (api_format IN ('gemini', 'openai')),
    request_data JSONB NOT NULL,
    response_data JSONB,
    retry_attempts JSONB NOT NULL DEFAULT '[]',
    is_successful BOOLEAN NOT NULL DEFAULT false,
    error_details JSONB,
    usage_metadata JSONB,
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    is_stream BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT request_logs_request_id_length CHECK (char_length(request_id) >= 1 AND char_length(request_id) <= 255)
);

-- Create indexes for better performance
-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used_at ON api_keys(last_used_at) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);

-- Proxy API Keys indexes
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_user_id ON proxy_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_proxy_key_value ON proxy_api_keys(proxy_key_value);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_active ON proxy_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_last_used_at ON proxy_api_keys(last_used_at) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_created_at ON proxy_api_keys(created_at);

-- Request Logs indexes
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_proxy_key_id ON request_logs(proxy_key_id) WHERE proxy_key_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_request_logs_is_successful ON request_logs(is_successful);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_format ON request_logs(api_format);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at_desc ON request_logs(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_request_logs_user_created_at ON request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_created_at ON request_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_user_active ON proxy_api_keys(user_id, is_active);

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = 'public', pg_catalog
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers for automatic updated_at maintenance
CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxy_api_keys_updated_at 
    BEFORE UPDATE ON proxy_api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies using subqueries to avoid re-evaluation
CREATE POLICY "Users can manage their own api_keys" ON api_keys
    FOR ALL USING (
        user_id = (SELECT auth.uid()) OR 
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "Users can manage their own proxy_api_keys" ON proxy_api_keys
    FOR ALL USING (
        user_id = (SELECT auth.uid()) OR 
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "Users can view their own request_logs" ON request_logs
    FOR SELECT USING (
        user_id = (SELECT auth.uid()) OR 
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "Service role can insert request_logs" ON request_logs
    FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role can update request_logs" ON request_logs
    FOR UPDATE USING ((SELECT auth.role()) = 'service_role');

-- Cleanup function for old logs
CREATE OR REPLACE FUNCTION cleanup_old_request_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS BIGINT 
LANGUAGE plpgsql
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    deleted_count BIGINT;
BEGIN
    DELETE FROM request_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Documentation comments
COMMENT ON TABLE api_keys IS 'Stores Google AI Studio API keys with usage metadata and performance tracking';
COMMENT ON TABLE proxy_api_keys IS 'Stores proxy access keys for client authentication and usage tracking';
COMMENT ON TABLE request_logs IS 'Stores detailed logs of all proxy requests with performance metrics';

COMMENT ON COLUMN api_keys.provider IS 'API provider: googleaistudio';
COMMENT ON COLUMN api_keys.metadata IS 'JSON object containing usage statistics, error tracking, and custom metadata';
COMMENT ON COLUMN proxy_api_keys.proxy_key_value IS 'Unique proxy key value used for client authentication';
COMMENT ON COLUMN proxy_api_keys.metadata IS 'JSON object containing additional metadata and usage information';
COMMENT ON COLUMN request_logs.proxy_key_id IS 'Reference to proxy_api_keys table (nullable for backward compatibility)';
COMMENT ON COLUMN request_logs.api_key_id IS 'Reference to api_keys table';
COMMENT ON COLUMN request_logs.request_data IS 'JSON object containing original request details';
COMMENT ON COLUMN request_logs.response_data IS 'JSON object containing response details (if successful)';
COMMENT ON COLUMN request_logs.retry_attempts IS 'Array of retry attempts with error details';
COMMENT ON COLUMN request_logs.usage_metadata IS 'JSON object containing token usage metadata';
COMMENT ON COLUMN request_logs.performance_metrics IS 'JSON object containing timing and performance metrics';

-- =====================================
-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_statistics(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
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
    success_rate NUMERIC;
BEGIN
    -- Determine effective user scope
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;
    -- Get API keys count
    SELECT COUNT(*) INTO total_api_keys
    FROM api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND is_active = true;
    
    -- Get proxy keys count
    SELECT COUNT(*) INTO total_proxy_keys
    FROM proxy_api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND is_active = true;
    
    -- Get request logs statistics
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_successful = true) as successful_count,
        COALESCE(
            SUM(
                CASE 
                    WHEN (performance_metrics->>'duration') ~ '^[0-9]+(\.[0-9]+)?$' 
                    THEN (performance_metrics->>'duration')::NUMERIC 
                    ELSE 0
                END
            ),
            0
        ) / NULLIF(COUNT(*), 0) as avg_response_time
    INTO total_requests, successful_requests, avg_response_time_ms
    FROM request_logs
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id);
    
    -- Get total tokens from proxy keys
    SELECT COALESCE(SUM(total_tokens), 0) INTO total_tokens_sum
    FROM proxy_api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id);
    
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
SECURITY INVOKER
AS $$
DECLARE
    result JSON;
    effective_user_id UUID;
    total_requests BIGINT;
    requests_with_retries BIGINT;
    total_retry_attempts BIGINT;
    retry_rate NUMERIC;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Determine effective user scope
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;
    -- Calculate cutoff date
    cutoff_date := NOW() - INTERVAL '1 day' * p_days_back;
    
    -- Get retry statistics from request logs
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE jsonb_array_length(retry_attempts) > 0) as retry_count,
        COALESCE(SUM(jsonb_array_length(retry_attempts)), 0) as total_attempts
    INTO total_requests, requests_with_retries, total_retry_attempts
    FROM request_logs
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
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
SECURITY INVOKER
AS $$
DECLARE
    result JSON;
    effective_user_id UUID;
    total_keys BIGINT;
    active_keys BIGINT;
    total_success_count BIGINT;
    total_failure_count BIGINT;
    total_usage_count BIGINT;
    success_rate NUMERIC;
BEGIN
    -- Determine effective user scope
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;
    -- Get API key statistics
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COALESCE(SUM(success_count), 0) as total_success,
        COALESCE(SUM(failure_count), 0) as total_failure
    INTO total_keys, active_keys, total_success_count, total_failure_count
    FROM api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id);
    
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
SECURITY INVOKER
AS $$
DECLARE
    result JSON;
    effective_user_id UUID;
    total_keys BIGINT;
    active_keys BIGINT;
    total_success_count BIGINT;
    total_failure_count BIGINT;
    total_tokens_sum BIGINT;
    total_prompt_tokens BIGINT;
    total_completion_tokens BIGINT;
    success_rate NUMERIC;
BEGIN
    -- Determine effective user scope
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;
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
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id);
    
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
SECURITY INVOKER
AS $$
DECLARE
    result JSON;
    effective_user_id UUID;
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
    -- Determine effective user scope
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;
    -- Calculate cutoff date
    cutoff_date := NOW() - INTERVAL '1 day' * p_days_back;
    
    -- Get basic request statistics
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_successful = true) as successful_count,
        COUNT(*) FILTER (WHERE is_successful = false) as failed_count,
        COALESCE(
            SUM(
                CASE 
                    WHEN (performance_metrics->>'duration') ~ '^[0-9]+(\.[0-9]+)?$' 
                    THEN (performance_metrics->>'duration')::NUMERIC 
                    ELSE 0
                END
            ),
            0
        ) / NULLIF(COUNT(*), 0) as avg_response_time
    INTO total_requests, successful_requests, failed_requests, avg_response_time_ms
    FROM request_logs
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND created_at >= cutoff_date;
    
    -- Get total tokens from usage_metadata
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN (usage_metadata->>'total_tokens') ~ '^[0-9]+$' 
                THEN (usage_metadata->>'total_tokens')::BIGINT 
                ELSE 0
            END
        ),
        0
    )
    INTO total_tokens_sum
    FROM request_logs
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
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
        WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
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
        WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
        AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY EXTRACT(HOUR FROM created_at)
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

