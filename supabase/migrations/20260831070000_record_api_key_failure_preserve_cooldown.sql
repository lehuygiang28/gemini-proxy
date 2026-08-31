CREATE OR REPLACE FUNCTION record_api_key_failure(
    p_id UUID,
    p_disable BOOLEAN,
    p_cooldown_until TIMESTAMPTZ,
    p_reason TEXT,
    p_canonical_model TEXT DEFAULT '*',
    p_scope TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    resolved_model TEXT := COALESCE(NULLIF(BTRIM(p_canonical_model), ''), '*');
BEGIN
    UPDATE api_keys
    SET
        consecutive_failures = consecutive_failures + 1,
        cooldown_until = CASE
            WHEN p_scope = 'key' AND p_cooldown_until IS NULL THEN cooldown_until
            WHEN p_scope = 'key' AND cooldown_until IS NULL THEN p_cooldown_until
            WHEN p_scope = 'key' THEN GREATEST(cooldown_until, p_cooldown_until)
            ELSE cooldown_until
        END,
        disabled_reason = CASE
            WHEN p_disable THEN COALESCE(p_reason, disabled_reason)
            WHEN p_reason IS NULL THEN disabled_reason
            ELSE p_reason
        END,
        is_active = CASE WHEN p_disable THEN false ELSE is_active END,
        last_error_at = NOW()
    WHERE id = p_id AND deleted_at IS NULL;

    IF p_scope = 'key_model' AND p_cooldown_until IS NOT NULL THEN
        INSERT INTO api_key_model_cooldowns (
            api_key_id,
            canonical_model,
            cooldown_until,
            consecutive_failures,
            updated_at
        )
        VALUES (
            p_id,
            resolved_model,
            p_cooldown_until,
            1,
            NOW()
        )
        ON CONFLICT (api_key_id, canonical_model) DO UPDATE
        SET
            cooldown_until = GREATEST(
                api_key_model_cooldowns.cooldown_until,
                EXCLUDED.cooldown_until
            ),
            consecutive_failures = api_key_model_cooldowns.consecutive_failures + 1,
            updated_at = NOW();
    END IF;
END;
$$;
