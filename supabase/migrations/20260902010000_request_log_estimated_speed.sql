ALTER TABLE request_logs
ADD COLUMN IF NOT EXISTS estimated_speed_tok_per_s numeric
GENERATED ALWAYS AS (
    CASE
        WHEN (usage_metadata->>'completion_tokens') ~ '^[0-9]+$'
         AND (performance_metrics->>'duration_ms') ~ '^[0-9]+(\.[0-9]+)?$'
         AND (usage_metadata->>'completion_tokens')::numeric > 0
         AND (performance_metrics->>'duration_ms')::numeric > 0
        THEN (usage_metadata->>'completion_tokens')::numeric
             / NULLIF((performance_metrics->>'duration_ms')::numeric / 1000.0, 0)
        ELSE NULL
    END
) STORED;

CREATE INDEX IF NOT EXISTS idx_request_logs_user_est_speed
    ON request_logs (user_id, estimated_speed_tok_per_s);

COMMENT ON COLUMN request_logs.estimated_speed_tok_per_s IS
    'Estimated output tok/s: completion_tokens / (API duration_ms / 1000). Not a Google-reported speed.';
