import { describe, expect, it } from 'vitest';
import { downsampleActivityChartPoints } from './logs-activity-chart-series';

describe('downsampleActivityChartPoints', () => {
    it('returns input unchanged when under the max point threshold', () => {
        const points = [
            { label: 'a', count: 1 },
            { label: 'b', count: 2 },
        ];
        expect(downsampleActivityChartPoints(points)).toEqual(points);
    });

    it('aggregates skipped buckets instead of dropping their counts', () => {
        const points = Array.from({ length: 168 }, (_, index) => ({
            label: `h${index}`,
            count: 1,
        }));

        const downsampled = downsampleActivityChartPoints(points);
        const total = downsampled.reduce((sum, point) => sum + point.count, 0);

        expect(total).toBe(168);
        expect(downsampled.length).toBeLessThanOrEqual(80);
    });
});
