import { describe, expect, it } from 'vitest';
import { consumeModelProbeRateLimit } from './model-probe-rate-limit';

describe('consumeModelProbeRateLimit', () => {
    it('allows the first probe and blocks rapid repeats', () => {
        const userId = `user-${Date.now()}`;
        expect(consumeModelProbeRateLimit(userId, 10_000)).toBe(true);
        expect(consumeModelProbeRateLimit(userId, 10_500)).toBe(false);
        expect(consumeModelProbeRateLimit(userId, 12_001)).toBe(true);
    });
});
