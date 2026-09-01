import { describe, expect, it } from 'vitest';
import { mergeModelList } from './merge-model-list';

const flashCombo = {
    id: 'c1',
    name: 'flash-combo',
    isActive: true,
    strategy: null as const,
    stickAfterSuccesses: null,
    members: ['gemini-3.7-flash', 'gemini-3.5-flash'],
};

describe('mergeModelList', () => {
    it('keeps google ids and adds the combo id', () => {
        const actual = mergeModelList({
            googleIds: ['gemini-3.7-flash'],
            catalogIds: [],
            builtinIds: ['gemini-3.7-flash'],
            combos: [flashCombo],
            allowedModels: null,
        });
        const ids = actual.map((row) => row.id);
        expect(ids).toContain('flash-combo');
        expect(ids).toContain('gemini-3.7-flash');
        expect(actual.find((row) => row.id === 'flash-combo')?.source).toBe('combo');
    });

    it('replaces a colliding google id with the combo row', () => {
        const override = {
            ...flashCombo,
            name: 'gemini-3.7-flash',
            members: ['gemini-3.5-flash-lite'],
        };
        const actual = mergeModelList({
            googleIds: ['gemini-3.7-flash'],
            catalogIds: [],
            builtinIds: ['gemini-3.7-flash'],
            combos: [override],
            allowedModels: null,
        });
        const matches = actual.filter((row) => row.id === 'gemini-3.7-flash');
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({
            source: 'combo',
            overrides: true,
            description: 'Combo: gemini-3.5-flash-lite',
        });
    });

    it('allowlists the requested combo name only', () => {
        const actual = mergeModelList({
            googleIds: ['gemini-3.7-flash'],
            catalogIds: [],
            builtinIds: ['gemini-3.7-flash'],
            combos: [flashCombo],
            allowedModels: ['flash-combo'],
        });
        expect(actual.map((row) => row.id)).toEqual(['flash-combo']);
    });

    it('keeps all ids when the allowlist is empty', () => {
        const actual = mergeModelList({
            googleIds: ['gemini-3.7-flash'],
            catalogIds: ['custom-model'],
            builtinIds: [],
            combos: [flashCombo],
            allowedModels: [],
        });
        expect(actual.map((row) => row.id).sort()).toEqual(
            ['custom-model', 'flash-combo', 'gemini-3.7-flash'].sort(),
        );
    });

    it('keeps a combo that matches a trailing glob', () => {
        const actual = mergeModelList({
            googleIds: [],
            catalogIds: [],
            builtinIds: [],
            combos: [flashCombo],
            allowedModels: ['flash-*'],
        });
        expect(actual.map((row) => row.id)).toEqual(['flash-combo']);
    });
});
