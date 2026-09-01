import { describe, expect, it } from 'vitest';
import type { StoredCombo } from './combo-types';
import { resolveCombo } from './resolve-combo';

const flash: StoredCombo = {
    id: 'c1',
    name: 'flash-combo',
    isActive: true,
    strategy: null,
    stickAfterSuccesses: null,
    members: ['gemini-3.7-flash', 'gemini-3.5-flash'],
};

describe('resolveCombo', () => {
    it('returns combo members on exact active name match', () => {
        const actual = resolveCombo({
            combos: [flash],
            requestedModel: 'flash-combo',
        });
        expect(actual).toEqual({
            kind: 'combo',
            combo: flash,
            members: ['gemini-3.7-flash', 'gemini-3.5-flash'],
        });
    });

    it('combo wins when name equals a Google model id', () => {
        const override: StoredCombo = {
            ...flash,
            name: 'gemini-3.7-flash',
            members: ['gemini-3.5-flash-lite'],
        };
        const actual = resolveCombo({
            combos: [override],
            requestedModel: 'gemini-3.7-flash',
        });
        expect(actual.kind).toBe('combo');
        expect(actual.members).toEqual(['gemini-3.5-flash-lite']);
    });

    it('treats inactive combo as miss', () => {
        const actual = resolveCombo({
            combos: [{ ...flash, isActive: false }],
            requestedModel: 'flash-combo',
        });
        expect(actual).toEqual({ kind: 'single', members: ['flash-combo'] });
    });

    it('normalizes models/ prefix and case before match', () => {
        const actual = resolveCombo({
            combos: [flash],
            requestedModel: 'models/Flash-Combo',
        });
        expect(actual.kind).toBe('combo');
    });
});
