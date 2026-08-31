CREATE TABLE IF NOT EXISTS google_project_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    google_project_id TEXT,
    tier TEXT,
    rpm_limit INTEGER,
    tpm_limit INTEGER,
    rpd_limit INTEGER,
    cooldown_until TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT google_project_pools_name_len CHECK (char_length(name) BETWEEN 1 AND 255),
    CONSTRAINT google_project_pools_rpm_limit_pos CHECK (rpm_limit IS NULL OR rpm_limit > 0),
    CONSTRAINT google_project_pools_tpm_limit_pos CHECK (tpm_limit IS NULL OR tpm_limit > 0),
    CONSTRAINT google_project_pools_rpd_limit_pos CHECK (rpd_limit IS NULL OR rpd_limit > 0),
    CONSTRAINT google_project_pools_consecutive_failures_nonneg
        CHECK (consecutive_failures >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS google_project_pools_user_name_uidx
    ON google_project_pools (user_id, name);

CREATE INDEX IF NOT EXISTS google_project_pools_user ON google_project_pools (user_id);

ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS project_pool_id UUID
        REFERENCES google_project_pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_project_pool
    ON api_keys (project_pool_id)
    WHERE deleted_at IS NULL AND project_pool_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS project_pool_quota_windows (
    project_pool_id UUID NOT NULL REFERENCES google_project_pools(id) ON DELETE CASCADE,
    window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'day')),
    window_start TIMESTAMPTZ NOT NULL,
    request_count BIGINT NOT NULL DEFAULT 0,
    token_count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (project_pool_id, window_type, window_start)
);

DROP TRIGGER IF EXISTS update_google_project_pools_updated_at ON google_project_pools;
CREATE TRIGGER update_google_project_pools_updated_at
    BEFORE UPDATE ON google_project_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE google_project_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_pool_quota_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own google_project_pools"
    ON google_project_pools;
CREATE POLICY "Users can manage their own google_project_pools"
    ON google_project_pools FOR ALL
    USING (
        user_id = (SELECT auth.uid()) OR
        (SELECT auth.role()) = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage quota windows for their project pools"
    ON project_pool_quota_windows;
CREATE POLICY "Users can manage quota windows for their project pools"
    ON project_pool_quota_windows FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM google_project_pools p
            WHERE p.id = project_pool_id
              AND (
                  p.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM google_project_pools p
            WHERE p.id = project_pool_id
              AND (
                  p.user_id = (SELECT auth.uid())
                  OR (SELECT auth.role()) = 'service_role'
              )
        )
    );
