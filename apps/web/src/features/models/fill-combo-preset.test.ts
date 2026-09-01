import { describe, expect, it } from 'vitest';
import { fillComboPreset } from './fill-combo-preset';

describe('fillComboPreset', () => {
    it('fills flash models that exist and names flash-combo', () => {
        const actual = fillComboPreset('flash', [
            'gemini-3.7-flash',
            'gemini-3.5-flash-lite',
            'gemini-3.1-pro',
        ]);
        expect(actual).toEqual({
            name: 'flash-combo',
            models: ['gemini-3.7-flash', 'gemini-3.5-flash-lite'],
        });
    });

    it('skips missing pro models and keeps builtin order', () => {
        const actual = fillComboPreset('pro', ['gemini-3.1-pro-preview', 'gemini-2.5-pro']);
        expect(actual.name).toBe('pro-combo');
        expect(actual.models).toEqual(['gemini-2.5-pro', 'gemini-3.1-pro-preview']);
    });

    it('fills gemma family ids that are available', () => {
        const actual = fillComboPreset('gemma', ['gemma-3-27b-it', 'gemini-3.7-flash']);
        expect(actual.name).toBe('gemma-combo');
        expect(actual.models).toEqual(['gemma-3-27b-it']);
    });

    it('returns the preset name with no models when nothing is available', () => {
        expect(fillComboPreset('flash', [])).toEqual({ name: 'flash-combo', models: [] });
        expect(fillComboPreset('pro', ['gemini-3.7-flash'])).toEqual({
            name: 'pro-combo',
            models: [],
        });
        expect(fillComboPreset('gemma', ['gemini-3.7-flash'])).toEqual({
            name: 'gemma-combo',
            models: [],
        });
    });
});
