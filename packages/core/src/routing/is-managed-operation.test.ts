import { describe, expect, it } from 'vitest';
import { isManagedOperation } from './is-managed-operation';

describe('isManagedOperation', () => {
    it('treats Gemini generateContent as managed', () => {
        expect(
            isManagedOperation({
                apiFormat: 'gemini',
                path: '/v1/models/gemini-flash:generateContent',
            }),
        ).toBe(true);
    });

    it('treats Gemini streamGenerateContent as managed', () => {
        expect(
            isManagedOperation({
                apiFormat: 'gemini',
                path: '/v1beta/models/gemini-flash:streamGenerateContent',
            }),
        ).toBe(true);
    });

    it('treats Gemini countTokens as passthrough', () => {
        expect(
            isManagedOperation({
                apiFormat: 'gemini',
                path: '/v1beta/models/gemini-flash:countTokens',
            }),
        ).toBe(false);
    });

    it('treats OpenAI chat completions as managed', () => {
        expect(
            isManagedOperation({
                apiFormat: 'openai',
                path: '/v1/chat/completions',
            }),
        ).toBe(true);
    });
});
