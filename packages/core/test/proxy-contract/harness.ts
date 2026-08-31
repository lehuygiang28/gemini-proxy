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

export type InvokeCoreOptions = {
    proxyKey?: Record<string, unknown> | null;
    proxyKeyActive?: boolean;
    supabaseThrows?: boolean;
    extraApiKeys?: boolean;
    originBody?: unknown;
    originHeaders?: HeadersInit;
};

type QueryResult = {
    data: unknown;
    error: { code?: string; message?: string } | null;
    count?: number;
};

function createQuery(getResult: () => QueryResult): {
    select: (...args: unknown[]) => unknown;
    eq: (...args: unknown[]) => unknown;
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
    const query = {
        select: (..._args: unknown[]) => query,
        eq: (..._args: unknown[]) => query,
        is: (..._args: unknown[]) => query,
        not: (..._args: unknown[]) => query,
        or: (..._args: unknown[]) => query,
        order: (..._args: unknown[]) => query,
        limit: (..._args: unknown[]) => query,
        update: (..._args: unknown[]) => query,
        upsert: (..._args: unknown[]) => query,
        maybeSingle: async () => getResult(),
        single: async () => getResult(),
        then: (
            resolve: (value: QueryResult) => unknown,
            reject?: (reason: unknown) => unknown,
        ): Promise<unknown> => Promise.resolve(getResult()).then(resolve, reject),
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
              });
    const apiKeys = [
        {
            id: CONTRACT_API_KEY_ID,
            api_key_value: CONTRACT_GEMINI_KEY,
            name: 'contract-gemini',
            last_used_at: null,
            last_error_at: null,
            created_at: new Date().toISOString(),
            failure_count: 0,
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
                      is_active: true,
                  },
              ]
            : []),
    ];
    const client = {
        from(table: string) {
            if (table === 'proxy_api_keys') {
                return createQuery(() => ({ data: proxyRow, error: null }));
            }
            if (table === 'api_keys') {
                return createQuery(() => ({
                    data: apiKeys,
                    error: null,
                    count: apiKeys.length,
                }));
            }
            if (table === 'request_logs') {
                return createQuery(() => ({ data: [], error: null }));
            }
            if (table === 'user_settings') {
                return createQuery(() => ({ data: null, error: null }));
            }
            return createQuery(() => ({ data: null, error: null }));
        },
        async rpc() {
            return { data: null, error: null };
        },
    };
    return client as unknown as SupabaseClient<Database>;
}

export function createContractEnv(): Record<string, string> {
    return {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
        GOOGLE_GEMINI_API_BASE_URL: 'https://origin.test/',
        GOOGLE_OPENAI_API_BASE_URL: 'https://origin.test/openai/',
    };
}

export function createExecutionCtx(): {
    waitUntil: (promise: Promise<unknown>) => void;
    passThroughOnException: () => void;
} {
    return {
        waitUntil: (promise: Promise<unknown>): void => {
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
    return coreApp.fetch(request, createContractEnv(), createExecutionCtx());
}

export function resetContractHarness(): void {
    originRequests.length = 0;
    setSupabaseFactoryForTests(null);
    resetSupabaseClient();
    vi.unstubAllGlobals();
}
