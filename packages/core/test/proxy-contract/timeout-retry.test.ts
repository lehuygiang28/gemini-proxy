import { afterEach, describe, expect, it } from 'vitest';
import {
    CONTRACT_API_KEY_ID,
    CONTRACT_GEMINI_KEY_2,
    CONTRACT_PROXY_KEY,
    invokeCore,
    originRequests,
    resetContractHarness,
    rpcCalls,
} from './harness';

const PROXY_PATH = '/gemini/v1beta/models/gemini-flash:generateContent';

function createProxyRequestInit(signal?: AbortSignal): RequestInit {
    return {
        method: 'POST',
        headers: {
            'x-goog-api-key': CONTRACT_PROXY_KEY,
            'content-type': 'application/json',
        },
        body: '{}',
        signal,
    };
}

describe('proxy contract: timeout and retry', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('immediately uses key B after key A receives 429 Retry-After', async () => {
        const startedAt = Date.now();
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [
                new Response(
                    JSON.stringify({
                        error: {
                            code: 429,
                            status: 'RESOURCE_EXHAUSTED',
                            message: 'quota exhausted',
                        },
                    }),
                    {
                        status: 429,
                        headers: {
                            'content-type': 'application/json',
                            'Retry-After': '120',
                        },
                    },
                ),
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        expect(Date.now() - startedAt).toBeLessThan(50);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY_2);
        expect(rpcCalls).toContainEqual({
            name: 'record_api_key_failure',
            args: expect.objectContaining({
                p_id: CONTRACT_API_KEY_ID,
                p_disable: false,
                p_cooldown_until: expect.any(String),
            }),
        });
    });

    it('disables key A after 401 then uses key B', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'invalid key' } }), {
                    status: 401,
                }),
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY_2);
        expect(rpcCalls).toContainEqual({
            name: 'record_api_key_failure',
            args: expect.objectContaining({
                p_id: CONTRACT_API_KEY_ID,
                p_disable: true,
            }),
        });
    });

    it('does not call a second key after 400', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'bad request' } }), {
                    status: 400,
                }),
            ],
        });

        expect(actualResponse.status).toBe(400);
        expect(originRequests).toHaveLength(1);
        expect(
            rpcCalls.some(
                (call) =>
                    call.name === 'record_api_key_failure' &&
                    (call.args as { p_disable?: boolean }).p_disable === true,
            ),
        ).toBe(false);
    });

    it('retries another key after an upstream timeout', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            environment: { PROXY_UPSTREAM_TIMEOUT_MS: '50' },
            originResponses: [
                async () => {
                    throw new DOMException('The operation timed out.', 'TimeoutError');
                },
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
    });

    it('does not retry when the client aborts', async () => {
        const clientAbortController = new AbortController();
        clientAbortController.abort(new DOMException('client aborted', 'AbortError'));

        const actualResponse = await invokeCore(
            PROXY_PATH,
            createProxyRequestInit(clientAbortController.signal),
            {
                extraApiKeys: true,
                originResponses: [
                    async (request) => {
                        if (request.signal.aborted) {
                            throw request.signal.reason;
                        }
                        return new Response(JSON.stringify({ error: { message: 'aborted' } }), {
                            status: 500,
                        });
                    },
                    new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
                ],
            },
        );

        expect(originRequests.length).toBeLessThanOrEqual(1);
        expect(actualResponse.status).not.toBe(200);
    });
});
