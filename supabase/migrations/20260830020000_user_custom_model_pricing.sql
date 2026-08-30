-- Per-user USD/token overrides for models without built-in rates (e.g. Gemma) or custom billing.
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS custom_model_pricing JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.custom_model_pricing IS
    'Optional per-model USD/1M token overrides: { "model-id": { "inputPerMillion", "outputPerMillion", "cachedInputPerMillion?" } }. Applied when estimating cost for new request logs.';
