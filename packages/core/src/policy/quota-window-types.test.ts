import { describe, expect, it } from 'vitest';
import {
    isProxyQuotaWindowType,
    isValidProxyQuotaWindowTypes,
    selectedQuotaWindowTypes,
} from './quota-window-types';

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

describe('isValidProxyQuotaWindowTypes', () => {
    it('accepts unique minute/day/month values', () => {
        expect(isValidProxyQuotaWindowTypes(['day', 'minute'])).toBe(true);
    });

    it('rejects empty, duplicates, and unknown windows', () => {
        expect(isValidProxyQuotaWindowTypes([])).toBe(false);
        expect(isValidProxyQuotaWindowTypes(['minute', 'minute'])).toBe(false);
        expect(isValidProxyQuotaWindowTypes(['week'])).toBe(false);
        expect(isValidProxyQuotaWindowTypes(null)).toBe(false);
    });
});
