import { describe, expect, it } from 'vitest';
import { calculateRetryAttempts } from './calculate-retry-attempts';

describe('calculateRetryAttempts', () => {
    it('returns 0 extra attempts when PROXY_MAX_RETRIES is 0', () => {
        expect(calculateRetryAttempts(0, 10)).toBe(0);
    });

    it('returns N extra attempts when PROXY_MAX_RETRIES is N and keys remain', () => {
        expect(calculateRetryAttempts(2, 10)).toBe(2);
    });

    it('caps extra attempts so total attempts never exceed eligible keys', () => {
        expect(calculateRetryAttempts(5, 2)).toBe(1);
    });

    it('uses all eligible keys minus the first when PROXY_MAX_RETRIES is -1', () => {
        expect(calculateRetryAttempts(-1, 3)).toBe(2);
    });

    it('caps unlimited retries at 50 total attempts', () => {
        expect(calculateRetryAttempts(-1, 80)).toBe(49);
    });

    it('caps N retries so total attempts never exceed 50', () => {
        expect(calculateRetryAttempts(100, 80)).toBe(49);
    });

    it('returns 0 extra attempts when only one key is eligible', () => {
        expect(calculateRetryAttempts(-1, 1)).toBe(0);
    });
});
