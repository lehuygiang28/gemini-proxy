import { describe, expect, it } from 'vitest';
import { firstPricedComboMember } from './first-priced-combo-member';

describe('firstPricedComboMember', () => {
    it('returns the first member with builtin pricing', () => {
        expect(firstPricedComboMember(['unknown-model', 'gemini-3.5-flash'])).toBe(
            'gemini-3.5-flash',
        );
    });

    it('falls back to the first member when none have pricing', () => {
        expect(firstPricedComboMember(['custom-a', 'custom-b'])).toBe('custom-a');
    });

    it('returns undefined for an empty member list', () => {
        expect(firstPricedComboMember([])).toBeUndefined();
    });
});
