import { afterEach, describe, expect, it } from 'vitest';
import { CONTRACT_PROXY_KEY, invokeCore, originRequests, resetContractHarness } from './harness';

describe('proxy contract: health, query strip, and policy', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('GET /healthz returns 200 without a proxy key', async () => {
        const actual = await invokeCore('/healthz', { method: 'GET' });
        expect(actual.status).toBe(200);
        expect(await actual.json()).toEqual({ status: 'ok' });
        expect(originRequests).toHaveLength(0);
    });

    it('GET /readyz returns 200 when supabase succeeds', async () => {
        const actual = await invokeCore('/readyz', { method: 'GET' });
        expect(actual.status).toBe(200);
        expect(await actual.json()).toEqual({ status: 'ready' });
    });

    it('GET /readyz returns 503 when supabase throws', async () => {
        const actual = await invokeCore('/readyz', { method: 'GET' }, { supabaseThrows: true });
        expect(actual.status).toBe(503);
        expect(await actual.json()).toEqual({ status: 'not_ready' });
    });

    it('does not send query key to origin', async () => {
        const actual = await invokeCore(
            `/gemini/v1beta/models/gemini-flash:generateContent?key=${CONTRACT_PROXY_KEY}`,
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': CONTRACT_PROXY_KEY,
                    'content-type': 'application/json',
                },
                body: '{}',
            },
        );
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.url).not.toMatch(/[?&]key=/);
        expect(originRequests[0]!.url).not.toMatch(/[?&]api_key=/);
    });

    it('ignores x-gproxy-retry-max when the first origin call succeeds', async () => {
        const actual = await invokeCore(
            '/gemini/v1beta/models/gemini-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': CONTRACT_PROXY_KEY,
                    'x-gproxy-retry-max': '99',
                    'content-type': 'application/json',
                },
                body: '{}',
            },
            { extraApiKeys: true },
        );
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
    });

    it('does not retry HTTP 200 with zero completion tokens', async () => {
        const actual = await invokeCore(
            '/gemini/v1beta/models/gemini-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': CONTRACT_PROXY_KEY,
                    'x-gproxy-retry-on-zero-completion-tokens': 'true',
                    'x-gproxy-retry-max': '99',
                    'content-type': 'application/json',
                },
                body: '{}',
            },
            {
                extraApiKeys: true,
                originBody: {
                    candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'STOP' }],
                    usageMetadata: {
                        promptTokenCount: 5,
                        candidatesTokenCount: 0,
                        totalTokenCount: 5,
                    },
                },
            },
        );
        expect(actual.status).toBe(200);
        expect(originRequests).toHaveLength(1);
    });
});
