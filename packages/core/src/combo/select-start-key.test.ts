import { describe, expect, it } from 'vitest';
import { selectStartKey } from './select-start-key';

const keys = [
    { id: 'A', lastUsedAt: '2026-09-01T00:02:00.000Z' },
    { id: 'B', lastUsedAt: '2026-09-01T00:01:00.000Z' },
    { id: 'C', lastUsedAt: null },
];

describe('selectStartKey', () => {
    it('orders fallback by lastUsedAt nulls first then id', () => {
        const actual = selectStartKey({
            strategy: 'fallback',
            stickAfterSuccesses: null,
            consecutiveSuccesses: 0,
            lastApiKeyId: 'A',
            keys,
        });
        expect(actual).toEqual(['C', 'B', 'A']);
    });

    it('puts a sticky eligible key first', () => {
        const actual = selectStartKey({
            strategy: 'sticky_until_error',
            stickAfterSuccesses: null,
            consecutiveSuccesses: 2,
            lastApiKeyId: 'A',
            keys,
        });
        expect(actual[0]).toBe('A');
        expect(new Set(actual)).toEqual(new Set(['A', 'B', 'C']));
        expect(actual).toHaveLength(3);
    });

    it('rotates past sticky when stick_n count is reached', () => {
        const actual = selectStartKey({
            strategy: 'stick_n',
            stickAfterSuccesses: 3,
            consecutiveSuccesses: 3,
            lastApiKeyId: 'A',
            keys,
        });
        expect(actual[0]).not.toBe('A');
        expect(actual).toContain('A');
        expect(actual[0]).toBe('C');
    });

    it('falls back when sticky id is not eligible', () => {
        const actual = selectStartKey({
            strategy: 'sticky_until_error',
            stickAfterSuccesses: null,
            consecutiveSuccesses: 9,
            lastApiKeyId: 'missing',
            keys,
        });
        expect(actual).toEqual(['C', 'B', 'A']);
    });

    it('keeps the last key first on stick_n before N successes', () => {
        const actual = selectStartKey({
            strategy: 'stick_n',
            stickAfterSuccesses: 3,
            consecutiveSuccesses: 2,
            lastApiKeyId: 'A',
            keys,
        });
        expect(actual[0]).toBe('A');
        expect(actual).toEqual(['A', 'C', 'B']);
    });

    it('returns an empty ring when there are no keys', () => {
        expect(
            selectStartKey({
                strategy: 'sticky_until_error',
                stickAfterSuccesses: null,
                consecutiveSuccesses: 1,
                lastApiKeyId: 'A',
                keys: [],
            }),
        ).toEqual([]);
    });
});
