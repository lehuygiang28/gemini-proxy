import { describe, expect, it } from 'vitest';
import { estimateSpeedTokPerS } from './estimate-speed';

describe('estimateSpeedTokPerS', () => {
    it('returns completion tokens per API second', () => {
        expect(estimateSpeedTokPerS({ completionTokens: 470, durationMs: 10000 })).toBe(47);
    });

    it('returns null when duration is missing or not positive', () => {
        expect(estimateSpeedTokPerS({ completionTokens: 100, durationMs: 0 })).toBeNull();
        expect(estimateSpeedTokPerS({ completionTokens: 100, durationMs: null })).toBeNull();
    });

    it('returns null when completion tokens are missing or not positive', () => {
        expect(estimateSpeedTokPerS({ completionTokens: 0, durationMs: 1000 })).toBeNull();
        expect(estimateSpeedTokPerS({ completionTokens: null, durationMs: 1000 })).toBeNull();
    });
});
