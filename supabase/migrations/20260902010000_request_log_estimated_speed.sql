CREATE OR REPLACE FUNCTION request_log_estimated_speed(
    usage_metadata jsonb,
    performance_metrics jsonb
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN completion > 0 AND duration > 0
        THEN completion / NULLIF(duration / 1000.0, 0)
        ELSE NULL
    END
    FROM (
        SELECT
            CASE
                WHEN usage_metadata->>'completion_tokens' ~ '^[0-9]+(\.[0-9]+)?$'
                THEN (usage_metadata->>'completion_tokens')::numeric
                ELSE NULL
            END AS completion,
            CASE
                WHEN performance_metrics->>'duration_ms' ~ '^[0-9]+(\.[0-9]+)?$'
                THEN (performance_metrics->>'duration_ms')::numeric
                ELSE NULL
            END AS duration
    ) parsed;
$$;

DROP INDEX IF EXISTS idx_request_logs_user_est_speed;

ALTER TABLE request_logs
    DROP COLUMN IF EXISTS estimated_speed_tok_per_s;

ALTER TABLE request_logs
    ADD COLUMN estimated_speed_tok_per_s numeric
    GENERATED ALWAYS AS (
        request_log_estimated_speed(usage_metadata, performance_metrics)
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_request_logs_user_est_speed
    ON request_logs (user_id, estimated_speed_tok_per_s);

COMMENT ON COLUMN request_logs.estimated_speed_tok_per_s IS
    'Estimated output tok/s: completion_tokens / (API duration_ms / 1000). Not a Google-reported speed.';
