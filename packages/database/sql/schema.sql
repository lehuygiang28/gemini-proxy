-- Gemini Proxy Database Schema
-- PostgreSQL schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- API Keys table - stores Gemini API keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_key_value TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'gemini',
    is_active BOOLEAN NOT NULL DEFAULT true,
    success_count INT NOT NULL DEFAULT 0,
    failure_count INT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_error_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Proxy API Keys table
CREATE TABLE IF NOT EXISTS proxy_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    key_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    success_count INT NOT NULL DEFAULT 0,
    failure_count INT NOT NULL DEFAULT 0,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_error_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, key_id)
);

-- Request Logs table
CREATE TABLE IF NOT EXISTS request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    proxy_key_id TEXT,
    api_key_id TEXT NOT NULL,
    request_id TEXT NOT NULL UNIQUE,
    api_format TEXT NOT NULL DEFAULT 'gemini',
    request_data JSONB NOT NULL,
    response_data JSONB,
    retry_attempts JSONB DEFAULT '[]',
    is_successful BOOLEAN NOT NULL DEFAULT false,
    error_details JSONB,
    usage_metadata JSONB,
    performance_metrics JSONB DEFAULT '{}',
    is_stream BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_user_id ON proxy_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_key_id ON proxy_api_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_active ON proxy_api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs(api_key_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxy_api_keys_updated_at 
    BEFORE UPDATE ON proxy_api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

-- API Keys policies - users can only access their own keys, service role can access all
CREATE POLICY "Users can manage their own api_keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Proxy API Keys policies - users can only access their own proxy keys, service role can access all
CREATE POLICY "Users can manage their own proxy_api_keys" ON proxy_api_keys
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Request Logs policies - users can only access their own logs, service role can access all
CREATE POLICY "Users can view their own request_logs" ON request_logs
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can insert request_logs" ON request_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update request_logs" ON request_logs
    FOR UPDATE USING (auth.role() = 'service_role');

-- Sample data insertion functions (for testing)

-- Function to insert a sample API key
CREATE OR REPLACE FUNCTION insert_sample_api_key(
    p_user_id UUID,
    p_name TEXT,
    p_api_key_value TEXT
) RETURNS UUID AS $$
DECLARE
    key_id UUID;
BEGIN
    INSERT INTO api_keys (user_id, name, api_key_value, provider, is_active, metadata)
    VALUES (
        p_user_id,
        p_name,
        p_api_key_value,
        'gemini',
        true,
        jsonb_build_object(
            'totalUsage', 0,
            'errorCount', 0
        )
    ) RETURNING id INTO key_id;
    
    RETURN key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to insert a sample proxy API key
CREATE OR REPLACE FUNCTION insert_sample_proxy_key(
    p_user_id UUID,
    p_key_id TEXT,
    p_name TEXT
) RETURNS UUID AS $$
DECLARE
    proxy_key_id UUID;
BEGIN
    INSERT INTO proxy_api_keys (user_id, key_id, name, is_active, usage_stats, metadata)
    VALUES (
        p_user_id,
        p_key_id,
        p_name,
        true,
        jsonb_build_object(
            'totalRequests', 0
        ),
        jsonb_build_object(
            'description', 'Sample proxy key'
        )
    ) RETURNING id INTO proxy_key_id;
    
    RETURN proxy_key_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE api_keys IS 'Stores Gemini API keys with usage metadata';
COMMENT ON TABLE proxy_api_keys IS 'Stores proxy access keys for client authentication';
COMMENT ON TABLE request_logs IS 'Stores detailed logs of all proxy requests';

COMMENT ON COLUMN api_keys.metadata IS 'JSON object containing usage statistics and error tracking';
COMMENT ON COLUMN proxy_api_keys.usage_stats IS 'JSON object containing request count and last usage';
COMMENT ON COLUMN request_logs.request_data IS 'JSON object containing original request details';
COMMENT ON COLUMN request_logs.response_data IS 'JSON object containing response details (if successful)';
COMMENT ON COLUMN request_logs.retry_attempts IS 'Array of retry attempts with error details';
COMMENT ON COLUMN request_logs.usage_metadata IS 'JSON object containing token usage metadata';
COMMENT ON COLUMN request_logs.performance_metrics IS 'JSON object containing timing and performance metrics';
