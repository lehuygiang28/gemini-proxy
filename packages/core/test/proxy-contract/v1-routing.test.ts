import { afterEach, describe, expect, it } from 'vitest';
import { CONTRACT_PROXY_KEY, invokeCore, originRequests, resetContractHarness } from './harness';

describe('proxy contract: /v1 routing', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('routes POST /v1/models generateContent with goog header to Gemini origin', async () => {
        const actual = await invokeCore('/v1/models/gemini-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': CONTRACT_PROXY_KEY,
                'content-type': 'application/json',
            },
            body: '{}',
        });
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(new URL(originRequests[0]!.url).pathname).toBe(
            '/v1beta/models/gemini-flash:generateContent',
        );
        expect(originRequests[0]!.headers.get('x-goog-api-key')).toBeTruthy();
    });

    it('routes POST /v1/chat/completions with Bearer to OpenAI origin', async () => {
        const actual = await invokeCore('/v1/chat/completions', {
            method: 'POST',
            headers: {
                authorization: `Bearer ${CONTRACT_PROXY_KEY}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gemini-flash',
                messages: [{ role: 'user', content: 'ping' }],
            }),
        });
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.url).toBe('https://origin.test/openai/chat/completions');
        expect(originRequests[0]!.headers.get('authorization')?.startsWith('Bearer ')).toBe(true);
    });

    it('normalizes /v1/v1beta/models onto the Gemini v1beta origin path', async () => {
        const actual = await invokeCore('/v1/v1beta/models/gemini-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': CONTRACT_PROXY_KEY,
                'content-type': 'application/json',
            },
            body: '{}',
        });
        expect(actual.status).toBe(200);
        expect(new URL(originRequests[0]!.url).pathname).toBe(
            '/v1beta/models/gemini-flash:generateContent',
        );
    });

    it('rejects both goog and Bearer on /v1 with 400', async () => {
        const actual = await invokeCore('/v1/models/gemini-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': CONTRACT_PROXY_KEY,
                authorization: `Bearer ${CONTRACT_PROXY_KEY}`,
                'content-type': 'application/json',
            },
            body: '{}',
        });
        expect(actual.status).toBe(400);
        expect(originRequests).toHaveLength(0);
    });

    it('rejects query key only on /v1 with 401', async () => {
        const actual = await invokeCore(
            `/v1/models/gemini-flash:generateContent?key=${CONTRACT_PROXY_KEY}`,
            {
                method: 'POST',
                body: '{}',
            },
        );
        expect(actual.status).toBe(401);
        expect(originRequests).toHaveLength(0);
    });

    it('keeps legacy /gemini paths working', async () => {
        const actual = await invokeCore('/gemini/v1beta/models/gemini-flash:generateContent', {
            method: 'POST',
            headers: {
                'x-goog-api-key': CONTRACT_PROXY_KEY,
                'content-type': 'application/json',
            },
            body: '{}',
        });
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(new URL(originRequests[0]!.url).pathname).toBe(
            '/v1beta/models/gemini-flash:generateContent',
        );
    });
});
