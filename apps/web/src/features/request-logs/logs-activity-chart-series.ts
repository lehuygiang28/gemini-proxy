import type { RequestLogsVolume } from '@gemini-proxy/database';

export type ActivityChartPoint = { label: string; count: number };

const MAX_CHART_POINTS = 120;
const TARGET_CHART_POINTS = 80;

export function downsampleActivityChartPoints(points: ActivityChartPoint[]): ActivityChartPoint[] {
    if (points.length <= MAX_CHART_POINTS) {
        return points;
    }

    const stride = Math.ceil(points.length / TARGET_CHART_POINTS);
    const aggregated: ActivityChartPoint[] = [];

    for (let index = 0; index < points.length; index += stride) {
        const chunk = points.slice(index, index + stride);
        const count = chunk.reduce((sum, point) => sum + point.count, 0);
        aggregated.push({
            label: chunk[0].label,
            count,
        });
    }

    return aggregated;
}

export function fillBucketSeries(
    volume: RequestLogsVolume | null | undefined,
    locale: string,
): ActivityChartPoint[] {
    if (!volume?.period_start || !volume.period_end) {
        return [];
    }

    const start = new Date(volume.period_start);
    const end = new Date(volume.period_end);
    const buckets = volume.buckets ?? {};
    const points: ActivityChartPoint[] = [];
    const stepMs = volume.bucket === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const timeFormatter = new Intl.DateTimeFormat(locale, {
        ...(volume.bucket === 'hour'
            ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
            : { month: 'short', day: 'numeric' }),
    });

    for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += stepMs) {
        const iso =
            volume.bucket === 'hour'
                ? new Date(cursor).toISOString().slice(0, 13) + ':00:00Z'
                : new Date(cursor).toISOString().slice(0, 10) + 'T00:00:00Z';
        const count = buckets[iso] ?? 0;
        points.push({
            label: timeFormatter.format(new Date(cursor)),
            count,
        });
    }

    return downsampleActivityChartPoints(points);
}
