import { describe, expect, it } from 'vitest';
import { buildOriginUrl } from './build-origin-url';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/';
const OPENAI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/';

describe('buildOriginUrl', () => {
    it('prefixes v1beta for /v1/models Gemini paths', () => {
        const actual = buildOriginUrl({
            apiFormat: 'gemini',
            path: '/v1/models/gemini-flash:generateContent',
            rawSearch: '',
            geminiBaseUrl: GEMINI_BASE,
            openaiBaseUrl: OPENAI_BASE,
        });
        expect(actual).toBe(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent',
        );
    });

    it('prefixes v1beta for GET /v1/models list', () => {
        const actual = buildOriginUrl({
            apiFormat: 'gemini',
            path: '/v1/models',
            rawSearch: '',
            geminiBaseUrl: GEMINI_BASE,
            openaiBaseUrl: OPENAI_BASE,
        });
        expect(actual).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    });

    it('keeps v1beta remainder after /v1/v1beta normalize', () => {
        const actual = buildOriginUrl({
            apiFormat: 'gemini',
            path: '/v1/v1beta/models/gemini-flash:generateContent',
            rawSearch: '',
            geminiBaseUrl: GEMINI_BASE,
            openaiBaseUrl: OPENAI_BASE,
        });
        expect(actual).toBe(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent',
        );
    });

    it('prefixes v1beta after collapsing /v1/v1/models', () => {
        const actual = buildOriginUrl({
            apiFormat: 'gemini',
            path: '/v1/v1/models/gemini-flash:generateContent',
            rawSearch: '',
            geminiBaseUrl: GEMINI_BASE,
            openaiBaseUrl: OPENAI_BASE,
        });
        expect(actual).toBe(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent',
        );
    });

    it('appends OpenAI remainder after /v1', () => {
        const actual = buildOriginUrl({
            apiFormat: 'openai',
            path: '/v1/chat/completions',
            rawSearch: '',
            geminiBaseUrl: GEMINI_BASE,
            openaiBaseUrl: OPENAI_BASE,
        });
        expect(actual).toBe(
            'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        );
    });

    it('keeps repeated query parameters and strips key', () => {
        const actual = buildOriginUrl({
            apiFormat: 'gemini',
            path: '/v1/models/gemini-flash:generateContent',
            rawSearch: '?alt=sse&alt=json&key=secret&foo=1',
            geminiBaseUrl: GEMINI_BASE,
            openaiBaseUrl: OPENAI_BASE,
        });
        expect(actual).toBe(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent?alt=sse&alt=json&foo=1',
        );
    });
});
