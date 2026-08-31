import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiKeyService } from '../../src/services/api-key.service';
import {
    CONTRACT_API_KEY_ID,
    CONTRACT_GEMINI_KEY,
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
        vi.restoreAllMocks();
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
        // Retry-After is 120s. CI under full-suite load is slower than 50ms; 2s still
        // proves we switched keys instead of sleeping.
        expect(Date.now() - startedAt).toBeLessThan(2_000);
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

    it('immediately retries reservation when an eligible key exists', async () => {
        const reserveNextApiKey = ApiKeyService.reserveNextApiKey.bind(ApiKeyService);
        let reservationCallCount = 0;
        vi.spyOn(ApiKeyService, 'reserveNextApiKey').mockImplementation(async (context, params) => {
            reservationCallCount += 1;
            if (reservationCallCount === 2) {
                throw new Error('simulated reservation race');
            }
            return reserveNextApiKey(context, params);
        });
        vi.spyOn(Math, 'random').mockReturnValue(1);
        const startedAt = Date.now();

        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            environment: {
                PROXY_RETRY_BASE_DELAY_MS: '250',
                PROXY_RETRY_MAX_DELAY_MS: '250',
            },
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'upstream unavailable' } }), {
                    status: 503,
                }),
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        expect(Date.now() - startedAt).toBeLessThan(100);
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

    it('returns the last error immediately when remaining keys are in hard cooldown', async () => {
        const startedAt = Date.now();
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            extraApiKeyCooldownUntil: new Date(Date.now() + 60_000).toISOString(),
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'upstream unavailable' } }), {
                    status: 503,
                }),
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(503);
        expect(originRequests).toHaveLength(1);
        expect(Date.now() - startedAt).toBeLessThan(100);
    });

    it('retries another key after an upstream timeout', async () => {
        let firstAttemptSignal: AbortSignal | undefined;
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            environment: { PROXY_UPSTREAM_TIMEOUT_MS: '1000' },
            originResponses: [
                async (request) => {
                    firstAttemptSignal = request.signal;
                    if (request.signal.aborted) {
                        throw request.signal.reason;
                    }
                    await new Promise<never>((_resolve, reject) => {
                        request.signal.addEventListener(
                            'abort',
                            () => reject(request.signal.reason),
                            { once: true },
                        );
                    });
                },
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        expect(firstAttemptSignal?.aborted).toBe(true);
    });

    it('does not wait on a cooled key after the client aborts the first attempt', async () => {
        const clientAbortController = new AbortController();

        const actualResponse = await invokeCore(
            PROXY_PATH,
            createProxyRequestInit(clientAbortController.signal),
            {
                extraApiKeys: true,
                extraApiKeyCooldownUntil: new Date(Date.now() + 60_000).toISOString(),
                originResponses: [
                    async () => {
                        clientAbortController.abort(
                            new DOMException('client aborted', 'AbortError'),
                        );
                        throw clientAbortController.signal.reason;
                    },
                    new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
                ],
            },
        );

        expect(originRequests.length).toBeLessThanOrEqual(1);
        expect(actualResponse.status).not.toBe(200);
    });

    it('skips key A for a 429 model and still uses key A for another model', async () => {
        const rateLimited = new Response(
            JSON.stringify({
                error: { status: 'RESOURCE_EXHAUSTED', message: 'quota exhausted' },
            }),
            {
                status: 429,
                headers: { 'content-type': 'application/json', 'Retry-After': '60' },
            },
        );
        const success = new Response(JSON.stringify({ candidates: [] }), { status: 200 });

        const firstResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [rateLimited, success],
        });
        expect(firstResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);

        const sameModelResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [success],
        });
        expect(sameModelResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY_2);

        const otherModelResponse = await invokeCore(
            '/gemini/v1beta/models/gemini-pro:generateContent',
            createProxyRequestInit(),
            {
                extraApiKeys: true,
                originResponses: [success],
            },
        );
        expect(otherModelResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY);
    });

    it('does not hard-lock key A after 503 so a later request can still use A', async () => {
        const unavailable = new Response(
            JSON.stringify({ error: { message: 'upstream unavailable' } }),
            {
                status: 503,
            },
        );
        const success = new Response(JSON.stringify({ candidates: [] }), { status: 200 });

        const firstResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [unavailable, success],
        });
        expect(firstResponse.status).toBe(200);

        const laterResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [success],
        });
        expect(laterResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY);
    });

    it('returns 429 immediately when every key is in hard cooldown', async () => {
        const cooledUntil = new Date(Date.now() + 60_000).toISOString();
        const startedAt = Date.now();
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            primaryApiKeyCooldownUntil: cooledUntil,
            extraApiKeyCooldownUntil: cooledUntil,
        });
        const body = (await actualResponse.json()) as {
            error?: string;
            gproxy_request_id?: string;
        };

        expect(actualResponse.status).toBe(429);
        expect(body.error).toBe('rate_limit');
        expect(body.gproxy_request_id).toEqual(expect.any(String));
        expect(originRequests).toHaveLength(0);
        expect(Date.now() - startedAt).toBeLessThan(100);
        expect(actualResponse.headers.get('Retry-After')).toBe('60');
    });

    it('makes only one origin call when PROXY_MAX_RETRIES is 0', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            environment: { PROXY_MAX_RETRIES: '0' },
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'quota exhausted' } }), {
                    status: 429,
                    headers: { 'Retry-After': '30' },
                }),
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(429);
        expect(originRequests).toHaveLength(1);
    });

    it('does not retry a passthrough POST after a network error', async () => {
        const actualResponse = await invokeCore(
            '/gemini/v1beta/models/gemini-flash:countTokens',
            createProxyRequestInit(),
            {
                extraApiKeys: true,
                originResponses: [
                    async () => {
                        throw new TypeError('fetch failed');
                    },
                    new Response(JSON.stringify({ totalTokens: 1 }), { status: 200 }),
                ],
            },
        );

        expect(originRequests).toHaveLength(1);
        expect(actualResponse.status).not.toBe(200);
    });
});
