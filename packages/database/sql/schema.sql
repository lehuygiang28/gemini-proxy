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
    prompt_tokens BIGINT NOT NULL DEFAULT 0,
    completion_tokens BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    rpm_limit INTEGER,
    tpm_limit INTEGER,
    rpd_limit INTEGER,
    max_concurrent INTEGER,
    daily_budget_usd NUMERIC(12,6),
    monthly_budget_usd NUMERIC(12,6),
    allowed_models TEXT[],
    denied_models TEXT[],
    max_output_tokens INTEGER,
    max_request_body_bytes INTEGER,
    expires_at TIMESTAMPTZ,
    inflight_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_error_at TIMESTAMP WITH TIME ZONE,
    cooldown_until TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    disabled_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT api_keys_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT api_keys_api_key_value_length CHECK (char_length(api_key_value) >= 10),
    CONSTRAINT api_keys_consecutive_failures_nonneg CHECK (consecutive_failures >= 0)
);

-- Proxy API Keys table - stores proxy access keys
CREATE TABLE IF NOT EXISTS proxy_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proxy_key_value TEXT NOT NULL,
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
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT proxy_api_keys_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT proxy_api_keys_proxy_key_value_length CHECK (char_length(proxy_key_value) >= 10),
    CONSTRAINT proxy_api_keys_rpm_limit_pos CHECK (rpm_limit IS NULL OR rpm_limit > 0),
    CONSTRAINT proxy_api_keys_tpm_limit_pos CHECK (tpm_limit IS NULL OR tpm_limit > 0),
    CONSTRAINT proxy_api_keys_rpd_limit_pos CHECK (rpd_limit IS NULL OR rpd_limit > 0),
    CONSTRAINT proxy_api_keys_max_concurrent_pos
        CHECK (max_concurrent IS NULL OR max_concurrent > 0),
    CONSTRAINT proxy_api_keys_max_output_pos
        CHECK (max_output_tokens IS NULL OR max_output_tokens > 0),
    CONSTRAINT proxy_api_keys_max_body_pos
        CHECK (max_request_body_bytes IS NULL OR max_request_body_bytes > 0),
    CONSTRAINT proxy_api_keys_inflight_nonneg CHECK (inflight_count >= 0)
);

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

-- Per-user settings (id = auth.users.id)
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    detailed_observability BOOLEAN NOT NULL DEFAULT false,
    save_request_body BOOLEAN NOT NULL DEFAULT false,
    save_response_body BOOLEAN NOT NULL DEFAULT false,
    custom_model_pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Soft-delete aware uniqueness (alive rows only)
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_user_id_name_alive_uidx
    ON api_keys (user_id, name)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS proxy_api_keys_value_alive_uidx
    ON proxy_api_keys (proxy_key_value)
    WHERE deleted_at IS NULL;

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
CREATE INDEX IF NOT EXISTS idx_api_keys_cooldown
    ON api_keys (user_id, is_active, cooldown_until)
    WHERE deleted_at IS NULL;

-- Proxy API Keys indexes
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_user_id ON proxy_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_proxy_key_value ON proxy_api_keys(proxy_key_value);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_active ON proxy_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_last_used_at ON proxy_api_keys(last_used_at) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_created_at ON proxy_api_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_proxy_key_quota_windows_start
    ON proxy_key_quota_windows (window_start);

-- Request Logs indexes
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_proxy_key_id ON request_logs(proxy_key_id) WHERE proxy_key_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_request_logs_is_successful ON request_logs(is_successful);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_format ON request_logs(api_format);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at_desc ON request_logs(created_at DESC);

-- Targeted performance indexes for hot paths
-- 1) API key reservation query: filter (is_active AND (user_id IS NULL OR user_id = ?))
--    then order by last_used_at ASC NULLS FIRST, last_error_at ASC NULLS FIRST,
--    optionally failure_count ASC NULLS FIRST, created_at DESC
--    Include id and api_key_value to enable index-only scans
CREATE INDEX IF NOT EXISTS idx_api_keys_selection
ON api_keys (
    is_active,
    user_id,
    last_used_at ASC NULLS FIRST,
    last_error_at ASC NULLS FIRST,
    failure_count ASC NULLS FIRST,
    created_at DESC
) INCLUDE (id, api_key_value);

