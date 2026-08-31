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
export const CONTRACT_API_KEY_ID_3 = '55555555-5555-5555-5555-555555555555';
export const CONTRACT_GEMINI_KEY_2 = 'AIzaSyTESTGEMINIKEY00000000002';
export const CONTRACT_GEMINI_KEY_3 = 'AIzaSyTESTGEMINIKEY00000000003';

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

export type ContractApiKeyFixture = {
    id: string;
    api_key_value: string;
    name: string;
    last_used_at: string | null;
    last_error_at: string | null;
    created_at: string;
    failure_count: number;
    consecutive_failures: number;
    cooldown_until: string | null;
    is_active: boolean;
    project_pool_id?: string | null;
};

export type ContractProjectPoolFixture = {
    id: string;
    cooldown_until: string | null;
    rpm_limit: number | null;
    tpm_limit: number | null;
    consecutive_failures: number;
};

export type ContractQuotaWindowFixture = {
    project_pool_id: string;
    window_type: string;
    window_start: string;
    request_count: number;
    token_count: number;
};

export type InvokeCoreOptions = {
    proxyKey?: Record<string, unknown> | null;
    proxyKeyActive?: boolean;
    supabaseThrows?: boolean;
    noApiKeys?: boolean;
    extraApiKeys?: boolean;
    extraApiKeyCooldownUntil?: string | null;
    apiKeys?: ContractApiKeyFixture[];
    projectPools?: ContractProjectPoolFixture[];
    quotaWindows?: ContractQuotaWindowFixture[];
    projectPoolFetchError?: boolean;
    originBody?: unknown;
    originResponses?: Array<Response | 'abort' | ((request: Request) => Promise<Response>)>;
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
    eq: Record<string, unknown>;
    inValues: Record<string, Set<unknown>>;
    updateValues: Record<string, unknown> | null;
    upsertValues: Record<string, unknown> | null;
};

function matchesEqAndInFilters(row: Record<string, unknown>, filters: QueryFilters): boolean {
    for (const [column, expected] of Object.entries(filters.eq)) {
        if (!(column in row)) {
            continue;
        }
        if (row[column] !== expected) {
            return false;
        }
    }
    for (const [column, allowedValues] of Object.entries(filters.inValues)) {
        if (!(column in row)) {
            continue;
        }
        if (!allowedValues.has(row[column])) {
            return false;
        }
    }
    return true;
}

