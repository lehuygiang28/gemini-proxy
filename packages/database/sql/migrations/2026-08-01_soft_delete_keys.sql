-- Soft-delete for api_keys / proxy_api_keys so request_logs keep FK joins.

ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE proxy_api_keys
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Allow recreating a key with the same name after soft-delete
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_user_id_name_alive_uidx
    ON api_keys (user_id, name)
    WHERE deleted_at IS NULL;

-- Allow reissuing the same proxy key value after soft-delete (value is scrambled on delete)
ALTER TABLE proxy_api_keys DROP CONSTRAINT IF EXISTS proxy_api_keys_proxy_key_value_key;
CREATE UNIQUE INDEX IF NOT EXISTS proxy_api_keys_value_alive_uidx
    ON proxy_api_keys (proxy_key_value)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_deleted_at
    ON api_keys (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proxy_api_keys_deleted_at
    ON proxy_api_keys (deleted_at)
    WHERE deleted_at IS NULL;

-- Keep stats RPCs aligned with soft-delete (alive rows only)
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
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;

    SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COALESCE(SUM(success_count), 0) as total_success,
        COALESCE(SUM(failure_count), 0) as total_failure
    INTO total_keys, active_keys, total_success_count, total_failure_count
    FROM api_keys
    WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
      AND deleted_at IS NULL;

    total_usage_count := total_success_count + total_failure_count;
    success_rate := CASE
        WHEN total_usage_count > 0 THEN
            ROUND((total_success_count::NUMERIC / total_usage_count::NUMERIC) * 100, 2)
        ELSE 0
    END;

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
    IF (SELECT auth.role()) = 'service_role' THEN
        effective_user_id := COALESCE(p_user_id, NULL);
    ELSE
        effective_user_id := (SELECT auth.uid());
    END IF;

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

    success_rate := CASE
        WHEN (total_success_count + total_failure_count) > 0 THEN
            ROUND((total_success_count::NUMERIC / (total_success_count + total_failure_count)::NUMERIC) * 100, 2)
        ELSE 0
    END;

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
