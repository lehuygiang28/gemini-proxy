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

    it('returns an empty list for invalid payloads', () => {
        expect(parseGoogleModelsList(null)).toEqual([]);
        expect(parseGoogleModelsList({})).toEqual([]);
    });
});
