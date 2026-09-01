import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { syncGoogleModelCatalog } from './sync-google-model-catalog';

function createSupabase(input: {
    readonly customIds?: string[];
    readonly rpcError?: { message: string } | null;
    readonly rpcCalls: unknown[];
}): SupabaseClient<Database> {
    return {
        from(table: string) {
            if (table === 'api_keys') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                is: () => ({
                                    limit: () => ({
                                        maybeSingle: async () => ({
                                            data: {
                                                id: 'key-1',
                                                api_key_value: 'AIzaSyTEST',
                                            },
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                };
            }
            if (table === 'user_model_catalog') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: async () => ({
                                data: (input.customIds ?? []).map((model_id) => ({ model_id })),
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            throw new Error(`unexpected table ${table}`);
        },
        rpc: async (name: string, args: unknown) => {
            input.rpcCalls.push({ name, args });
            const models =
                args && typeof args === 'object' && 'p_models' in args
                    ? (args as { p_models: unknown }).p_models
                    : [];
            return {
                data: Array.isArray(models) ? models.length : 0,
                error: input.rpcError ?? null,
            };
        },
    } as unknown as SupabaseClient<Database>;
}

const flashList = {
    models: [
        {
            name: 'models/gemini-3.7-flash',
            displayName: 'Flash',
            supportedGenerationMethods: ['generateContent'],
        },
    ],
};

describe('syncGoogleModelCatalog', () => {
    it('replaces google_live rows through the catalog RPC and keeps custom ids out of the payload', async () => {
        const rpcCalls: unknown[] = [];
        const supabase = createSupabase({ customIds: ['gemini-3.7-flash'], rpcCalls });
        const fetchImpl = vi.fn(
            async () => new Response(JSON.stringify(flashList), { status: 200 }),
        );
        const actual = await syncGoogleModelCatalog({
            supabase,
            userId: 'user-1',
            fetchImpl,
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: true, count: 0 });
        expect(rpcCalls).toEqual([
            { name: 'replace_user_google_live_catalog', args: { p_models: [] } },
        ]);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const request = fetchImpl.mock.calls[0]![0] as Request;
        expect(new URL(request.url).pathname).toBe('/v1beta/models');
        expect(request.headers.get('x-goog-api-key')).toBe('AIzaSyTEST');
    });

    it('passes parsed google_live rows to the replace RPC', async () => {
        const rpcCalls: unknown[] = [];
        const supabase = createSupabase({ rpcCalls });
        const actual = await syncGoogleModelCatalog({
            supabase,
            userId: 'user-1',
            fetchImpl: vi.fn(async () => new Response(JSON.stringify(flashList), { status: 200 })),
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: true, count: 1 });
        expect(rpcCalls).toEqual([
            {
                name: 'replace_user_google_live_catalog',
                args: {
                    p_models: [
                        {
                            model_id: 'gemini-3.7-flash',
                            display_name: 'Flash',
                            supports_generate: true,
                        },
                    ],
                },
            },
        ]);
    });

    it('returns ok false when no Gemini key exists', async () => {
        const supabase = {
            from() {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                is: () => ({
                                    limit: () => ({
                                        maybeSingle: async () => ({ data: null, error: null }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                };
            },
        } as unknown as SupabaseClient<Database>;
        const fetchImpl = vi.fn();
        const actual = await syncGoogleModelCatalog({
            supabase,
            userId: 'user-1',
            fetchImpl,
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: false });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('returns ok false when models.list fetch fails', async () => {
        const rpcCalls: unknown[] = [];
        const actual = await syncGoogleModelCatalog({
            supabase: createSupabase({ rpcCalls }),
            userId: 'user-1',
            fetchImpl: vi.fn(async () => {
                throw new Error('network down');
            }),
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: false });
        expect(rpcCalls).toEqual([]);
    });

    it('returns ok false on a non-OK Google response', async () => {
        const rpcCalls: unknown[] = [];
        const actual = await syncGoogleModelCatalog({
            supabase: createSupabase({ rpcCalls }),
            userId: 'user-1',
            fetchImpl: vi.fn(async () => new Response('nope', { status: 502 })),
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: false });
        expect(rpcCalls).toEqual([]);
    });

    it('does not write when Google returns a malformed 200 body', async () => {
        const rpcCalls: unknown[] = [];
        const actual = await syncGoogleModelCatalog({
            supabase: createSupabase({ rpcCalls }),
            userId: 'user-1',
            fetchImpl: vi.fn(
                async () => new Response(JSON.stringify({ error: 'oops' }), { status: 200 }),
            ),
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: false });
        expect(rpcCalls).toEqual([]);
    });

    it('clears google_live rows when Google returns an empty list', async () => {
        const rpcCalls: unknown[] = [];
        const actual = await syncGoogleModelCatalog({
            supabase: createSupabase({ rpcCalls }),
            userId: 'user-1',
            fetchImpl: vi.fn(
                async () => new Response(JSON.stringify({ models: [] }), { status: 200 }),
            ),
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: true, count: 0 });
        expect(rpcCalls).toEqual([
            { name: 'replace_user_google_live_catalog', args: { p_models: [] } },
        ]);
    });

    it('does not fetch when geminiBaseUrl is not https', async () => {
        const rpcCalls: unknown[] = [];
        const fetchImpl = vi.fn();
        const actual = await syncGoogleModelCatalog({
            supabase: createSupabase({ rpcCalls }),
            userId: 'user-1',
            fetchImpl,
            geminiBaseUrl: 'http://origin.test/',
        });
        expect(actual).toEqual({ ok: false });
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(rpcCalls).toEqual([]);
    });
});
