-- Tighten combo write paths and replace google_live catalog atomically.
-- Combo/member INSERT+UPDATE go through save_model_combo (SECURITY DEFINER).
-- Stick state is proxy-owned routing data: authenticated clients cannot mutate it.

DROP POLICY IF EXISTS "Users can manage their own model_combos" ON model_combos;
CREATE POLICY "Users can view their own model_combos" ON model_combos
    FOR SELECT USING (
        user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role'
    );
CREATE POLICY "Users can delete their own model_combos" ON model_combos
    FOR DELETE USING (
        user_id = (SELECT auth.uid()) OR (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage members of their model_combos" ON model_combo_members;
CREATE POLICY "Users can view members of their model_combos" ON model_combo_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM model_combos
            WHERE model_combos.id = model_combo_members.combo_id
              AND (
                  model_combos.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    );
CREATE POLICY "Users can delete members of their model_combos" ON model_combo_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM model_combos
            WHERE model_combos.id = model_combo_members.combo_id
              AND (
                  model_combos.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    );

DROP POLICY IF EXISTS "Users can manage stick state for their proxy keys" ON model_combo_stick_state;

CREATE OR REPLACE FUNCTION replace_user_google_live_catalog(p_models JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_count INTEGER := 0;
    v_row JSONB;
    v_id TEXT;
    v_ids TEXT[] := ARRAY[]::TEXT[];
    v_display TEXT;
    v_supports BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_models IS NULL OR jsonb_typeof(p_models) <> 'array' THEN
        RAISE EXCEPTION 'invalid_models' USING ERRCODE = '22023';
    END IF;
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_models)
    LOOP
        v_id := NULLIF(btrim(COALESCE(v_row->>'model_id', '')), '');
        IF v_id IS NULL THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1
            FROM user_model_catalog
            WHERE user_id = v_user_id
              AND model_id = v_id
              AND source = 'custom'
        ) THEN
            CONTINUE;
        END IF;
        v_display := NULLIF(v_row->>'display_name', '');
        v_supports := COALESCE((v_row->>'supports_generate')::boolean, true);
        INSERT INTO user_model_catalog (
            user_id, model_id, source, display_name, supports_generate, refreshed_at
        ) VALUES (
            v_user_id, v_id, 'google_live', v_display, v_supports, NOW()
        )
        ON CONFLICT (user_id, model_id) DO UPDATE SET
            source = 'google_live',
            display_name = EXCLUDED.display_name,
            supports_generate = EXCLUDED.supports_generate,
            refreshed_at = NOW();
        v_ids := array_append(v_ids, v_id);
        v_count := v_count + 1;
    END LOOP;
    DELETE FROM user_model_catalog
    WHERE user_id = v_user_id
      AND source = 'google_live'
      AND (
          cardinality(v_ids) = 0
          OR NOT (model_id = ANY (v_ids))
      );
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION replace_user_google_live_catalog(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_user_google_live_catalog(JSONB)
    TO authenticated, service_role;

COMMENT ON FUNCTION replace_user_google_live_catalog(JSONB) IS
    'Atomically replace google_live catalog rows for auth.uid(). Custom ids are kept.';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE model_combos;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
