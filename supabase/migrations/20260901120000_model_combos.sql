ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS combo_strategy TEXT NOT NULL DEFAULT 'fallback',
    ADD COLUMN IF NOT EXISTS combo_stick_after_successes INTEGER;

ALTER TABLE user_settings
    DROP CONSTRAINT IF EXISTS user_settings_combo_strategy_check;
ALTER TABLE user_settings
    ADD CONSTRAINT user_settings_combo_strategy_check
    CHECK (combo_strategy IN ('fallback', 'sticky_until_error', 'stick_n'));

ALTER TABLE user_settings
    DROP CONSTRAINT IF EXISTS user_settings_combo_stick_after_successes_check;
ALTER TABLE user_settings
    ADD CONSTRAINT user_settings_combo_stick_after_successes_check
    CHECK (combo_stick_after_successes IS NULL OR combo_stick_after_successes >= 1);

COMMENT ON COLUMN user_settings.combo_strategy IS
    'Default combo key-start strategy inherited by combos with a null override.';
COMMENT ON COLUMN user_settings.combo_stick_after_successes IS
    'Default N for stick_n. Null with stick_n is treated as fallback at runtime.';

CREATE TABLE IF NOT EXISTS model_combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    strategy TEXT NULL
        CHECK (strategy IS NULL OR strategy IN ('fallback', 'sticky_until_error', 'stick_n')),
    stick_after_successes INTEGER NULL
        CHECK (stick_after_successes IS NULL OR stick_after_successes >= 1),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name),
    CHECK (char_length(name) BETWEEN 1 AND 64),
    CHECK (name ~ '^[a-z0-9][a-z0-9._-]*$')
);

CREATE TABLE IF NOT EXISTS model_combo_members (
    combo_id UUID NOT NULL REFERENCES model_combos(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0),
    canonical_model TEXT NOT NULL,
    PRIMARY KEY (combo_id, position),
    UNIQUE (combo_id, canonical_model),
    CHECK (char_length(canonical_model) BETWEEN 1 AND 255)
);

CREATE TABLE IF NOT EXISTS user_model_catalog (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('custom', 'google_live')),
    display_name TEXT,
    supports_generate BOOLEAN NOT NULL DEFAULT true,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, model_id)
);

