import { describe, expect, it } from 'vitest';
import { isModelsListRequest } from './is-models-list-request';

describe('isModelsListRequest', () => {
    it('detects Gemini GET models list', () => {
        expect(
            isModelsListRequest({
                method: 'GET',
                apiFormat: 'gemini',
                urlToProxy: 'https://origin.test/v1beta/models',
            }),
        ).toBe(true);
    });

    it('rejects Gemini generateContent', () => {
        expect(
            isModelsListRequest({
                method: 'GET',
                apiFormat: 'gemini',
                urlToProxy: 'https://origin.test/v1beta/models/gemini-flash:generateContent',
            }),
        ).toBe(false);
    });

    it('detects OpenAI GET models', () => {
        expect(
            isModelsListRequest({
                method: 'GET',
                apiFormat: 'openai',
                urlToProxy: 'https://origin.test/openai/models',
            }),
        ).toBe(true);
    });

    it('rejects POST', () => {
        expect(
            isModelsListRequest({
                method: 'POST',
                apiFormat: 'openai',
                urlToProxy: 'https://origin.test/openai/models',
            }),
        ).toBe(false);
    });
});
