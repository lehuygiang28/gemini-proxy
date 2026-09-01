import { describe, expect, it } from 'vitest';
import { injectModelsListResponse } from './inject-models-list-response';

const flashCombo = {
    id: 'c1',
    name: 'flash-combo',
    isActive: true,
    strategy: null as const,
    stickAfterSuccesses: null,
    members: ['gemini-3.7-flash', 'gemini-3.5-flash'],
};

describe('injectModelsListResponse', () => {
    it('adds the combo to an OpenAI models list', () => {
        const actual = injectModelsListResponse({
            apiFormat: 'openai',
            originBodyText: JSON.stringify({ data: [{ id: 'gemini-3.7-flash' }] }),
            combos: [flashCombo],
            catalogIds: [],
            builtinIds: ['gemini-3.7-flash'],
            allowedModels: null,
        });
        const parsed = JSON.parse(actual) as {
            data: Array<{ id: string; object: string; owned_by: string; description?: string }>;
        };
        expect(parsed.data.find((row) => row.id === 'flash-combo')).toEqual({
            id: 'flash-combo',
            object: 'model',
            owned_by: 'gproxy-combo',
            description: 'Combo: gemini-3.7-flash → gemini-3.5-flash',
        });
        expect(parsed.data.some((row) => row.id === 'gemini-3.7-flash')).toBe(true);
    });

    it('replaces a colliding Gemini list row with the combo', () => {
        const actual = injectModelsListResponse({
            apiFormat: 'gemini',
            originBodyText: JSON.stringify({
                models: [{ name: 'models/gemini-3.7-flash', displayName: 'Flash' }],
            }),
            combos: [
                {
                    ...flashCombo,
                    name: 'gemini-3.7-flash',
                    members: ['gemini-3.5-flash-lite'],
                },
            ],
            catalogIds: [],
            builtinIds: ['gemini-3.7-flash'],
            allowedModels: null,
        });
        const parsed = JSON.parse(actual) as {
            models: Array<{ name: string; description?: string }>;
        };
        const matches = parsed.models.filter((row) => row.name === 'models/gemini-3.7-flash');
        expect(matches).toHaveLength(1);
        expect(matches[0]?.description).toBe('Combo: gemini-3.5-flash-lite');
    });

    it('returns origin body when JSON is invalid', () => {
        const originBodyText = 'not-json';
        const actual = injectModelsListResponse({
            apiFormat: 'openai',
            originBodyText,
            combos: [flashCombo],
            catalogIds: [],
            builtinIds: [],
            allowedModels: null,
        });
        expect(actual).toBe(originBodyText);
    });

    it('returns origin body when the payload is a JSON array', () => {
        const originBodyText = '[]';
        expect(
            injectModelsListResponse({
                apiFormat: 'gemini',
                originBodyText,
                combos: [flashCombo],
                catalogIds: [],
                builtinIds: [],
                allowedModels: null,
            }),
        ).toBe(originBodyText);
    });

    it('allowlists injected OpenAI combos without leaking members', () => {
        const actual = injectModelsListResponse({
            apiFormat: 'openai',
            originBodyText: JSON.stringify({
                data: [{ id: 'gemini-3.7-flash', object: 'model' }],
            }),
            combos: [flashCombo],
            catalogIds: [],
            builtinIds: ['gemini-3.7-flash'],
            allowedModels: ['flash-combo'],
        });
        const parsed = JSON.parse(actual) as { data: Array<{ id: string }> };
        expect(parsed.data.map((row) => row.id)).toEqual(['flash-combo']);
    });
});