function createQuery(
    getResult: (filters: QueryFilters) => QueryResult,
    onExecute?: (filters: QueryFilters) => void,
): {
    select: (...args: unknown[]) => unknown;
    eq: (...args: unknown[]) => unknown;
    in: (...args: unknown[]) => unknown;
    gt: (...args: unknown[]) => unknown;
    is: (...args: unknown[]) => unknown;
    not: (...args: unknown[]) => unknown;
    or: (...args: unknown[]) => unknown;
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
        eq: {},
        inValues: {},
        updateValues: null,
        upsertValues: null,
    };
    const execute = (): QueryResult => {
        onExecute?.(filters);
        return getResult(filters);
    };
    const query = {
        select: (..._args: unknown[]) => query,
        eq: (column: unknown, value: unknown) => {
            if (typeof column === 'string') {
                filters.eq[column] = value;
            }
            return query;
        },
        in: (column: unknown, values: unknown) => {
            if (typeof column === 'string' && Array.isArray(values)) {
                filters.inValues[column] = new Set(values);
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
        order: (..._args: unknown[]) => query,
        limit: (..._args: unknown[]) => query,
        update: (values: unknown) => {
            if (values && typeof values === 'object') {
                filters.updateValues = values as Record<string, unknown>;
            }
            return query;
        },
        upsert: (values: unknown) => {
            if (values && typeof values === 'object') {
                filters.upsertValues = values as Record<string, unknown>;
            }
            return query;
        },
        maybeSingle: async () => execute(),
        single: async () => execute(),
        then: (
            resolve: (value: QueryResult) => unknown,
            reject?: (reason: unknown) => unknown,
        ): Promise<unknown> => Promise.resolve(execute()).then(resolve, reject),
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
    const defaultCreatedAt = '2026-01-01T00:00:00.000Z';
    const apiKeys: ContractApiKeyFixture[] = options.apiKeys
        ? options.apiKeys.map((apiKey) => ({ ...apiKey }))
        : options.noApiKeys
          ? []
          : [
                {
                    id: CONTRACT_API_KEY_ID,
                    api_key_value: CONTRACT_GEMINI_KEY,
                    name: 'contract-gemini',
                    last_used_at: null,
                    last_error_at: null,
                    created_at: defaultCreatedAt,
                    failure_count: 0,
                    consecutive_failures: 0,
                    cooldown_until: null,
                    is_active: true,
                    project_pool_id: null,
                },
                ...(options.extraApiKeys
                    ? [
                          {
                              id: CONTRACT_API_KEY_ID_2,
                              api_key_value: CONTRACT_GEMINI_KEY_2,
                              name: 'contract-gemini-2',
                              last_used_at: null,
                              last_error_at: null,
                              created_at: defaultCreatedAt,
                              failure_count: 0,
                              consecutive_failures: 0,
                              cooldown_until: options.extraApiKeyCooldownUntil ?? null,
                              is_active: true,
                              project_pool_id: null,
                          },
                      ]
                    : []),
            ];
    const projectPools: ContractProjectPoolFixture[] = (options.projectPools ?? []).map((pool) => ({
        ...pool,
    }));
    const quotaWindows: ContractQuotaWindowFixture[] = (options.quotaWindows ?? []).map(
        (window) => ({ ...window }),
    );
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
                        return matchesEqAndInFilters(
                            apiKey as unknown as Record<string, unknown>,
                            filters,
                        );
                    });
                    return {
                        data: filteredApiKeys,
                        error: null,
                        count: filteredApiKeys.length,
                    };
                });
            }
            if (table === 'google_project_pools') {
                if (options.projectPoolFetchError) {
                    return createQuery(() => ({
                        data: null,
                        error: { message: 'pool fetch failed' },
                    }));
                }
                return createQuery(
                    (filters) => {
                        const filteredPools = projectPools.filter((pool) =>
                            matchesEqAndInFilters(
                                pool as unknown as Record<string, unknown>,
                                filters,
                            ),
                        );
                        return { data: filteredPools, error: null, count: filteredPools.length };
                    },
                    (filters) => {
                        if (!filters.updateValues) {
                            return;
                        }
                        for (const pool of projectPools) {
                            if (
                                matchesEqAndInFilters(
                                    pool as unknown as Record<string, unknown>,
                                    filters,
                                )
                            ) {
                                Object.assign(pool, filters.updateValues);
                            }
                        }
                    },
                );
            }
            if (table === 'project_pool_quota_windows') {
                return createQuery(
                    (filters) => {
                        const filteredWindows = quotaWindows.filter((window) =>
                            matchesEqAndInFilters(
                                window as unknown as Record<string, unknown>,
                                filters,
                            ),
                        );
                        return {
                            data: filteredWindows,
                            error: null,
                            count: filteredWindows.length,
                        };
                    },
                    (filters) => {
                        if (filters.updateValues) {
                            for (const window of quotaWindows) {
                                if (
                                    matchesEqAndInFilters(
                                        window as unknown as Record<string, unknown>,
                                        filters,
                                    )
                                ) {
                                    Object.assign(window, filters.updateValues);
                                }
                            }
                        }
                        if (filters.upsertValues) {
                            const upserted = filters.upsertValues;
                            const existingWindow = quotaWindows.find(
                                (window) =>
                                    window.project_pool_id === upserted.project_pool_id &&
                                    window.window_type === upserted.window_type &&
                                    window.window_start === upserted.window_start,
                            );
                            if (existingWindow) {
                                Object.assign(existingWindow, upserted);
                                return;
                            }
                            quotaWindows.push({
                                project_pool_id: String(upserted.project_pool_id),
                                window_type: String(upserted.window_type ?? 'minute'),
                                window_start: String(upserted.window_start),
                                request_count: Number(upserted.request_count ?? 0),
                                token_count: Number(upserted.token_count ?? 0),
                            });
                        }
                    },
                );
            }
            if (table === 'request_logs') {
                return createQuery(() => ({ data: [], error: null }));
            }
            if (table === 'user_settings') {
                return createQuery(() => ({ data: null, error: null }));
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
    for (const [name, value] of Object.entries(options.environment ?? {})) {
        vi.stubEnv(name, value);
    }
    const supabaseClient = options.supabaseThrows ? null : createMockSupabase(options);
    setSupabaseFactoryForTests((_c: Context) => {
        if (options.supabaseThrows || supabaseClient === null) {
            throw new Error('supabase probe failed');
        }
        return supabaseClient;
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
                headers: { 'content-type': 'application/json' },
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
    setSupabaseFactoryForTests(null);
    resetSupabaseClient();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
}
