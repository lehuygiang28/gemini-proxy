-- Per-user observability preferences (gates request/response body capture in logs).
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    detailed_observability BOOLEAN NOT NULL DEFAULT false,
    save_request_body BOOLEAN NOT NULL DEFAULT false,
    save_response_body BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_settings IS
    'Per-user settings; id matches auth.users.id. Controls detailed log body capture.';
COMMENT ON COLUMN user_settings.detailed_observability IS
    'Master gate for detailed observability (request/response body capture).';
COMMENT ON COLUMN user_settings.save_request_body IS
    'When detailed_observability is on, persist sanitized request bodies on request_logs.';
COMMENT ON COLUMN user_settings.save_response_body IS
    'When detailed_observability is on, persist sanitized response bodies on request_logs.';

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own user_settings" ON user_settings;
CREATE POLICY "Users can manage their own user_settings" ON user_settings
    FOR ALL USING (
        id = (SELECT auth.uid()) OR
        (SELECT auth.role()) = 'service_role'
    )
    WITH CHECK (
        id = (SELECT auth.uid()) OR
        (SELECT auth.role()) = 'service_role'
    );
