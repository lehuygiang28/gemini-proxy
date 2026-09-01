ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_consecutive_failures_nonneg
        CHECK (consecutive_failures >= 0);

CREATE INDEX IF NOT EXISTS idx_api_keys_cooldown
    ON api_keys (user_id, is_active, cooldown_until)
    WHERE deleted_at IS NULL;

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

REVOKE ALL ON FUNCTION record_api_key_failure(UUID, BOOLEAN, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_api_key_success(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_api_key_failure(UUID, BOOLEAN, TIMESTAMPTZ, TEXT)
    TO service_role;
GRANT EXECUTE ON FUNCTION record_api_key_success(UUID) TO service_role;
