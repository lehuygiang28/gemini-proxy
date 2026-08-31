import { describe, expect, it } from 'vitest';
import { computeRetryDelayMs } from './retry-delay';

describe('computeRetryDelayMs', () => {
    it('applies full jitter to exponential delay', () => {
        const actualDelay = computeRetryDelayMs({
            attempt: 2,
            baseDelayMs: 200,
            maxDelayMs: 5_000,
            random: () => 0.5,
        });

        expect(actualDelay).toBe(400);
    });

    it('caps exponential delay before applying jitter', () => {
        const actualDelay = computeRetryDelayMs({
            attempt: 10,
            baseDelayMs: 200,
            maxDelayMs: 5_000,
            random: () => 0.5,
        });

        expect(actualDelay).toBe(2_500);
    });
});
