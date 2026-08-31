import { describe, expect, it } from 'vitest';
import { globModel } from './glob-model';

describe('globModel', () => {
    it('matches trailing wildcard prefix', () => {
        expect(globModel('gemini-3.5-*', 'gemini-3.5-flash')).toBe(true);
        expect(globModel('gemini-3.5-*', 'gemini-3.5-pro')).toBe(true);
        expect(globModel('gemini-3.5-*', 'gemini-3.0-flash')).toBe(false);
    });

    it('treats patterns with non-trailing asterisk as exact strings', () => {
        expect(globModel('gemini-*-flash', 'gemini-3.5-flash')).toBe(false);
        expect(globModel('gemini-*-flash', 'gemini-*-flash')).toBe(true);
    });

    it('matches exact strings without wildcards', () => {
        expect(globModel('gemini-3.5-flash', 'gemini-3.5-flash')).toBe(true);
        expect(globModel('gemini-3.5-flash', 'gemini-3.5-pro')).toBe(false);
    });

    it('is case-sensitive', () => {
        expect(globModel('Gemini-*', 'gemini-flash')).toBe(false);
    });

    it('matches only empty model when pattern is empty', () => {
        expect(globModel('', '')).toBe(true);
        expect(globModel('', 'gemini-flash')).toBe(false);
    });
});
