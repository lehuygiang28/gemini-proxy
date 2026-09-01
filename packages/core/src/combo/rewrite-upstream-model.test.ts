import { describe, expect, it } from 'vitest';
import { rewriteUpstreamModel } from './rewrite-upstream-model';

describe('rewriteUpstreamModel', () => {
    it('rewrites the Gemini model path segment and keeps the query string', async () => {
        const inputUrl =
            'https://origin.test/v1beta/models/flash-combo:generateContent?alt=sse';
        const inputRequest = new Request(inputUrl, { method: 'POST', body: '{}' });
        const actual = await rewriteUpstreamModel({
            request: inputRequest,
            urlToProxy: inputUrl,
            apiFormat: 'gemini',
            fromModel: 'flash-combo',
            toModel: 'gemini-3.7-flash',
        });
        expect(new URL(actual.urlToProxy).pathname).toBe(
            '/v1beta/models/gemini-3.7-flash:generateContent',
        );
        expect(new URL(actual.urlToProxy).search).toBe('?alt=sse');
        expect(new URL(actual.request.url).pathname).toBe(
            '/v1beta/models/gemini-3.7-flash:generateContent',
        );
        expect(actual.request.method).toBe('POST');
        await expect(actual.request.text()).resolves.toBe('{}');
    });

    it('can rewrite the same Gemini request twice without locking the body', async () => {
        const inputUrl = 'https://origin.test/v1beta/models/flash-combo:generateContent';
        const inputRequest = new Request(inputUrl, { method: 'POST', body: '{}' });
        const first = await rewriteUpstreamModel({
            request: inputRequest,
            urlToProxy: inputUrl,
            apiFormat: 'gemini',
            fromModel: 'flash-combo',
            toModel: 'gemini-3.7-flash',
        });
        const second = await rewriteUpstreamModel({
            request: inputRequest,
            urlToProxy: inputUrl,
            apiFormat: 'gemini',
            fromModel: 'flash-combo',
            toModel: 'gemini-3.5-flash',
        });
        await expect(first.request.text()).resolves.toBe('{}');
        await expect(second.request.text()).resolves.toBe('{}');
        expect(new URL(second.request.url).pathname).toBe(
            '/v1beta/models/gemini-3.5-flash:generateContent',
        );
    });

    it('returns the same URLs when fromModel equals toModel', async () => {
        const inputUrl = 'https://origin.test/v1beta/models/gemini-3.7-flash:generateContent';
        const inputRequest = new Request(inputUrl, { method: 'POST' });
        const actual = await rewriteUpstreamModel({
            request: inputRequest,
            urlToProxy: inputUrl,
            apiFormat: 'gemini',
            fromModel: 'gemini-3.7-flash',
            toModel: 'gemini-3.7-flash',
        });
        expect(actual.urlToProxy).toBe(inputUrl);
        expect(new URL(actual.request.url).pathname).toBe(
            '/v1beta/models/gemini-3.7-flash:generateContent',
        );
        expect(actual.request.method).toBe('POST');
    });

    it('replaces OpenAI body.model and preserves stream and messages', async () => {
        const inputBody = {
            model: 'flash-combo',
            stream: true,
            messages: [{ role: 'user', content: 'ping' }],
        };
        const inputRequest = new Request('https://origin.test/openai/chat/completions', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(inputBody),
        });
        const actual = await rewriteUpstreamModel({
            request: inputRequest,
            urlToProxy: 'https://origin.test/openai/chat/completions',
            apiFormat: 'openai',
            fromModel: 'flash-combo',
            toModel: 'gemini-3.7-flash',
        });
        expect(actual.urlToProxy).toBe('https://origin.test/openai/chat/completions');
        expect(actual.request.headers.get('content-type')).toBe('application/json');
        const actualBody = (await actual.request.json()) as typeof inputBody;
        expect(actualBody).toEqual({
            ...inputBody,
            model: 'gemini-3.7-flash',
        });
    });
});
