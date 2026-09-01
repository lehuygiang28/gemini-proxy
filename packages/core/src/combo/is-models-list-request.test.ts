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

    it('rejects an invalid URL and a Gemini model-detail GET', () => {
        expect(
            isModelsListRequest({
                method: 'GET',
                apiFormat: 'gemini',
                urlToProxy: 'not a url',
            }),
        ).toBe(false);
        expect(
            isModelsListRequest({
                method: 'GET',
                apiFormat: 'gemini',
                urlToProxy: 'https://origin.test/v1beta/models/gemini-3.7-flash',
            }),
        ).toBe(false);
    });

    it('treats a trailing slash as a list request', () => {
        expect(
            isModelsListRequest({
                method: 'GET',
                apiFormat: 'openai',
                urlToProxy: 'https://origin.test/openai/models/',
            }),
        ).toBe(true);
    });
});
