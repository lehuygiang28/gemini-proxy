import { describe, expect, it } from 'vitest';
import { parseGoogleModelsList } from './parse-google-models-list';

describe('parseGoogleModelsList', () => {
    it('normalizes ids and marks generateContent models', () => {
        const actual = parseGoogleModelsList({
            models: [
                {
                    name: 'models/gemini-3.7-flash',
                    displayName: 'Gemini 3.7 Flash',
                    supportedGenerationMethods: ['generateContent', 'countTokens'],
                },
                {
                    name: 'models/imagen-4.0-generate',
                    displayName: 'Imagen',
                    supportedGenerationMethods: ['predict'],
                },
            ],
        });
        expect(actual).toEqual([
            {
                modelId: 'gemini-3.7-flash',
                displayName: 'Gemini 3.7 Flash',
                supportsGenerate: true,
            },
            {
                modelId: 'imagen-4.0-generate',
                displayName: 'Imagen',
                supportsGenerate: false,
            },
        ]);
    });

    it('treats gemini and gemma ids as generate even without the method list', () => {
        const actual = parseGoogleModelsList({
            models: [{ name: 'models/gemma-3-27b-it', supportedGenerationMethods: [] }],
        });
        expect(actual).toEqual([
            {
                modelId: 'gemma-3-27b-it',
                displayName: null,
                supportsGenerate: true,
            },
        ]);
    });

    it('returns null for invalid payloads so sync does not wipe the catalog', () => {
        expect(parseGoogleModelsList(null)).toBeNull();
        expect(parseGoogleModelsList({})).toBeNull();
        expect(parseGoogleModelsList([])).toBeNull();
        expect(parseGoogleModelsList({ models: 'nope' })).toBeNull();
    });

    it('returns an empty list for a valid empty models array', () => {
        expect(parseGoogleModelsList({ models: [] })).toEqual([]);
    });

    it('dedupes normalized ids', () => {
        const actual = parseGoogleModelsList({
            models: [
                { name: 'models/gemini-3.7-flash', displayName: 'First' },
                { name: 'gemini-3.7-flash', displayName: 'Second' },
            ],
        });
        expect(actual).toEqual([
            {
                modelId: 'gemini-3.7-flash',
                displayName: 'First',
                supportsGenerate: true,
            },
        ]);
    });

    it('skips non-string names so sync does not store [object Object]', () => {
        const actual = parseGoogleModelsList({
            models: [{ name: {} }, { name: 12 }, { name: 'models/gemini-3.7-flash' }],
        });
        expect(actual).toEqual([
            {
                modelId: 'gemini-3.7-flash',
                displayName: null,
                supportsGenerate: true,
            },
        ]);
    });

    it('skips non-object rows and empty names', () => {
        expect(
            parseGoogleModelsList({
                models: [null, 'x', { name: '' }, { name: 'models/' }, { displayName: 'Only' }],
            }),
        ).toEqual([]);
    });
});
