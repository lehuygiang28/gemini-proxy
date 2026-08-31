import { afterEach, describe, expect, it } from 'vitest';
import {
    CONTRACT_PROXY_KEY,
    CONTRACT_PROXY_KEY_ID,
    flushWaitUntil,
    invokeCore,
    originRequests,
    reconciliationInserts,
    requestLogInserts,
    resetContractHarness,
    rpcCalls,
} from './harness';

const PROXY_PATH = '/gemini/v1beta/models/gemini-2.5-flash:generateContent';

function createProxyRequestInit(): RequestInit {
    return {
        method: 'POST',
        headers: {
            'x-goog-api-key': CONTRACT_PROXY_KEY,
            'content-type': 'application/json',
        },
        body: '{}',
    };
}

describe('proxy contract: finalize reliability', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('returns origin 200 after finalize fails twice then succeeds, without a reconciliation row', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            finalizeResults: ['error', 'error', 'ok'],
        });
        await actualResponse.text();
        await flushWaitUntil();

        expect(actualResponse.status).toBe(200);
        expect(rpcCalls.filter((call) => call.name === 'finalize_proxy_request')).toHaveLength(3);
        expect(reconciliationInserts).toHaveLength(0);
        expect(rpcCalls.some((call) => call.name === 'settle_proxy_request')).toBe(false);
    });

    it('keeps origin 200 when finalize always fails, inserts reconciliation, and fail-closes the next admit', async () => {
        const firstResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            finalizeResults: ['error', 'error', 'error'],
        });
        await firstResponse.text();
        await flushWaitUntil();

        expect(firstResponse.status).toBe(200);
        expect(rpcCalls.filter((call) => call.name === 'finalize_proxy_request')).toHaveLength(3);
        expect(reconciliationInserts).toEqual([
            expect.objectContaining({
                request_id: expect.any(String),
                proxy_key_id: expect.any(String),
                user_id: expect.any(String),
                last_error: expect.any(String),
            }),
        ]);

        const secondResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            admitResults: [{ ok: false, code: 'tokens' }],
        });
        expect(secondResponse.status).toBe(429);
        expect(await secondResponse.json()).toEqual(
            expect.objectContaining({ error: 'policy_denied', code: 'tokens' }),
        );
        expect(originRequests).toHaveLength(0);
    });

    it('still attempts finalize after origin 429 exhaust and records reconciliation on persist failure', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
                    status: 429,
                    headers: { 'content-type': 'application/json' },
                }),
                new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
                    status: 429,
                    headers: { 'content-type': 'application/json' },
                }),
            ],
            finalizeResults: ['error', 'error', 'error'],
        });
        await actualResponse.text();
        await flushWaitUntil();

        expect(actualResponse.status).toBe(429);
        expect(rpcCalls.filter((call) => call.name === 'finalize_proxy_request')).toHaveLength(3);
        expect(reconciliationInserts).toHaveLength(1);
    });

    it('writes a request_logs stub when finalize exhausts so dashboard retry can replay', async () => {
        const firstResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            finalizeResults: ['error', 'error', 'error'],
            admitResults: [
                {
                    ok: true,
                    reserved_tokens: 8192,
                    reserved_usd: 0.01,
                    window_starts: {
                        minute: '2026-08-31T12:28:00.000Z',
                        day: '2026-08-31T00:00:00.000Z',
                        month: '2026-08-01T00:00:00.000Z',
                    },
                },
            ],
        });
        await firstResponse.text();
        await flushWaitUntil();

        expect(firstResponse.status).toBe(200);
        expect(reconciliationInserts).toHaveLength(1);
        expect(requestLogInserts).toEqual([
            expect.objectContaining({
                request_id: expect.any(String),
                proxy_key_id: CONTRACT_PROXY_KEY_ID,
                user_id: expect.any(String),
                is_successful: true,
                performance_metrics: expect.objectContaining({
                    policy_reserved_tokens: 8192,
                    policy_reserved_usd: 0.01,
                    policy_minute_start: '2026-08-31T12:28:00.000Z',
                    policy_day_start: '2026-08-31T00:00:00.000Z',
                    policy_month_start: '2026-08-01T00:00:00.000Z',
                }),
            }),
        ]);
    });
});
