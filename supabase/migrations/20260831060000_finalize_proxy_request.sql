CREATE TABLE IF NOT EXISTS proxy_reconciliation_needed (
    request_id TEXT PRIMARY KEY,
    proxy_key_id UUID NOT NULL REFERENCES proxy_api_keys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE proxy_reconciliation_needed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own proxy_reconciliation_needed"
    ON proxy_reconciliation_needed;
CREATE POLICY "Users can manage their own proxy_reconciliation_needed"
    ON proxy_reconciliation_needed FOR ALL
    USING (
        user_id = (SELECT auth.uid())
        OR (SELECT auth.role()) = 'service_role'
    )
    WITH CHECK (
        user_id = (SELECT auth.uid())
        OR (SELECT auth.role()) = 'service_role'
    );

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE proxy_reconciliation_needed;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE proxy_reconciliation_needed IS
    'Stale admit reservations after finalize retries exhaust. No auto-release; the owner retries from the dashboard.';

CREATE OR REPLACE FUNCTION finalize_proxy_request(
    p_request_id TEXT,
    p_proxy_key_id UUID,
    p_api_key_id UUID,
    p_user_id UUID,
    p_is_successful BOOLEAN,
    p_request_data JSONB,
    p_response_data JSONB,
    p_usage JSONB,
    p_reserved_tokens BIGINT,
    p_reserved_usd NUMERIC,
    p_actual_tokens BIGINT,
    p_actual_usd NUMERIC,
    p_minute_start TIMESTAMPTZ,
    p_day_start TIMESTAMPTZ,
    p_month_start TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    settlement_inserted BOOLEAN := FALSE;
    usage_json JSONB := COALESCE(p_usage, '{}'::jsonb);
    api_format TEXT := COALESCE(NULLIF(usage_json->>'api_format', ''), 'gemini');
BEGIN
    INSERT INTO request_logs (
        request_id,
        proxy_key_id,
        api_key_id,
        user_id,
        api_format,
        request_data,
        response_data,
        is_successful,
        is_stream,
        error_details,
        performance_metrics,
        usage_metadata,
        retry_attempts
    )
    VALUES (
        p_request_id,
        p_proxy_key_id,
        p_api_key_id,
        p_user_id,
        CASE WHEN api_format IN ('gemini', 'openai') THEN api_format ELSE 'gemini' END,
        COALESCE(p_request_data, '{}'::jsonb),
        p_response_data,
        COALESCE(p_is_successful, FALSE),
        COALESCE((usage_json->>'is_stream')::BOOLEAN, FALSE),
        usage_json->'error_details',
        COALESCE(usage_json->'performance_metrics', '{}'::jsonb),
        usage_json - 'api_format' - 'is_stream' - 'error_details' - 'performance_metrics' - 'retry_attempts',
        COALESCE(usage_json->'retry_attempts', '[]'::jsonb)
    )
    ON CONFLICT (request_id) DO UPDATE SET
        response_data = EXCLUDED.response_data,
        is_successful = EXCLUDED.is_successful,
        error_details = EXCLUDED.error_details,
        performance_metrics = EXCLUDED.performance_metrics,
        usage_metadata = EXCLUDED.usage_metadata,
        retry_attempts = EXCLUDED.retry_attempts,
        api_key_id = COALESCE(EXCLUDED.api_key_id, request_logs.api_key_id),
        proxy_key_id = COALESCE(EXCLUDED.proxy_key_id, request_logs.proxy_key_id);

    INSERT INTO proxy_key_settlements (request_id, proxy_key_id)
    VALUES (p_request_id, p_proxy_key_id)
    ON CONFLICT (request_id) DO NOTHING;

    settlement_inserted := FOUND;

    IF NOT settlement_inserted THEN
        RETURN;
    END IF;

    IF p_api_key_id IS NOT NULL THEN
        PERFORM increment_api_key_usage(
            p_api_key_id,
            CASE WHEN COALESCE(p_is_successful, FALSE) THEN 1 ELSE 0 END,
            CASE WHEN COALESCE(p_is_successful, FALSE) THEN 0 ELSE 1 END,
            COALESCE((usage_json->>'prompt_tokens')::BIGINT, 0),
            COALESCE((usage_json->>'completion_tokens')::BIGINT, 0),
            GREATEST(COALESCE(p_actual_tokens, 0), 0)
        );
    END IF;

    PERFORM increment_proxy_api_key_usage(
        p_proxy_key_id,
        CASE WHEN COALESCE(p_is_successful, FALSE) THEN 1 ELSE 0 END,
        CASE WHEN COALESCE(p_is_successful, FALSE) THEN 0 ELSE 1 END,
        COALESCE((usage_json->>'prompt_tokens')::BIGINT, 0),
        COALESCE((usage_json->>'completion_tokens')::BIGINT, 0),
        GREATEST(COALESCE(p_actual_tokens, 0), 0)
    );

    UPDATE proxy_api_keys
    SET inflight_count = GREATEST(inflight_count - 1, 0)
    WHERE id = p_proxy_key_id
      AND deleted_at IS NULL;

    UPDATE proxy_key_quota_windows
    SET
        reserved_tokens = GREATEST(
            reserved_tokens - GREATEST(COALESCE(p_reserved_tokens, 0), 0),
            0
        ),
        reserved_cost_usd = GREATEST(
            reserved_cost_usd - GREATEST(COALESCE(p_reserved_usd, 0), 0),
            0
        ),
        token_count = token_count + GREATEST(COALESCE(p_actual_tokens, 0), 0),
        settled_cost_usd = settled_cost_usd + GREATEST(COALESCE(p_actual_usd, 0), 0)
    WHERE proxy_key_id = p_proxy_key_id
      AND (
          (
              p_minute_start IS NOT NULL
              AND window_type = 'minute'
              AND window_start = p_minute_start
          )
          OR (
              p_day_start IS NOT NULL
              AND window_type = 'day'
              AND window_start = p_day_start
          )
          OR (
              p_month_start IS NOT NULL
              AND window_type = 'month'
              AND window_start = p_month_start
          )
      );
END;
$$;

CREATE OR REPLACE FUNCTION reconcile_proxy_request(p_request_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    log_row request_logs%ROWTYPE;
    metrics JSONB;
    usage_json JSONB;
BEGIN
    SELECT * INTO log_row FROM request_logs WHERE request_id = p_request_id;
    IF FOUND THEN
        metrics := COALESCE(log_row.performance_metrics, '{}'::jsonb);
        usage_json := COALESCE(log_row.usage_metadata, '{}'::jsonb)
            || jsonb_build_object(
                'api_format', log_row.api_format,
                'is_stream', log_row.is_stream,
                'error_details', log_row.error_details,
                'performance_metrics', metrics,
                'retry_attempts', log_row.retry_attempts
            );
        PERFORM finalize_proxy_request(
            log_row.request_id,
            log_row.proxy_key_id,
            log_row.api_key_id,
            log_row.user_id,
            log_row.is_successful,
            log_row.request_data,
            log_row.response_data,
            usage_json,
            COALESCE((metrics->>'policy_reserved_tokens')::BIGINT, 0),
            COALESCE((metrics->>'policy_reserved_usd')::NUMERIC, 0),
            COALESCE((log_row.usage_metadata->>'total_tokens')::BIGINT, 0),
            COALESCE((log_row.usage_metadata->>'estimated_cost_usd')::NUMERIC, 0),
            NULLIF(metrics->>'policy_minute_start', '')::TIMESTAMPTZ,
            NULLIF(metrics->>'policy_day_start', '')::TIMESTAMPTZ,
            NULLIF(metrics->>'policy_month_start', '')::TIMESTAMPTZ
        );
    END IF;

    UPDATE proxy_reconciliation_needed
    SET resolved_at = NOW()
    WHERE request_id = p_request_id
      AND resolved_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION finalize_proxy_request(
    TEXT, UUID, UUID, UUID, BOOLEAN, JSONB, JSONB, JSONB, BIGINT, NUMERIC, BIGINT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC;
REVOKE ALL ON FUNCTION reconcile_proxy_request(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_proxy_request(
    TEXT, UUID, UUID, UUID, BOOLEAN, JSONB, JSONB, JSONB, BIGINT, NUMERIC, BIGINT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION reconcile_proxy_request(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reconcile_proxy_request(TEXT) TO authenticated;

COMMENT ON FUNCTION finalize_proxy_request(
    TEXT, UUID, UUID, UUID, BOOLEAN, JSONB, JSONB, JSONB, BIGINT, NUMERIC, BIGINT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) IS
    'Idempotent log + settlement + usage counters. Settlement insert wins once; retries skip counters.';
COMMENT ON FUNCTION reconcile_proxy_request(TEXT) IS
    'Re-runs finalize from request_logs if present (no-op when already settled) and marks the stale row resolved.';
