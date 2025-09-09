-- Filter Options RPC Functions for Gemini Proxy
-- These functions return unique filter values directly from the database
-- Much more efficient than fetching large datasets and processing in JavaScript

-- Function to get unique models from usage_metadata
CREATE OR REPLACE FUNCTION get_filter_options_models(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Get unique models from usage_metadata where it's not null
    SELECT json_agg(DISTINCT model_value)
    INTO result
    FROM (
        SELECT DISTINCT (usage_metadata->>'model') as model_value
        FROM request_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND usage_metadata IS NOT NULL
        AND usage_metadata->>'model' IS NOT NULL
        AND usage_metadata->>'model' != ''
    ) models;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get unique error types from error_details
CREATE OR REPLACE FUNCTION get_filter_options_error_types(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Get unique error types from error_details
    SELECT json_agg(DISTINCT error_type)
    INTO result
    FROM (
        SELECT DISTINCT (error_details->>'type') as error_type
        FROM request_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND error_details IS NOT NULL
        AND error_details->>'type' IS NOT NULL
        AND error_details->>'type' != ''
    ) error_types;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get unique status codes from response_data
CREATE OR REPLACE FUNCTION get_filter_options_status_codes(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Get unique status codes from response_data
    SELECT json_agg(DISTINCT status_code ORDER BY status_code)
    INTO result
    FROM (
        SELECT DISTINCT (response_data->>'status')::INTEGER as status_code
        FROM request_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND response_data IS NOT NULL
        AND response_data->>'status' IS NOT NULL
        AND response_data->>'status' ~ '^[0-9]+$'
    ) status_codes;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get unique API formats
CREATE OR REPLACE FUNCTION get_filter_options_api_formats(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Get unique API formats
    SELECT json_agg(DISTINCT api_format ORDER BY api_format)
    INTO result
    FROM (
        SELECT DISTINCT api_format
        FROM request_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND api_format IS NOT NULL
        AND api_format != ''
    ) formats;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get unique user IDs (for admin filtering)
CREATE OR REPLACE FUNCTION get_filter_options_user_ids(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Only allow if user is admin or service role
    IF (SELECT auth.role()) != 'service_role' AND p_user_id IS NULL THEN
        RETURN '[]'::json;
    END IF;
    
    -- Get unique user IDs
    SELECT json_agg(DISTINCT user_id ORDER BY user_id)
    INTO result
    FROM (
        SELECT DISTINCT user_id
        FROM request_logs
        WHERE user_id IS NOT NULL
        ORDER BY user_id
        LIMIT 100 -- Limit to prevent huge lists
    ) user_ids;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get unique proxy key IDs (for admin filtering)
CREATE OR REPLACE FUNCTION get_filter_options_proxy_key_ids(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Only allow if user is admin or service role
    IF (SELECT auth.role()) != 'service_role' AND p_user_id IS NULL THEN
        RETURN '[]'::json;
    END IF;
    
    -- Get unique proxy key IDs
    SELECT json_agg(DISTINCT proxy_key_id ORDER BY proxy_key_id)
    INTO result
    FROM (
        SELECT DISTINCT proxy_key_id
        FROM request_logs
        WHERE proxy_key_id IS NOT NULL
        ORDER BY proxy_key_id
        LIMIT 100 -- Limit to prevent huge lists
    ) proxy_key_ids;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get unique API key IDs (for admin filtering)
CREATE OR REPLACE FUNCTION get_filter_options_api_key_ids(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Only allow if user is admin or service role
    IF (SELECT auth.role()) != 'service_role' AND p_user_id IS NULL THEN
        RETURN '[]'::json;
    END IF;
    
    -- Get unique API key IDs
    SELECT json_agg(DISTINCT api_key_id ORDER BY api_key_id)
    INTO result
    FROM (
        SELECT DISTINCT api_key_id
        FROM request_logs
        WHERE api_key_id IS NOT NULL
        ORDER BY api_key_id
        LIMIT 100 -- Limit to prevent huge lists
    ) api_key_ids;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Function to get comprehensive filter options
CREATE OR REPLACE FUNCTION get_filter_options_all(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Get all filter options in one call
    SELECT json_build_object(
        'models', COALESCE(
            (SELECT json_agg(DISTINCT model_value)
             FROM (
                 SELECT DISTINCT (usage_metadata->>'model') as model_value
                 FROM request_logs
                 WHERE (p_user_id IS NULL OR user_id = p_user_id)
                 AND usage_metadata IS NOT NULL
                 AND usage_metadata->>'model' IS NOT NULL
                 AND usage_metadata->>'model' != ''
             ) models),
            '[]'::json
        ),
        'error_types', COALESCE(
            (SELECT json_agg(DISTINCT error_type)
             FROM (
                 SELECT DISTINCT (error_details->>'type') as error_type
                 FROM request_logs
                 WHERE (p_user_id IS NULL OR user_id = p_user_id)
                 AND error_details IS NOT NULL
                 AND error_details->>'type' IS NOT NULL
                 AND error_details->>'type' != ''
             ) error_types),
            '[]'::json
        ),
        'status_codes', COALESCE(
            (SELECT json_agg(DISTINCT status_code ORDER BY status_code)
             FROM (
                 SELECT DISTINCT (response_data->>'status')::INTEGER as status_code
                 FROM request_logs
                 WHERE (p_user_id IS NULL OR user_id = p_user_id)
                 AND response_data IS NOT NULL
                 AND response_data->>'status' IS NOT NULL
                 AND response_data->>'status' ~ '^[0-9]+$'
             ) status_codes),
            '[]'::json
        ),
        'api_formats', COALESCE(
            (SELECT json_agg(DISTINCT api_format ORDER BY api_format)
             FROM (
                 SELECT DISTINCT api_format
                 FROM request_logs
                 WHERE (p_user_id IS NULL OR user_id = p_user_id)
                 AND api_format IS NOT NULL
                 AND api_format != ''
             ) formats),
            '[]'::json
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_filter_options_models(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options_error_types(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options_status_codes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options_api_formats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options_user_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options_proxy_key_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options_api_key_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options_all(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_filter_options_models(UUID) IS 'Returns unique model names from usage_metadata for filter options';
COMMENT ON FUNCTION get_filter_options_error_types(UUID) IS 'Returns unique error types from error_details for filter options';
COMMENT ON FUNCTION get_filter_options_status_codes(UUID) IS 'Returns unique status codes from response_data for filter options';
COMMENT ON FUNCTION get_filter_options_api_formats(UUID) IS 'Returns unique API formats for filter options';
COMMENT ON FUNCTION get_filter_options_user_ids(UUID) IS 'Returns unique user IDs for admin filter options';
COMMENT ON FUNCTION get_filter_options_proxy_key_ids(UUID) IS 'Returns unique proxy key IDs for admin filter options';
COMMENT ON FUNCTION get_filter_options_api_key_ids(UUID) IS 'Returns unique API key IDs for admin filter options';
COMMENT ON FUNCTION get_filter_options_all(UUID) IS 'Returns all filter options in a single call for optimal performance';
