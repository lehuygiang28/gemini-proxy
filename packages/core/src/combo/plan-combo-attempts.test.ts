import { describe, expect, it } from 'vitest';
import { planComboAttempts } from './plan-combo-attempts';

const keys = ['A', 'B', 'C'] as const;
const members = ['m0', 'm1', 'm2', 'm3'] as const;

describe('planComboAttempts', () => {
    it('walks model-major for 3x4 all eligible starting at A', () => {
        const actual = planComboAttempts({
            keys: [...keys],
            members: [...members],
            isPairIneligible: () => false,
        });
        expect(actual.map((pair) => `${pair.apiKeyId}+${pair.canonicalModel}`)).toEqual([
            'A+m0',
            'B+m0',
            'C+m0',
            'A+m1',
            'B+m1',
            'C+m1',
            'A+m2',
            'B+m2',
            'C+m2',
            'A+m3',
            'B+m3',
            'C+m3',
        ]);
    });

    it('covers all 8 pairs for 2 keys x 4 members', () => {
        const actual = planComboAttempts({
            keys: ['A', 'B'],
            members: ['m0', 'm1', 'm2', 'm3'],
            isPairIneligible: () => false,
        });
        const ids = actual.map((pair) => `${pair.apiKeyId}+${pair.canonicalModel}`);
        expect(new Set(ids).size).toBe(8);
        expect(ids).toHaveLength(8);
    });

    it('skips an ineligible pair and continues the ring', () => {
        const cooled = new Set(['B+m0']);
        const actual = planComboAttempts({
            keys: ['A', 'B', 'C'],
            members: ['m0', 'm1'],
            isPairIneligible: (keyId, model) => cooled.has(`${keyId}+${model}`),
        });
        expect(actual.map((pair) => `${pair.apiKeyId}+${pair.canonicalModel}`)).toEqual([
            'A+m0',
            'C+m0',
            'A+m1',
            'B+m1',
            'C+m1',
        ]);
    });

    it('does not stall when every key is ineligible for a member', () => {
        const actual = planComboAttempts({
            keys: ['A', 'B'],
            members: ['m0', 'm1'],
            isPairIneligible: (_key, model) => model === 'm0',
        });
        expect(actual.map((pair) => `${pair.apiKeyId}+${pair.canonicalModel}`)).toEqual([
            'A+m1',
            'B+m1',
        ]);
    });

    it('after a partial wave does not immediately reuse the last yielded key', () => {
        const actual = planComboAttempts({
            keys: ['A', 'B', 'C'],
            members: ['m0', 'm1'],
            isPairIneligible: (key, model) => model === 'm0' && key !== 'A',
        });
        expect(actual.map((pair) => `${pair.apiKeyId}+${pair.canonicalModel}`)).toEqual([
            'A+m0',
            'B+m1',
            'C+m1',
            'A+m1',
        ]);
    });
});
