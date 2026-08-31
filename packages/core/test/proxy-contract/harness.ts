import { vi } from 'vitest';
import type { Context } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { coreApp } from '../../src/app';
import {
    resetSupabaseClient,
    setSupabaseFactoryForTests,
} from '../../src/services/supabase.service';

export const CONTRACT_PROXY_KEY = 'AIzaGPROXY_abcdefghijklmnopqr';
export const CONTRACT_GEMINI_KEY = 'AIzaSyTESTGEMINIKEY00000000001';
export const CONTRACT_USER_ID = '11111111-1111-1111-1111-111111111111';
export const CONTRACT_PROXY_KEY_ID = '22222222-2222-2222-2222-222222222222';
export const CONTRACT_API_KEY_ID = '33333333-3333-3333-3333-333333333333';
export const CONTRACT_API_KEY_ID_2 = '44444444-4444-4444-4444-444444444444';
export const CONTRACT_GEMINI_KEY_2 = 'AIzaSyTESTGEMINIKEY00000000002';

export const originRequests: Request[] = [];
export const rpcCalls: { name: string; args: unknown }[] = [];
const waitUntilPromises: Promise<unknown>[] = [];

export type AdmitResult = {
    ok: boolean;
    code?: string;
    reserved_tokens?: number;
    reserved_usd?: number;
    window_starts?: {
        minute: string | null;
        day: string | null;
        month: string | null;
    };
};

export type InvokeCoreOptions = {
    proxyKey?: Record<string, unknown> | null;
    proxyKeyActive?: boolean;
    supabaseThrows?: boolean;
    noApiKeys?: boolean;
    extraApiKeys?: boolean;
    extraApiKeyCooldownUntil?: string | null;
    primaryApiKeyCooldownUntil?: string | null;
    originBody?: unknown;
    originResponses?: Array<Response | 'abort' | ((request: Request) => Promise<Response>)>;
    originHeaders?: HeadersInit;
    environment?: Record<string, string>;
    admitResults?: AdmitResult[];
};

type QueryResult = {
    data: unknown;
    error: { code?: string; message?: string } | null;
    count?: number;
};

type QueryFilters = {
    excludedIds: Set<string>;
    cooldownAfter: string | null;
    cooldownBefore: string | null;
    inValues: Record<string, unknown[]>;
    eqValues: Record<string, unknown>;
};

type PersistedKeyPatch = {
    cooldown_until?: string | null;
    is_active?: boolean;
    last_error_at?: string | null;
};

type ModelCooldownRow = {
    api_key_id: string;
    canonical_model: string;
    cooldown_until: string;
};

const persistedKeyPatches = new Map<string, PersistedKeyPatch>();
const persistedModelCooldowns: ModelCooldownRow[] = [];

