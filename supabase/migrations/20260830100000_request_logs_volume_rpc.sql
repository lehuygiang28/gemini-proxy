-- Volume buckets for request logs activity chart (24h/7d/30d/90d ranges).

CREATE OR REPLACE FUNCTION get_request_logs_volume(
    p_user_id UUID DEFAULT auth.uid(),
    p_range TEXT DEFAULT '7d'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    effective_user_id UUID;
    normalized_range TEXT;
    bucket_unit TEXT;
    period_start TIMESTAMPTZ;
    period_end TIMESTAMPTZ;
    buckets JSONB;
    total_count BIGINT;
BEGIN
    effective_user_id := COALESCE(p_user_id, auth.uid());
    period_end := NOW();

    normalized_range := COALESCE(p_range, '7d');
    IF normalized_range NOT IN ('24h', '7d', '30d', '90d') THEN
        normalized_range := '7d';
    END IF;

    CASE normalized_range
        WHEN '24h' THEN
            period_start := period_end - INTERVAL '24 hours';
            bucket_unit := 'hour';
        WHEN '7d' THEN
            period_start := period_end - INTERVAL '7 days';
            bucket_unit := 'hour';
        WHEN '30d' THEN
            period_start := period_end - INTERVAL '30 days';
            bucket_unit := 'day';
        WHEN '90d' THEN
            period_start := period_end - INTERVAL '90 days';
            bucket_unit := 'day';
        ELSE
            period_start := period_end - INTERVAL '7 days';
            bucket_unit := 'hour';
    END CASE;

    SELECT
        COALESCE(
            jsonb_object_agg(bucket_key, bucket_count ORDER BY bucket_key),
            '{}'::jsonb
        ),
        COALESCE(SUM(bucket_count), 0)
    INTO buckets, total_count
    FROM (
        SELECT
            CASE
                WHEN bucket_unit = 'hour' THEN
                    to_char(
                        date_trunc('hour', created_at AT TIME ZONE 'UTC'),
                        'YYYY-MM-DD"T"HH24:00:00"Z"'
                    )
                ELSE
                    to_char(
                        date_trunc('day', created_at AT TIME ZONE 'UTC'),
                        'YYYY-MM-DD"T"00:00:00"Z"'
                    )
            END AS bucket_key,
            COUNT(*)::BIGINT AS bucket_count
        FROM request_logs
        WHERE (effective_user_id IS NULL OR user_id = effective_user_id)
          AND created_at >= period_start
          AND created_at <= period_end
        GROUP BY 1
    ) bucket_stats;

    RETURN jsonb_build_object(
        'range', normalized_range,
        'bucket', bucket_unit,
        'buckets', COALESCE(buckets, '{}'::jsonb),
        'total_requests', COALESCE(total_count, 0),
        'period_start', period_start,
        'period_end', period_end
    );
END;
$$;

COMMENT ON FUNCTION get_request_logs_volume(UUID, TEXT) IS
    'Request volume time-series for logs activity chart. Buckets: hourly (24h/7d) or daily (30d/90d).';

GRANT EXECUTE ON FUNCTION get_request_logs_volume(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION get_request_logs_volume(UUID, TEXT) FROM PUBLIC;
