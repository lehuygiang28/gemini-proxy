import { afterEach, describe, expect, it } from 'vitest';
import {
    CONTRACT_PROXY_KEY,
    CONTRACT_PROXY_KEY_ID,
    flushWaitUntil,
    invokeCore,
    originRequests,
    resetContractHarness,
    rpcCalls,
} from './harness';

const PROXY_PATH = '/gemini/v1beta/models/gemini-2.5-flash:generateContent';

function createProxyRequestInit(body = '{}'): RequestInit {
    return {
        method: 'POST',
        headers: {
            'x-goog-api-key': CONTRACT_PROXY_KEY,
            'content-type': 'application/json',
            'content-length': String(new TextEncoder().encode(body).byteLength),
        },
        body,
    };
}

describe('proxy contract: proxy-key policy', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('returns rpm 429 on a second request without fetching origin', async () => {
        const options = {
            admitResults: [
                { ok: true, reserved_tokens: 8192, reserved_usd: 0 },
                { ok: false, code: 'rpm' },
            ],
        };

        const firstResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), options);
        await firstResponse.text();
        expect(firstResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);

        const secondResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), options);

        expect(secondResponse.status).toBe(429);
        expect(await secondResponse.json()).toEqual(
            expect.objectContaining({ error: 'policy_denied', code: 'rpm' }),
        );
        expect(originRequests).toHaveLength(0);
    });

    it('allows two requests when all limits are null', async () => {
        const proxyKey = {
            id: '22222222-2222-2222-2222-222222222222',
            user_id: '11111111-1111-1111-1111-111111111111',
            name: 'unlimited-contract-proxy',
            is_active: true,
            deleted_at: null,
            max_output_tokens: null,
            max_request_body_bytes: null,
        };

        const firstResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), { proxyKey });
        await firstResponse.text();
        expect(originRequests).toHaveLength(1);
        const secondResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), { proxyKey });
        await secondResponse.text();

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
    });

    it('returns model_denied 400 without fetching origin', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            admitResults: [{ ok: false, code: 'model_denied' }],
        });

        expect(actualResponse.status).toBe(400);
        expect(await actualResponse.json()).toEqual(
            expect.objectContaining({ error: 'policy_denied', code: 'model_denied' }),
        );
        expect(originRequests).toHaveLength(0);
    });

    it('does not deny peeked max output tokens as a proxy-key cap', async () => {
        const body = JSON.stringify({ generationConfig: { maxOutputTokens: 257 } });
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(body), {
            proxyKey: {
                id: '22222222-2222-2222-2222-222222222222',
                user_id: '11111111-1111-1111-1111-111111111111',
                name: 'capped-contract-proxy',
                is_active: true,
                deleted_at: null,
                max_output_tokens: 256,
                max_request_body_bytes: null,
            },
        });
        await actualResponse.text();

        expect(actualResponse.status).toBe(200);
        expect(rpcCalls.some((call) => call.name === 'admit_proxy_request')).toBe(true);
        expect(originRequests).toHaveLength(1);
    });

    it('does not deny oversized content-length as a proxy-key cap', async () => {
        const requestInit = createProxyRequestInit('{}');
        requestInit.headers = {
            ...requestInit.headers,
            'content-length': '999',
        };
        const actualResponse = await invokeCore(PROXY_PATH, requestInit, {
            proxyKey: {
                id: '22222222-2222-2222-2222-222222222222',
                user_id: '11111111-1111-1111-1111-111111111111',
                name: 'body-capped-contract-proxy',
                is_active: true,
                deleted_at: null,
                max_output_tokens: null,
                max_request_body_bytes: 10,
            },
        });
        await actualResponse.text();

        expect(actualResponse.status).toBe(200);
        expect(rpcCalls.some((call) => call.name === 'admit_proxy_request')).toBe(true);
        expect(originRequests).toHaveLength(1);
    });

    it('returns tokens 429 when the day token guardrail denies admit', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            admitResults: [{ ok: false, code: 'tokens' }],
        });

        expect(actualResponse.status).toBe(429);
        expect(await actualResponse.json()).toEqual(
            expect.objectContaining({ error: 'policy_denied', code: 'tokens' }),
        );
        expect(originRequests).toHaveLength(0);
    });

    it('skips model allowlist for Gemini passthrough and estimates zero tokens', async () => {
        const actualResponse = await invokeCore(
            '/gemini/v1beta/models/gemini-2.5-flash:countTokens',
            createProxyRequestInit(),
        );
        await actualResponse.text();

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(rpcCalls).toContainEqual({
            name: 'admit_proxy_request',
            args: expect.objectContaining({
                p_managed: false,
                p_estimated_tokens: 0,
                p_estimated_usd: 0,
            }),
        });
    });

    it('settles a successful request with parsed actual usage', async () => {
        const windowStarts = {
            minute: '2026-08-31T12:22:00.000Z',
            day: '2026-08-31T00:00:00.000Z',
            month: '2026-08-01T00:00:00.000Z',
        };
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            admitResults: [
                {
                    ok: true,
                    reserved_tokens: 256,
                    reserved_usd: 0.001,
                    window_starts: windowStarts,
                },
            ],
            originBody: {
                candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }],
                usageMetadata: {
                    promptTokenCount: 5,
                    candidatesTokenCount: 7,
                    totalTokenCount: 12,
                },
            },
        });
        await actualResponse.text();
        await flushWaitUntil();

        expect(rpcCalls).toContainEqual({
            name: 'finalize_proxy_request',
            args: expect.objectContaining({
                p_proxy_key_id: CONTRACT_PROXY_KEY_ID,
                p_request_id: expect.any(String),
                p_reserved_tokens: 256,
                p_reserved_usd: 0.001,
                p_actual_tokens: 12,
                p_actual_usd: expect.any(Number),
                p_minute_start: windowStarts.minute,
                p_day_start: windowStarts.day,
                p_month_start: windowStarts.month,
            }),
        });
    });

    it('settles with zero actual usage after origin 502 retries are exhausted', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            admitResults: [{ ok: true, reserved_tokens: 128, reserved_usd: 0.0005 }],
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'bad gateway' } }), {
                    status: 502,
                    headers: { 'content-type': 'application/json' },
                }),
            ],
        });
        await actualResponse.text();
        await flushWaitUntil();

        expect(actualResponse.status).toBe(502);
        expect(rpcCalls).toContainEqual({
            name: 'finalize_proxy_request',
            args: expect.objectContaining({
                p_reserved_tokens: 128,
                p_reserved_usd: 0.0005,
                p_actual_tokens: 0,
                p_actual_usd: 0,
            }),
        });
    });

    it('settles an admitted request when provider key selection throws', async () => {
        const windowStarts = {
            minute: '2026-08-31T12:28:00.000Z',
            day: '2026-08-31T00:00:00.000Z',
            month: '2026-08-01T00:00:00.000Z',
        };
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            noApiKeys: true,
            admitResults: [
                {
                    ok: true,
                    reserved_tokens: 256,
                    reserved_usd: 0.001,
                    window_starts: windowStarts,
                },
            ],
        });

        expect(actualResponse.status).toBe(401);
        expect(await actualResponse.json()).toEqual(
            expect.objectContaining({ error: 'invalid_key', message: 'No API key found' }),
        );
        expect(originRequests).toHaveLength(0);
        expect(rpcCalls.some((call) => call.name === 'admit_proxy_request')).toBe(true);

        await flushWaitUntil();

        expect(rpcCalls).toContainEqual({
            name: 'finalize_proxy_request',
            args: expect.objectContaining({
                p_proxy_key_id: CONTRACT_PROXY_KEY_ID,
                p_request_id: expect.any(String),
                p_reserved_tokens: 256,
                p_reserved_usd: 0.001,
                p_actual_tokens: 0,
                p_actual_usd: 0,
                p_minute_start: windowStarts.minute,
                p_day_start: windowStarts.day,
                p_month_start: windowStarts.month,
            }),
        });
        expect(rpcCalls.filter((call) => call.name === 'finalize_proxy_request')).toHaveLength(1);
    });

    it('returns invalid_timezone 400 instead of 500 when admit rejects the stored zone', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            admitResults: [{ ok: false, code: 'invalid_timezone' }],
        });

        expect(actualResponse.status).toBe(400);
        expect(await actualResponse.json()).toEqual(
            expect.objectContaining({ error: 'policy_denied', code: 'invalid_timezone' }),
        );
        expect(originRequests).toHaveLength(0);
    });
});