function createQuery(getResult: (filters: QueryFilters) => QueryResult): {
    select: (...args: unknown[]) => unknown;
    eq: (...args: unknown[]) => unknown;
    gt: (...args: unknown[]) => unknown;
    is: (...args: unknown[]) => unknown;
    not: (...args: unknown[]) => unknown;
    or: (...args: unknown[]) => unknown;
    in: (...args: unknown[]) => unknown;
    order: (...args: unknown[]) => unknown;
    limit: (...args: unknown[]) => unknown;
    update: (...args: unknown[]) => unknown;
    upsert: (...args: unknown[]) => unknown;
    maybeSingle: () => Promise<QueryResult>;
    single: () => Promise<QueryResult>;
    then: (
        resolve: (value: QueryResult) => unknown,
        reject?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
} {
    const filters: QueryFilters = {
        excludedIds: new Set<string>(),
        cooldownAfter: null,
        cooldownBefore: null,
        inValues: {},
        eqValues: {},
    };
    const query = {
        select: (..._args: unknown[]) => query,
        eq: (column: unknown, value: unknown) => {
            if (typeof column === 'string') {
                filters.eqValues[column] = value;
            }
            return query;
        },
        gt: (column: unknown, value: unknown) => {
            if (column === 'cooldown_until' && typeof value === 'string') {
                filters.cooldownAfter = value;
            }
            return query;
        },
        is: (..._args: unknown[]) => query,
        not: (column: unknown, operator: unknown, value: unknown) => {
            if (column === 'id' && operator === 'in' && typeof value === 'string') {
                for (const id of value.match(/[0-9a-f-]{36}/gi) ?? []) {
                    filters.excludedIds.add(id);
                }
            }
            return query;
        },
        or: (expression: unknown) => {
            if (typeof expression === 'string') {
                const cooldownMatch = expression.match(/cooldown_until\.lte\.(.+)$/);
                filters.cooldownBefore = cooldownMatch?.[1] ?? null;
            }
            return query;
        },
        in: (column: unknown, values: unknown) => {
            if (typeof column === 'string' && Array.isArray(values)) {
                filters.inValues[column] = values;
            }
            return query;
        },
        order: (..._args: unknown[]) => query,
        limit: (..._args: unknown[]) => query,
        update: (..._args: unknown[]) => query,
        upsert: (..._args: unknown[]) => query,
        maybeSingle: async () => getResult(filters),
        single: async () => getResult(filters),
        then: (
            resolve: (value: QueryResult) => unknown,
            reject?: (reason: unknown) => unknown,
        ): Promise<unknown> => Promise.resolve(getResult(filters)).then(resolve, reject),
    };
    return query;
}

export function createMockSupabase(options: InvokeCoreOptions = {}): SupabaseClient<Database> {
    const isActive = options.proxyKeyActive !== false;
    const proxyRow =
        options.proxyKey === null
            ? null
            : (options.proxyKey ?? {
                  id: CONTRACT_PROXY_KEY_ID,
                  user_id: CONTRACT_USER_ID,
                  name: 'contract-proxy',
                  is_active: isActive,
                  deleted_at: null,
                  max_output_tokens: null,
                  max_request_body_bytes: null,
              });
    const apiKeys = (
        options.noApiKeys
            ? []
            : [
                  {
                      id: CONTRACT_API_KEY_ID,
                      api_key_value: CONTRACT_GEMINI_KEY,
                      name: 'contract-gemini',
                      last_used_at: null,
                      last_error_at: null,
                      created_at: new Date().toISOString(),
                      failure_count: 0,
                      consecutive_failures: 0,
                      cooldown_until: options.primaryApiKeyCooldownUntil ?? null,
                      is_active: true,
                  },
                  ...(options.extraApiKeys
                      ? [
                            {
                                id: CONTRACT_API_KEY_ID_2,
                                api_key_value: CONTRACT_GEMINI_KEY_2,
                                name: 'contract-gemini-2',
                                last_used_at: null,
                                last_error_at: null,
                                created_at: new Date().toISOString(),
                                failure_count: 0,
                                consecutive_failures: 0,
                                cooldown_until: options.extraApiKeyCooldownUntil ?? null,
                                is_active: true,
                            },
                        ]
                      : []),
              ]
    ).map((apiKey) => {
        const patch = persistedKeyPatches.get(apiKey.id);
        if (!patch) {
            return apiKey;
        }
        return { ...apiKey, ...patch };
    });
    const client = {
        from(table: string) {
            if (table === 'proxy_api_keys') {
                return createQuery(() => ({ data: proxyRow, error: null }));
            }
            if (table === 'api_keys') {
                return createQuery((filters) => {
                    const filteredApiKeys = apiKeys.filter((apiKey) => {
                        if (filters.excludedIds.has(apiKey.id)) {
                            return false;
                        }
                        if (
                            filters.cooldownAfter !== null &&
                            (apiKey.cooldown_until === null ||
                                apiKey.cooldown_until <= filters.cooldownAfter)
                        ) {
                            return false;
                        }
                        if (
                            apiKey.cooldown_until !== null &&
                            filters.cooldownBefore !== null &&
                            apiKey.cooldown_until > filters.cooldownBefore
                        ) {
                            return false;
                        }
                        return true;
                    });
                    return {
                        data: filteredApiKeys,
                        error: null,
                        count: filteredApiKeys.length,
                    };
                });
            }
            if (table === 'request_logs') {
                return createQuery(() => ({ data: [], error: null }));
            }
            if (table === 'user_settings') {
                return createQuery(() => ({ data: null, error: null }));
            }
            if (table === 'api_key_model_cooldowns') {
                return createQuery((filters) => {
                    const nowIso = new Date().toISOString();
                    const filtered = persistedModelCooldowns.filter((row) => {
                        const ids = filters.inValues.api_key_id;
                        if (Array.isArray(ids) && !ids.includes(row.api_key_id)) {
                            return false;
                        }
                        const models = filters.inValues.canonical_model;
                        if (Array.isArray(models) && !models.includes(row.canonical_model)) {
                            return false;
                        }
                        if (
                            filters.eqValues.canonical_model != null &&
                            row.canonical_model !== filters.eqValues.canonical_model
                        ) {
                            return false;
                        }
                        if (
                            filters.eqValues.api_key_id != null &&
                            row.api_key_id !== filters.eqValues.api_key_id
                        ) {
                            return false;
                        }
                        if (
                            filters.cooldownAfter !== null &&
                            row.cooldown_until <= filters.cooldownAfter
                        ) {
                            return false;
                        }
                        if (filters.cooldownBefore !== null && row.cooldown_until > nowIso) {
                            return false;
                        }
                        return true;
                    });
                    return { data: filtered, error: null, count: filtered.length };
                });
            }
            return createQuery(() => ({ data: null, error: null }));
        },
        async rpc(name: string, args: unknown) {
            rpcCalls.push({ name, args });
            if (name === 'admit_proxy_request') {
                return {
                    data:
                        options.admitResults?.shift() ??
                        (isActive
                            ? {
                                  ok: true,
                                  reserved_tokens: 8192,
                                  reserved_usd: 0,
                              }
                            : { ok: false, code: 'inactive_key' }),
                    error: null,
                };
            }
            if (name === 'settle_proxy_request') {
                return { data: null, error: null };
            }
            if (name === 'record_api_key_failure') {
                const payload = args as {
                    p_id: string;
                    p_disable?: boolean;
                    p_cooldown_until?: string | null;
                    p_canonical_model?: string | null;
                    p_scope?: 'key' | 'key_model' | null;
                };
                const patch = persistedKeyPatches.get(payload.p_id) ?? {};
                patch.last_error_at = new Date().toISOString();
                if (payload.p_disable) {
                    patch.is_active = false;
                }
                if (
                    payload.p_scope === 'key_model' &&
                    payload.p_cooldown_until &&
                    payload.p_canonical_model
                ) {
                    const existing = persistedModelCooldowns.findIndex(
                        (row) =>
                            row.api_key_id === payload.p_id &&
                            row.canonical_model === payload.p_canonical_model,
                    );
                    const nextRow: ModelCooldownRow = {
                        api_key_id: payload.p_id,
                        canonical_model: payload.p_canonical_model,
                        cooldown_until: payload.p_cooldown_until,
                    };
                    if (existing >= 0) {
                        persistedModelCooldowns[existing] = nextRow;
                    } else {
                        persistedModelCooldowns.push(nextRow);
                    }
                } else if (payload.p_cooldown_until) {
                    patch.cooldown_until = payload.p_cooldown_until;
                }
                persistedKeyPatches.set(payload.p_id, patch);
            }
            if (name === 'record_api_key_success') {
                const payload = args as { p_id: string; p_canonical_model?: string | null };
                if (payload.p_canonical_model) {
                    for (let index = persistedModelCooldowns.length - 1; index >= 0; index -= 1) {
                        const row = persistedModelCooldowns[index];
                        if (
                            row &&
                            row.api_key_id === payload.p_id &&
                            row.canonical_model === payload.p_canonical_model
                        ) {
                            persistedModelCooldowns.splice(index, 1);
                        }
                    }
                }
            }
            return { data: null, error: null };
        },
    };
    return client as unknown as SupabaseClient<Database>;
}

export function createContractEnv(
    extraEnvironment: Record<string, string> = {},
): Record<string, string> {
    return {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
        GOOGLE_GEMINI_API_BASE_URL: 'https://origin.test/',
        GOOGLE_OPENAI_API_BASE_URL: 'https://origin.test/openai/',
        ...extraEnvironment,
    };
}

export function createExecutionCtx(): {
    waitUntil: (promise: Promise<unknown>) => void;
    passThroughOnException: () => void;
} {
    return {
        waitUntil: (promise: Promise<unknown>): void => {
            waitUntilPromises.push(promise);
            void promise.catch(() => undefined);
        },
        passThroughOnException: (): void => undefined,
    };
}

export async function invokeCore(
    path: string,
    init: RequestInit = {},
    options: InvokeCoreOptions = {},
): Promise<Response> {
    originRequests.length = 0;
    for (const [name, value] of Object.entries(options.environment ?? {})) {
        vi.stubEnv(name, value);
    }
    setSupabaseFactoryForTests((_c: Context) => {
        if (options.supabaseThrows) {
            throw new Error('supabase probe failed');
        }
        return createMockSupabase(options);
    });
    vi.stubGlobal(
        'fetch',
        async (input: RequestInfo | URL, requestInit?: RequestInit): Promise<Response> => {
            const request = input instanceof Request ? input : new Request(input, requestInit);
            originRequests.push(request);
            const originResponse = options.originResponses?.[originRequests.length - 1];
            if (originResponse === 'abort') {
                if (request.signal.aborted) {
                    throw request.signal.reason;
                }
                await new Promise<void>((_resolve, reject) => {
                    request.signal.addEventListener('abort', () => reject(request.signal.reason), {
                        once: true,
                    });
                });
            }
            if (typeof originResponse === 'function') {
                return originResponse(request);
            }
            if (originResponse instanceof Response) {
                return originResponse;
            }
            return new Response(JSON.stringify(options.originBody ?? { candidates: [] }), {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                    ...Object.fromEntries(new Headers(options.originHeaders ?? {}).entries()),
                },
            });
        },
    );
    const request = new Request(`http://localhost${path}`, init);
    return coreApp.fetch(request, createContractEnv(options.environment), createExecutionCtx());
}

export async function flushWaitUntil(): Promise<void> {
    while (waitUntilPromises.length > 0) {
        const pending = waitUntilPromises.splice(0);
        await Promise.allSettled(pending);
    }
}

export function resetContractHarness(): void {
    originRequests.length = 0;
    rpcCalls.length = 0;
    waitUntilPromises.length = 0;
    persistedKeyPatches.clear();
    persistedModelCooldowns.length = 0;
    setSupabaseFactoryForTests(null);
    resetSupabaseClient();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
}
