-- Batched request_log retention (default 90 days) for Supabase Free.
-- Lifetime counters on api_keys / proxy_api_keys are never touched.
-- Schedule: daily 03:00 UTC via pg_cron when the extension is enabled.

CREATE OR REPLACE FUNCTION cleanup_old_request_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', pg_catalog
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_batch_size INTEGER := 1000;
    v_max_batches INTEGER := 50;
    v_sleep_ms INTEGER := 200;
    v_batch_deleted BIGINT;
    v_total_deleted BIGINT := 0;
    v_batch INTEGER;
BEGIN
    IF p_days_to_keep IS NULL OR p_days_to_keep < 7 THEN
        RAISE EXCEPTION 'p_days_to_keep must be >= 7';
    END IF;

    v_cutoff := NOW() - (p_days_to_keep || ' days')::INTERVAL;

    FOR v_batch IN 1..v_max_batches LOOP
        WITH doomed AS (
            SELECT id
            FROM request_logs
            WHERE created_at < v_cutoff
            ORDER BY created_at
            LIMIT v_batch_size
            FOR UPDATE SKIP LOCKED
        )
        DELETE FROM request_logs rl
        USING doomed d
        WHERE rl.id = d.id;

        GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
        v_total_deleted := v_total_deleted + v_batch_deleted;

        EXIT WHEN v_batch_deleted = 0;

        IF v_batch < v_max_batches AND v_batch_deleted = v_batch_size THEN
            PERFORM pg_sleep(v_sleep_ms / 1000.0);
        END IF;
    END LOOP;

    RETURN v_total_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_request_logs(INTEGER) IS
    'Hard-deletes request_logs older than p_days_to_keep (default 90) in batches. '
    'service_role only. Does not modify api_keys / proxy_api_keys counters.';

REVOKE ALL ON FUNCTION cleanup_old_request_logs(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_old_request_logs(INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_request_logs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_request_logs(INTEGER) TO postgres;

-- pg_cron is available on Supabase cloud but not in local `supabase start`.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron is not available locally (%). Enable Cron in Supabase Dashboard for scheduled purges.', SQLERRM;
END;
$$;

-- Schedule daily purge when pg_cron is available.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        IF EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'purge-request-logs-daily'
        ) THEN
            PERFORM cron.unschedule('purge-request-logs-daily');
        END IF;

        PERFORM cron.schedule(
            'purge-request-logs-daily',
            '0 3 * * *',
            $cron$SELECT cleanup_old_request_logs(90)$cron$
        );
    ELSE
        RAISE NOTICE
            'pg_cron is not enabled. Enable it in Supabase Dashboard → Integrations → Cron, then schedule purge-request-logs-daily (0 3 * * *) to call cleanup_old_request_logs(90).';
    END IF;
END;
$$;
