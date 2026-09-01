import { describe, expect, it } from 'vitest';
import { isProxyQuotaWindowType, selectedQuotaWindowTypes } from './quota-window-types';

describe('selectedQuotaWindowTypes', () => {
    it('returns canonical minute, day, month order', () => {
        expect(selectedQuotaWindowTypes({ month: true, minute: true, day: true })).toEqual([
            'minute',
            'day',
            'month',
        ]);
    });

    it('omits unchecked windows', () => {
        expect(selectedQuotaWindowTypes({ minute: false, day: true, month: false })).toEqual([
            'day',
        ]);
    });

    it('returns empty when none selected', () => {
        expect(selectedQuotaWindowTypes({ minute: false, day: false, month: false })).toEqual([]);
    });
});

describe('isProxyQuotaWindowType', () => {
    it('accepts minute day month and rejects others', () => {
        expect(isProxyQuotaWindowType('minute')).toBe(true);
        expect(isProxyQuotaWindowType('day')).toBe(true);
        expect(isProxyQuotaWindowType('month')).toBe(true);
        expect(isProxyQuotaWindowType('week')).toBe(false);
    });
});