CREATE TABLE IF NOT EXISTS model_combo_stick_state (
    proxy_key_id UUID NOT NULL REFERENCES proxy_api_keys(id) ON DELETE CASCADE,
    combo_id UUID NOT NULL REFERENCES model_combos(id) ON DELETE CASCADE,
    last_api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    consecutive_successes INTEGER NOT NULL DEFAULT 0
        CHECK (consecutive_successes >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (proxy_key_id, combo_id)
);

DROP TRIGGER IF EXISTS update_model_combos_updated_at ON model_combos;
CREATE TRIGGER update_model_combos_updated_at
    BEFORE UPDATE ON model_combos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_model_combo_stick_state_updated_at ON model_combo_stick_state;
CREATE TRIGGER update_model_combo_stick_state_updated_at
    BEFORE UPDATE ON model_combo_stick_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE model_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_combo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_model_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_combo_stick_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own model_combos" ON model_combos;
CREATE POLICY "Users can manage their own model_combos" ON model_combos
    FOR ALL USING (
        user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role'
    )
    WITH CHECK (
        user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage members of their model_combos" ON model_combo_members;
CREATE POLICY "Users can manage members of their model_combos" ON model_combo_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM model_combos
            WHERE model_combos.id = model_combo_members.combo_id
              AND (
                  model_combos.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    );

DROP POLICY IF EXISTS "Users can manage their own user_model_catalog" ON user_model_catalog;
CREATE POLICY "Users can manage their own user_model_catalog" ON user_model_catalog
    FOR ALL USING (
        user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role'
    )
    WITH CHECK (
        user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage stick state for their proxy keys" ON model_combo_stick_state;
CREATE POLICY "Users can manage stick state for their proxy keys" ON model_combo_stick_state
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM proxy_api_keys
            WHERE proxy_api_keys.id = model_combo_stick_state.proxy_key_id
              AND (
                  proxy_api_keys.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    );

CREATE OR REPLACE FUNCTION normalize_combo_model_id(p_id TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN lower(btrim(COALESCE(p_id, ''))) LIKE 'models/%'
            THEN substr(lower(btrim(p_id)), 8)
        ELSE lower(btrim(COALESCE(p_id, '')))
    END;
$$;

CREATE OR REPLACE FUNCTION save_model_combo(
    p_id UUID,
    p_name TEXT,
    p_strategy TEXT,
    p_stick_after_successes INTEGER,
    p_is_active BOOLEAN,
    p_members TEXT[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_name TEXT;
    v_members TEXT[];
    v_id UUID;
    v_member TEXT;
    v_seen TEXT[] := ARRAY[]::TEXT[];
    v_position INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    v_name := normalize_combo_model_id(p_name);
    IF v_name = '' OR char_length(v_name) > 64 OR v_name !~ '^[a-z0-9][a-z0-9._-]*$' THEN
        RAISE EXCEPTION 'invalid_name' USING ERRCODE = '22023';
    END IF;
    IF p_members IS NULL OR cardinality(p_members) = 0 THEN
        RAISE EXCEPTION 'members_required' USING ERRCODE = '22023';
    END IF;
    FOREACH v_member IN ARRAY p_members LOOP
        v_member := normalize_combo_model_id(v_member);
        IF v_member = '' THEN
            RAISE EXCEPTION 'members_required' USING ERRCODE = '22023';
        END IF;
        IF v_member = v_name THEN
            RAISE EXCEPTION 'member_is_combo_name' USING ERRCODE = '22023';
        END IF;
        IF v_member = ANY (v_seen) THEN
            RAISE EXCEPTION 'duplicate_member' USING ERRCODE = '22023';
        END IF;
        v_seen := array_append(v_seen, v_member);
    END LOOP;
    v_members := v_seen;
    IF p_id IS NULL THEN
        INSERT INTO model_combos (
            user_id, name, strategy, stick_after_successes, is_active
        ) VALUES (
            v_user_id, v_name, p_strategy, p_stick_after_successes, COALESCE(p_is_active, true)
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE model_combos
        SET name = v_name,
            strategy = p_strategy,
            stick_after_successes = p_stick_after_successes,
            is_active = COALESCE(p_is_active, is_active)
        WHERE id = p_id AND user_id = v_user_id
        RETURNING id INTO v_id;
        IF v_id IS NULL THEN
            RAISE EXCEPTION 'combo_not_found' USING ERRCODE = '22023';
        END IF;
        DELETE FROM model_combo_members WHERE combo_id = v_id;
    END IF;
    FOREACH v_member IN ARRAY v_members LOOP
        INSERT INTO model_combo_members (combo_id, position, canonical_model)
        VALUES (v_id, v_position, v_member);
        v_position := v_position + 1;
    END LOOP;
    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION normalize_combo_model_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION normalize_combo_model_id(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION save_model_combo(UUID, TEXT, TEXT, INTEGER, BOOLEAN, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_model_combo(UUID, TEXT, TEXT, INTEGER, BOOLEAN, TEXT[])
    TO authenticated, service_role;

COMMENT ON TABLE model_combos IS
    'Tenant-owned named aliases that expand to ordered Gemini model ids at request time.';
COMMENT ON TABLE model_combo_members IS
    'Ordered concrete model ids for a combo. Never resolved as nested combos.';
COMMENT ON TABLE user_model_catalog IS
    'User-added and cached Google models.list ids. Pricing stays on user_settings.';
COMMENT ON TABLE model_combo_stick_state IS
    'Per proxy-key sticky start key and success streak for a combo.';
