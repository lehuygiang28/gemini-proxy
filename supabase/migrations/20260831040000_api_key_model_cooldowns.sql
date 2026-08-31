CREATE TABLE IF NOT EXISTS api_key_model_cooldowns (
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    canonical_model TEXT NOT NULL,
    cooldown_until TIMESTAMPTZ NOT NULL,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (api_key_id, canonical_model),
    CONSTRAINT api_key_model_cooldowns_consecutive_failures_nonneg
        CHECK (consecutive_failures >= 0),
    CONSTRAINT api_key_model_cooldowns_model_length
        CHECK (char_length(canonical_model) >= 1 AND char_length(canonical_model) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_api_key_model_cooldowns_until
    ON api_key_model_cooldowns (canonical_model, cooldown_until);

ALTER TABLE api_key_model_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage cooldowns for their api_keys" ON api_key_model_cooldowns;
CREATE POLICY "Users can manage cooldowns for their api_keys" ON api_key_model_cooldowns
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM api_keys
            WHERE api_keys.id = api_key_model_cooldowns.api_key_id
              AND (
                  api_keys.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    );

DROP FUNCTION IF EXISTS record_api_key_failure(UUID, BOOLEAN, TIMESTAMPTZ, TEXT);
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
            WHEN p_scope = 'key' THEN p_cooldown_until
            ELSE cooldown_until
        END,
        disabled_reason = p_reason,
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
            cooldown_until = EXCLUDED.cooldown_until,
            consecutive_failures = api_key_model_cooldowns.consecutive_failures + 1,
            updated_at = NOW();
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS record_api_key_success(UUID);
CREATE OR REPLACE FUNCTION record_api_key_success(
    p_id UUID,
    p_canonical_model TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', pg_catalog
AS $$
BEGIN
    UPDATE api_keys
    SET
        consecutive_failures = 0,
        disabled_reason = CASE
            WHEN disabled_reason = 'manual' THEN disabled_reason
            WHEN is_active = false THEN disabled_reason
            ELSE NULL
        END
    WHERE id = p_id AND deleted_at IS NULL;

    IF p_canonical_model IS NOT NULL AND BTRIM(p_canonical_model) <> '' THEN
        DELETE FROM api_key_model_cooldowns
        WHERE api_key_id = p_id
          AND canonical_model = BTRIM(p_canonical_model);
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION record_api_key_failure(UUID, BOOLEAN, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_api_key_success(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_api_key_failure(UUID, BOOLEAN, TIMESTAMPTZ, TEXT, TEXT, TEXT)
    TO service_role;
GRANT EXECUTE ON FUNCTION record_api_key_success(UUID, TEXT) TO service_role;
