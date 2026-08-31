import { describe, expect, it } from 'vitest';
import { globModel, matchModelPolicy } from './match-model-policy';

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

    it('treats patterns with asterisk before trailing asterisk as exact strings', () => {
        expect(globModel('gemini-*-flash*', 'gemini-foo-flashX')).toBe(false);
        expect(globModel('gemini-*-flash*', 'gemini-*-flashX')).toBe(false);
        expect(globModel('gemini-*-flash*', 'gemini-*-flash*')).toBe(true);
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

describe('matchModelPolicy', () => {
    it('returns ok when both allow and deny lists are empty', () => {
        expect(
            matchModelPolicy({
                model: undefined,
                allowed: null,
                denied: null,
            }),
        ).toBe('ok');
        expect(
            matchModelPolicy({
                model: undefined,
                allowed: [],
                denied: [],
            }),
        ).toBe('ok');
    });

    it('returns model_required when allowlist is set and model is missing', () => {
        expect(
            matchModelPolicy({
                model: undefined,
                allowed: ['gemini-3.5-flash'],
                denied: null,
            }),
        ).toBe('model_required');
    });

    it('denies models matching the deny list before allowlist', () => {
        expect(
            matchModelPolicy({
                model: 'gemini-3.5-flash',
                allowed: ['gemini-3.5-*'],
                denied: ['gemini-3.5-flash'],
            }),
        ).toBe('model_denied');
    });

    it('allows models matching the allowlist', () => {
        expect(
            matchModelPolicy({
                model: 'gemini-3.5-flash',
                allowed: ['gemini-3.5-*'],
                denied: null,
            }),
        ).toBe('ok');
    });

    it('denies models not matching a non-empty allowlist', () => {
        expect(
            matchModelPolicy({
                model: 'gemini-3.5-pro',
                allowed: ['gemini-3.5-flash'],
                denied: null,
            }),
        ).toBe('model_denied');
    });

    it('treats null and empty lists as empty', () => {
        expect(
            matchModelPolicy({
                model: 'gemini-3.5-flash',
                allowed: null,
                denied: ['gemini-3.5-pro'],
            }),
        ).toBe('ok');
    });
});
