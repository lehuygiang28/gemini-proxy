import { afterEach, describe, expect, it } from 'vitest';
import {
    CONTRACT_API_KEY_ID,
    CONTRACT_GEMINI_KEY,
    CONTRACT_GEMINI_KEY_2,
    CONTRACT_PROXY_KEY,
    CONTRACT_PROXY_KEY_ID,
    CONTRACT_USER_ID,
    flushWaitUntil,
    invokeCore,
    originRequests,
    resetContractHarness,
    rpcCalls,
} from './harness';

const FLASH_COMBO_ID = '55555555-5555-5555-5555-555555555555';
const COMBO_PATH = '/gemini/v1beta/models/flash-combo:generateContent';
const MEMBER_0 = 'gemini-3.7-flash';
const MEMBER_1 = 'gemini-3.5-flash';

const FLASH_COMBO = {
    id: FLASH_COMBO_ID,
    name: 'flash-combo',
    members: [MEMBER_0, MEMBER_1],
};

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

function quotaExhausted(): Response {
    return new Response(
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
    );
}

function originOk(): Response {
    return new Response(JSON.stringify({ candidates: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });
}

describe('proxy contract: model combo', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('falls through to member[1] after 429 on every key for member[0]', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            environment: { PROXY_MAX_RETRIES: '0' },
            seedCombos: [FLASH_COMBO],
            originResponses: [quotaExhausted(), quotaExhausted(), originOk()],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(3);
        expect(new URL(originRequests[0]!.url).pathname).toContain(`/models/${MEMBER_0}`);
        expect(originRequests[0]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY);
        expect(new URL(originRequests[1]!.url).pathname).toContain(`/models/${MEMBER_0}`);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY_2);
        expect(new URL(originRequests[2]!.url).pathname).toContain(`/models/${MEMBER_1}`);
        expect(originRequests[2]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY);
        expect(rpcCalls).toContainEqual({
            name: 'admit_proxy_request',
            args: expect.objectContaining({ p_model: 'flash-combo' }),
        });
        expect(rpcCalls).toContainEqual({
            name: 'record_api_key_failure',
            args: expect.objectContaining({
                p_id: CONTRACT_API_KEY_ID,
                p_canonical_model: MEMBER_0,
            }),
        });
    });

    it('on 400 for member[0] does not try the second key on member[0]', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            seedCombos: [FLASH_COMBO],
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'bad request' } }), {
                    status: 400,
                    headers: { 'content-type': 'application/json' },
                }),
                originOk(),
            ],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        expect(new URL(originRequests[0]!.url).pathname).toContain(`/models/${MEMBER_0}`);
        expect(new URL(originRequests[1]!.url).pathname).toContain(`/models/${MEMBER_1}`);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY);
    });

    it('allowlist flash-combo denies direct gemini-3.7-flash', async () => {
        const actualResponse = await invokeCore(
            `/gemini/v1beta/models/${MEMBER_0}:generateContent`,
            createProxyRequestInit(),
            {
                seedCombos: [FLASH_COMBO],
                proxyKey: {
                    id: CONTRACT_PROXY_KEY_ID,
                    user_id: CONTRACT_USER_ID,
                    name: 'allowlist-combo',
                    is_active: true,
                    deleted_at: null,
                    max_output_tokens: null,
                    max_request_body_bytes: null,
                    allowed_models: ['flash-combo'],
                },
            },
        );

        expect(actualResponse.status).toBe(400);
        expect(await actualResponse.json()).toEqual(
            expect.objectContaining({ error: 'policy_denied', code: 'model_denied' }),
        );
        expect(originRequests).toHaveLength(0);
    });

    it('non-combo still respects PROXY_MAX_RETRIES=0', async () => {
        const actualResponse = await invokeCore(
            '/gemini/v1beta/models/gemini-flash:generateContent',
            createProxyRequestInit(),
            {
                extraApiKeys: true,
                environment: { PROXY_MAX_RETRIES: '0' },
                originResponses: [quotaExhausted(), originOk()],
            },
        );

        expect(actualResponse.status).toBe(429);
        expect(originRequests).toHaveLength(1);
    });

    it('writes requested_model on finalize usage', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            seedCombos: [FLASH_COMBO],
            originResponses: [originOk()],
        });
        await actualResponse.text();
        await flushWaitUntil();

        expect(actualResponse.status).toBe(200);
        expect(new URL(originRequests[0]!.url).pathname).toContain(`/models/${MEMBER_0}`);
        expect(rpcCalls).toContainEqual({
            name: 'finalize_proxy_request',
            args: expect.objectContaining({
                p_usage: expect.objectContaining({
                    requested_model: 'flash-combo',
                    combo_id: FLASH_COMBO_ID,
                    combo_name: 'flash-combo',
                    model: MEMBER_0,
                }),
            }),
        });
    });

    it('injects combos into GET /v1/models after the origin list', async () => {
        const actualResponse = await invokeCore(
            '/v1/models',
            {
                method: 'GET',
                headers: { 'x-goog-api-key': CONTRACT_PROXY_KEY },
            },
            {
                seedCombos: [FLASH_COMBO],
                originBody: { models: [{ name: 'models/gemini-3.7-flash' }] },
            },
        );
        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(new URL(originRequests[0]!.url).pathname).toBe('/v1beta/models');
        const body = (await actualResponse.json()) as {
            models: Array<{ name: string; description?: string }>;
        };
        expect(body.models.some((row) => row.name === 'models/flash-combo')).toBe(true);
        expect(body.models.some((row) => row.name === 'models/gemini-3.7-flash')).toBe(true);
    });

    it('rewrites OpenAI body.model to the combo member', async () => {
        const actualResponse = await invokeCore(
            '/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${CONTRACT_PROXY_KEY}`,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'flash-combo',
                    messages: [{ role: 'user', content: 'ping' }],
                }),
            },
            {
                extraApiKeys: true,
                seedCombos: [FLASH_COMBO],
                originResponses: [quotaExhausted(), originOk()],
            },
        );
        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        const firstBody = (await originRequests[0]!.json()) as { model: string };
        const secondBody = (await originRequests[1]!.json()) as { model: string };
        expect(firstBody.model).toBe(MEMBER_0);
        expect(secondBody.model).toBe(MEMBER_0);
        expect(originRequests[1]!.headers.get('authorization')?.startsWith('Bearer ')).toBe(true);
    });

    it('on 404 for member[0] skips remaining keys for that member', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            extraApiKeys: true,
            seedCombos: [FLASH_COMBO],
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'not found' } }), {
                    status: 404,
                    headers: { 'content-type': 'application/json' },
                }),
                originOk(),
            ],
        });
        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        expect(new URL(originRequests[0]!.url).pathname).toContain(`/models/${MEMBER_0}`);
        expect(new URL(originRequests[1]!.url).pathname).toContain(`/models/${MEMBER_1}`);
    });

    it('returns the last 400 when every combo member is invalid', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            seedCombos: [FLASH_COMBO],
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'bad m0' } }), {
                    status: 400,
                    headers: { 'content-type': 'application/json' },
                }),
                new Response(JSON.stringify({ error: { message: 'bad m1' } }), {
                    status: 400,
                    headers: { 'content-type': 'application/json' },
                }),
            ],
        });
        expect(actualResponse.status).toBe(400);
        expect(originRequests).toHaveLength(2);
        expect(new URL(originRequests[0]!.url).pathname).toContain(`/models/${MEMBER_0}`);
        expect(new URL(originRequests[1]!.url).pathname).toContain(`/models/${MEMBER_1}`);
    });

    it('allowlist flash-combo still admits the combo request', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            seedCombos: [FLASH_COMBO],
            originResponses: [originOk()],
            proxyKey: {
                id: CONTRACT_PROXY_KEY_ID,
                user_id: CONTRACT_USER_ID,
                name: 'allowlist-combo',
                is_active: true,
                deleted_at: null,
                max_output_tokens: null,
                max_request_body_bytes: null,
                allowed_models: ['flash-combo'],
            },
        });
        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(new URL(originRequests[0]!.url).pathname).toContain(`/models/${MEMBER_0}`);
    });

    it('does not expand an inactive combo', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            seedCombos: [{ ...FLASH_COMBO, is_active: false }],
            originResponses: [originOk()],
        });
        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(new URL(originRequests[0]!.url).pathname).toContain('/models/flash-combo');
        expect(new URL(originRequests[0]!.url).pathname).not.toContain(`/models/${MEMBER_0}`);
    });

    it('sends a member that looks like another combo as a literal id', async () => {
        const actualResponse = await invokeCore(COMBO_PATH, createProxyRequestInit(), {
            seedCombos: [
                { ...FLASH_COMBO, members: ['inner-combo', MEMBER_1] },
                {
                    id: '66666666-6666-6666-6666-666666666666',
                    name: 'inner-combo',
                    members: [MEMBER_0],
                },
            ],
            originResponses: [originOk()],
        });
        expect(actualResponse.status).toBe(200);
        expect(new URL(originRequests[0]!.url).pathname).toContain('/models/inner-combo');
    });

    it('replaces a colliding Google id on GET /v1/models', async () => {
        const actualResponse = await invokeCore(
            '/v1/models',
            {
                method: 'GET',
                headers: { 'x-goog-api-key': CONTRACT_PROXY_KEY },
            },
            {
                seedCombos: [{ ...FLASH_COMBO, name: MEMBER_0, members: [MEMBER_1] }],
                originBody: { models: [{ name: `models/${MEMBER_0}`, displayName: 'Flash' }] },
            },
        );
        const body = (await actualResponse.json()) as {
            models: Array<{ name: string; description?: string }>;
        };
        const matches = body.models.filter((row) => row.name === `models/${MEMBER_0}`);
        expect(matches).toHaveLength(1);
        expect(matches[0]?.description).toBe(`Combo: ${MEMBER_1}`);
    });

    it('injects combos into OpenAI GET /v1/models', async () => {
        const actualResponse = await invokeCore(
            '/v1/models',
            {
                method: 'GET',
                headers: { authorization: `Bearer ${CONTRACT_PROXY_KEY}` },
            },
            {
                seedCombos: [FLASH_COMBO],
                originBody: { data: [{ id: MEMBER_0, object: 'model' }] },
            },
        );
        expect(actualResponse.status).toBe(200);
        const body = (await actualResponse.json()) as {
            data: Array<{ id: string; owned_by?: string }>;
        };
        expect(
            body.data.some((row) => row.id === 'flash-combo' && row.owned_by === 'gproxy-combo'),
        ).toBe(true);
        expect(body.data.some((row) => row.id === MEMBER_0)).toBe(true);
    });
});
