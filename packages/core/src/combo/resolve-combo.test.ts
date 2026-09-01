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

    it('misses when the catalog is empty', () => {
        expect(resolveCombo({ combos: [], requestedModel: 'flash-combo' })).toEqual({
            kind: 'single',
            members: ['flash-combo'],
        });
    });

    it('does not nest-resolve a member that matches another combo name', () => {
        const nested: StoredCombo = {
            id: 'c2',
            name: 'inner-combo',
            isActive: true,
            strategy: null,
            stickAfterSuccesses: null,
            members: ['gemini-3.7-flash'],
        };
        const outer: StoredCombo = {
            ...flash,
            members: ['inner-combo', 'gemini-3.5-flash'],
        };
        const actual = resolveCombo({
            combos: [outer, nested],
            requestedModel: 'flash-combo',
        });
        expect(actual).toEqual({
            kind: 'combo',
            combo: outer,
            members: ['inner-combo', 'gemini-3.5-flash'],
        });
    });

    it('prefers the first active combo when names collide', () => {
        const second: StoredCombo = { ...flash, id: 'c9', members: ['gemini-3.5-flash-lite'] };
        const actual = resolveCombo({
            combos: [flash, second],
            requestedModel: 'flash-combo',
        });
        expect(actual.kind).toBe('combo');
        if (actual.kind === 'combo') {
            expect(actual.combo.id).toBe('c1');
        }
    });
});
