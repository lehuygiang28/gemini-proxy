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

-- Include statistics functions
\i sql/statistics-functions.sql

-- Include filter options functions
\i sql/filter-options-functions.sql