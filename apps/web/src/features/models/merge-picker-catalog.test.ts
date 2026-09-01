import { describe, expect, it } from 'vitest';
import { mergePickerCatalog } from './merge-picker-catalog';

const flashCombo = {
    id: 'c1',
    name: 'flash-combo',
    isActive: true,
    strategy: null as const,
    stickAfterSuccesses: null,
    members: ['gemini-3.7-flash', 'gemini-3.5-flash'],
};

describe('mergePickerCatalog', () => {
    it('includes combos only in requestName mode', () => {
        const input = {
            googleIds: ['gemini-3.7-flash'],
            catalogIds: ['custom-model'],
            builtinIds: ['gemini-3.7-flash', 'gemma-3-27b-it'],
            combos: [flashCombo],
        };
        const requestName = mergePickerCatalog({ ...input, mode: 'requestName' });
        const concrete = mergePickerCatalog({ ...input, mode: 'concrete' });
        expect(requestName.some((row) => row.id === 'flash-combo')).toBe(true);
        expect(concrete.some((row) => row.id === 'flash-combo')).toBe(false);
        expect(concrete.some((row) => row.id === 'gemini-3.7-flash')).toBe(true);
    });

    it('marks colliding combo names as overrides in requestName mode', () => {
        const actual = mergePickerCatalog({
            mode: 'requestName',
            googleIds: ['gemini-3.7-flash'],
            catalogIds: [],
            builtinIds: ['gemini-3.7-flash'],
            combos: [
                { ...flashCombo, name: 'gemini-3.7-flash', members: ['gemini-3.5-flash-lite'] },
            ],
        });
        const matches = actual.filter((row) => row.id === 'gemini-3.7-flash');
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({ source: 'combo', overrides: true });
    });
});