-- 2) Sticky lookup from request_logs: by (proxy_key_id, api_format) recent first, only successful
--    Include (api_key_id, usage_metadata) for index-only scans during lookup
CREATE INDEX IF NOT EXISTS idx_request_logs_sticky_lookup
ON request_logs (
    proxy_key_id,
    api_format,
    created_at DESC
) INCLUDE (api_key_id, usage_metadata)
WHERE is_successful = true;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_request_logs_user_created_at ON request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_created_at ON request_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_user_active ON proxy_api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_deleted_at
    ON api_keys (deleted_at)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_deleted_at
    ON proxy_api_keys (deleted_at)
    WHERE deleted_at IS NULL;

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
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxy_api_keys_updated_at ON proxy_api_keys;
CREATE TRIGGER update_proxy_api_keys_updated_at 
    BEFORE UPDATE ON proxy_api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_key_quota_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies using subqueries to avoid re-evaluation
DROP POLICY IF EXISTS "Users can manage their own api_keys" ON api_keys;
CREATE POLICY "Users can manage their own api_keys" ON api_keys
    FOR ALL USING (
        user_id = (SELECT auth.uid()) OR 
        (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage their own proxy_api_keys" ON proxy_api_keys;
CREATE POLICY "Users can manage their own proxy_api_keys" ON proxy_api_keys
    FOR ALL USING (
        user_id = (SELECT auth.uid()) OR 
        (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Users can view quota windows for their proxy keys"
    ON proxy_key_quota_windows;
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

DROP POLICY IF EXISTS "Users can manage their own user_settings" ON user_settings;
CREATE POLICY "Users can manage their own user_settings" ON user_settings
    FOR ALL USING (
        id = (SELECT auth.uid()) OR
        (SELECT auth.role()) = 'service_role'
    )
    WITH CHECK (
        id = (SELECT auth.uid()) OR
        (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Users can view their own request_logs" ON request_logs;
CREATE POLICY "Users can view their own request_logs" ON request_logs
    FOR SELECT USING (
        user_id = (SELECT auth.uid()) OR 
        (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Service role can insert request_logs" ON request_logs;
CREATE POLICY "Service role can insert request_logs" ON request_logs
    FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role can update request_logs" ON request_logs;
CREATE POLICY "Service role can update request_logs" ON request_logs
    FOR UPDATE USING ((SELECT auth.role()) = 'service_role');

-- Cleanup function for old logs (batched; service_role only; default 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_request_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_batch_size INTEGER := 1000;
    v_max_batches INTEGER := 50;
    v_sleep_ms INTEGER := 200;
    v_batch_deleted BIGINT;
    v_total_deleted BIGINT := 0;
    v_batch INTEGER;
BEGIN
    IF p_days_to_keep IS NULL OR p_days_to_keep < 7 THEN
        RAISE EXCEPTION 'p_days_to_keep must be >= 7';
    END IF;

    v_cutoff := NOW() - (p_days_to_keep || ' days')::INTERVAL;

    FOR v_batch IN 1..v_max_batches LOOP
        WITH doomed AS (
            SELECT id
            FROM request_logs
            WHERE created_at < v_cutoff
            ORDER BY created_at
            LIMIT v_batch_size
            FOR UPDATE SKIP LOCKED
        )
        DELETE FROM request_logs rl
        USING doomed d
        WHERE rl.id = d.id;

        GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
        v_total_deleted := v_total_deleted + v_batch_deleted;

        EXIT WHEN v_batch_deleted = 0;

        IF v_batch < v_max_batches AND v_batch_deleted = v_batch_size THEN
            PERFORM pg_sleep(v_sleep_ms / 1000.0);
        END IF;
    END LOOP;

    RETURN v_total_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_request_logs(INTEGER) IS
    'Hard-deletes request_logs older than p_days_to_keep (default 90) in batches. '
    'service_role only. Does not modify api_keys / proxy_api_keys counters.';

REVOKE ALL ON FUNCTION cleanup_old_request_logs(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_old_request_logs(INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_request_logs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_request_logs(INTEGER) TO postgres;

-- Documentation comments
COMMENT ON TABLE user_settings IS
    'Per-user settings; id matches auth.users.id. Controls detailed log body capture.';
COMMENT ON COLUMN user_settings.detailed_observability IS
    'Master gate for detailed observability (request/response body capture).';
COMMENT ON COLUMN user_settings.save_request_body IS
    'When detailed_observability is on, persist sanitized request bodies on request_logs.';
COMMENT ON COLUMN user_settings.save_response_body IS
    'When detailed_observability is on, persist sanitized response bodies on request_logs.';
COMMENT ON COLUMN user_settings.custom_model_pricing IS
    'Optional per-model USD/1M token overrides for cost estimates on new request logs.';

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
-- Realtime publication for admin live feeds (Refine liveProvider)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE request_logs;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE api_keys;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE proxy_api_keys;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================
-- Function to get dashboard statistics
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
    -- Determine effective user scope
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;
    -- Get API keys count (all-time inventory)
    SELECT COUNT(*) INTO total_api_keys
    FROM api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND is_active = true
    AND deleted_at IS NULL;
    
    -- Get proxy keys count (all-time inventory)
    SELECT COUNT(*) INTO total_proxy_keys
    FROM proxy_api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND is_active = true
    AND deleted_at IS NULL;
    
    -- Get request logs statistics (optionally period-scoped)
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
    
    -- Get total tokens from proxy keys (all-time counters; include soft-deleted history)
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
        'avg_total_response_time_ms', COALESCE(ROUND(avg_total_response_time_ms), 0),
        'success_rate', success_rate,
        'active_keys', total_api_keys + total_proxy_keys,
        'period_days', p_days_back
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
SET search_path = 'public', pg_catalog
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
SET search_path = 'public', pg_catalog
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
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND deleted_at IS NULL;
    
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
SET search_path = 'public', pg_catalog
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
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
    AND deleted_at IS NULL;
    
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

    -- Token totals from usage_metadata (period-scoped)
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
                WHEN jsonb_typeof(usage_metadata->'estimated_cost_usd') = 'number'
                THEN (usage_metadata->'estimated_cost_usd')::NUMERIC
                WHEN (usage_metadata->>'estimated_cost_usd') ~ '^-?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$'
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

CREATE OR REPLACE FUNCTION record_api_key_failure(
    p_id UUID,
    p_disable BOOLEAN,
    p_cooldown_until TIMESTAMPTZ,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
BEGIN
    UPDATE api_keys
    SET
        consecutive_failures = consecutive_failures + 1,
        cooldown_until = p_cooldown_until,
        disabled_reason = p_reason,
        is_active = CASE WHEN p_disable THEN false ELSE is_active END,
        last_error_at = NOW()
    WHERE id = p_id AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION record_api_key_success(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
BEGIN
    UPDATE api_keys
    SET
        consecutive_failures = 0,
        cooldown_until = NULL,
        disabled_reason = CASE
            WHEN disabled_reason = 'manual' THEN disabled_reason
            WHEN is_active = false THEN disabled_reason
            ELSE NULL
        END
    WHERE id = p_id AND deleted_at IS NULL;
END;
$$;

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

CREATE OR REPLACE FUNCTION get_request_logs_volume(
    p_user_id UUID DEFAULT NULL,
    p_range TEXT DEFAULT '7d'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    effective_user_id UUID;
    normalized_range TEXT;
    bucket_unit TEXT;
    period_start TIMESTAMPTZ;
    period_end TIMESTAMPTZ;
    buckets JSONB;
    total_count BIGINT;
BEGIN
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;

    period_end := NOW();

    normalized_range := COALESCE(p_range, '7d');
    IF normalized_range NOT IN ('24h', '7d', '30d', '90d') THEN
        normalized_range := '7d';
    END IF;

    CASE normalized_range
        WHEN '24h' THEN
            period_start := period_end - INTERVAL '24 hours';
            bucket_unit := 'hour';
        WHEN '7d' THEN
            period_start := period_end - INTERVAL '7 days';
            bucket_unit := 'hour';
        WHEN '30d' THEN
            period_start := period_end - INTERVAL '30 days';
            bucket_unit := 'day';
        WHEN '90d' THEN
            period_start := period_end - INTERVAL '90 days';
            bucket_unit := 'day';
        ELSE
            period_start := period_end - INTERVAL '7 days';
            bucket_unit := 'hour';
    END CASE;

    SELECT
        COALESCE(
            jsonb_object_agg(bucket_key, bucket_count ORDER BY bucket_key),
            '{}'::jsonb
        ),
        COALESCE(SUM(bucket_count), 0)
    INTO buckets, total_count
    FROM (
        SELECT
            CASE
                WHEN bucket_unit = 'hour' THEN
                    to_char(
                        date_trunc('hour', created_at AT TIME ZONE 'UTC'),
                        'YYYY-MM-DD"T"HH24:00:00"Z"'
                    )
                ELSE
                    to_char(
                        date_trunc('day', created_at AT TIME ZONE 'UTC'),
                        'YYYY-MM-DD"T"00:00:00"Z"'
                    )
            END AS bucket_key,
            COUNT(*)::BIGINT AS bucket_count
        FROM request_logs
        WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
          AND created_at >= period_start
          AND created_at <= period_end
        GROUP BY 1
    ) bucket_stats;

    RETURN jsonb_build_object(
        'range', normalized_range,
        'bucket', bucket_unit,
        'buckets', COALESCE(buckets, '{}'::jsonb),
        'total_requests', COALESCE(total_count, 0),
        'period_start', period_start,
        'period_end', period_end
    );
END;
$$;

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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_statistics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_retry_statistics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_key_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_proxy_key_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_request_logs_statistics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_request_logs_volume(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION get_request_logs_volume(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_api_key_usage(UUID, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_proxy_api_key_usage(UUID, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_api_key_failure(UUID, BOOLEAN, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_api_key_success(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admit_proxy_request(UUID, TEXT, BIGINT, NUMERIC, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION settle_proxy_request(UUID, TEXT, BIGINT, NUMERIC, BIGINT, NUMERIC)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_api_key_usage(UUID, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_proxy_api_key_usage(UUID, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION record_api_key_failure(UUID, BOOLEAN, TIMESTAMPTZ, TEXT)
    TO service_role;
GRANT EXECUTE ON FUNCTION record_api_key_success(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION admit_proxy_request(UUID, TEXT, BIGINT, NUMERIC, INTEGER)
    TO service_role;
GRANT EXECUTE ON FUNCTION settle_proxy_request(UUID, TEXT, BIGINT, NUMERIC, BIGINT, NUMERIC)
    TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION get_dashboard_statistics(UUID, INTEGER) IS 'Returns dashboard statistics; request aggregates honor optional p_days_back, key inventory is all-time';
COMMENT ON FUNCTION get_retry_statistics(UUID, INTEGER) IS 'Returns retry attempt statistics for request logs within specified time period';
COMMENT ON FUNCTION get_api_key_statistics(UUID) IS 'Returns usage statistics for API keys including success/failure rates';
COMMENT ON FUNCTION get_proxy_key_statistics(UUID) IS 'Returns usage statistics for proxy keys including token usage and success rates';
COMMENT ON FUNCTION get_request_logs_statistics(UUID, INTEGER) IS
    'Request-log stats including prompt/completion/cache/thoughts/tool-use tokens and estimated USD';
COMMENT ON FUNCTION get_request_logs_volume(UUID, TEXT) IS
    'Request volume time-series for logs activity chart. Buckets: hourly (24h/7d) or daily (30d/90d).';

