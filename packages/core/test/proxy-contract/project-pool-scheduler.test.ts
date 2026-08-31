import { afterEach, describe, expect, it } from 'vitest';
import {
    CONTRACT_API_KEY_ID,
    CONTRACT_API_KEY_ID_2,
    CONTRACT_API_KEY_ID_3,
    CONTRACT_GEMINI_KEY,
    CONTRACT_GEMINI_KEY_2,
    CONTRACT_GEMINI_KEY_3,
    CONTRACT_PROXY_KEY,
    invokeCore,
    originRequests,
    resetContractHarness,
    rpcCalls,
    type ContractApiKeyFixture,
    type ContractProjectPoolFixture,
} from './harness';

const PROXY_PATH = '/gemini/v1beta/models/gemini-flash:generateContent';
const CONTRACT_PROJECT_POOL_ID_1 = '66666666-6666-6666-6666-666666666666';
const CONTRACT_PROJECT_POOL_ID_2 = '77777777-7777-7777-7777-777777777777';
const SEEDED_P2_MINUTE_REQUESTS = 2;

function createCurrentMinuteWindowStartIso(): string {
    return new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
}

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

function createApiKeyFixture(
    id: string,
    apiKeyValue: string,
    name: string,
    projectPoolId: string | null,
    lastUsedAt: string,
): ContractApiKeyFixture {
    return {
        id,
        api_key_value: apiKeyValue,
        name,
        last_used_at: lastUsedAt,
        last_error_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        failure_count: 0,
        consecutive_failures: 0,
        cooldown_until: null,
        is_active: true,
        project_pool_id: projectPoolId,
    };
}

function createPoolFixture(id: string): ContractProjectPoolFixture {
    return {
        id,
        cooldown_until: null,
        rpm_limit: null,
        tpm_limit: null,
        consecutive_failures: 0,
    };
}

function createThreeKeyPoolFixtures(): {
    apiKeys: ContractApiKeyFixture[];
    projectPools: ContractProjectPoolFixture[];
} {
    return {
        apiKeys: [
            createApiKeyFixture(
                CONTRACT_API_KEY_ID,
                CONTRACT_GEMINI_KEY,
                'contract-gemini',
                CONTRACT_PROJECT_POOL_ID_1,
                '2026-01-01T00:00:00.000Z',
            ),
            createApiKeyFixture(
                CONTRACT_API_KEY_ID_3,
                CONTRACT_GEMINI_KEY_3,
                'contract-gemini-3',
                CONTRACT_PROJECT_POOL_ID_1,
                '2026-01-02T00:00:00.000Z',
            ),
            createApiKeyFixture(
                CONTRACT_API_KEY_ID_2,
                CONTRACT_GEMINI_KEY_2,
                'contract-gemini-2',
                CONTRACT_PROJECT_POOL_ID_2,
                '2026-01-03T00:00:00.000Z',
            ),
        ],
        projectPools: [
            createPoolFixture(CONTRACT_PROJECT_POOL_ID_1),
            createPoolFixture(CONTRACT_PROJECT_POOL_ID_2),
        ],
    };
}

describe('proxy contract: project pool scheduler', () => {
    afterEach(() => {
        resetContractHarness();
    });

    it('skips same-pool key B after 429 on A and uses other-pool key C', async () => {
        const startedAt = Date.now();
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            ...createThreeKeyPoolFixtures(),
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
        expect(Date.now() - startedAt).toBeLessThan(2_000);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY_2);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).not.toBe(CONTRACT_GEMINI_KEY_3);
        expect(rpcCalls).toContainEqual({
            name: 'record_api_key_failure',
            args: expect.objectContaining({
                p_id: CONTRACT_API_KEY_ID,
                p_disable: false,
                p_cooldown_until: expect.any(String),
            }),
        });
    });

    it('does not cool the pool on 401 so same-pool key B is used', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            ...createThreeKeyPoolFixtures(),
            quotaWindows: [
                {
                    project_pool_id: CONTRACT_PROJECT_POOL_ID_2,
                    window_type: 'minute',
                    window_start: createCurrentMinuteWindowStartIso(),
                    request_count: SEEDED_P2_MINUTE_REQUESTS,
                    token_count: 0,
                },
            ],
            originResponses: [
                new Response(JSON.stringify({ error: { message: 'invalid key' } }), {
                    status: 401,
                }),
                new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
            ],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(2);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY_3);
        expect(originRequests[1]!.headers.get('x-goog-api-key')).not.toBe(CONTRACT_GEMINI_KEY_2);
        expect(rpcCalls).toContainEqual({
            name: 'record_api_key_failure',
            args: expect.objectContaining({
                p_id: CONTRACT_API_KEY_ID,
                p_disable: true,
            }),
        });
    });

    it('does not schedule a pooled key when the pool table cannot be read', async () => {
        const actualResponse = await invokeCore(PROXY_PATH, createProxyRequestInit(), {
            apiKeys: [
                createApiKeyFixture(
                    CONTRACT_API_KEY_ID,
                    CONTRACT_GEMINI_KEY,
                    'contract-gemini',
                    CONTRACT_PROJECT_POOL_ID_1,
                    '2026-01-01T00:00:00.000Z',
                ),
                createApiKeyFixture(
                    CONTRACT_API_KEY_ID_2,
                    CONTRACT_GEMINI_KEY_2,
                    'contract-gemini-2',
                    null,
                    '2026-01-02T00:00:00.000Z',
                ),
            ],
            projectPools: [createPoolFixture(CONTRACT_PROJECT_POOL_ID_1)],
            projectPoolFetchError: true,
            originResponses: [new Response(JSON.stringify({ candidates: [] }), { status: 200 })],
        });

        expect(actualResponse.status).toBe(200);
        expect(originRequests).toHaveLength(1);
        expect(originRequests[0]!.headers.get('x-goog-api-key')).toBe(CONTRACT_GEMINI_KEY_2);
        expect(originRequests[0]!.headers.get('x-goog-api-key')).not.toBe(CONTRACT_GEMINI_KEY);
    });
});
