import { describe, expect, it } from 'vitest';
import { hasValidModelPatterns } from './has-valid-model-patterns';

describe('hasValidModelPatterns', () => {
    it('accepts exact model names and a single trailing wildcard', () => {
        expect(hasValidModelPatterns(['gemini-2.5-pro', 'gemini-2.5-*', '*'])).toBe(true);
    });

    it('rejects a wildcard anywhere before the final character', () => {
        expect(hasValidModelPatterns(['gemini-*-pro'])).toBe(false);
        expect(hasValidModelPatterns(['gemini-**'])).toBe(false);
    });

    it('accepts an empty model list', () => {
        expect(hasValidModelPatterns(undefined)).toBe(true);
        expect(hasValidModelPatterns([])).toBe(true);
    });
});
