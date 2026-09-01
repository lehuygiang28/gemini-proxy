import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { syncGoogleModelCatalog } from './sync-google-model-catalog';

describe('syncGoogleModelCatalog', () => {
    it('replaces google_live rows and keeps custom', async () => {
        const deleted: unknown[] = [];
        const inserted: unknown[] = [];
        const supabase = {
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
                        delete: () => ({
                            eq: () => ({
                                eq: async () => {
                                    deleted.push('google_live');
                                    return { error: null };
                                },
                            }),
                        }),
                        insert: async (rows: unknown) => {
                            inserted.push(rows);
                            return { error: null };
                        },
                    };
                }
                throw new Error(`unexpected table ${table}`);
            },
        } as unknown as SupabaseClient<Database>;
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        models: [
                            {
                                name: 'models/gemini-3.7-flash',
                                displayName: 'Flash',
                                supportedGenerationMethods: ['generateContent'],
                            },
                        ],
                    }),
                    { status: 200 },
                ),
        );
        const actual = await syncGoogleModelCatalog({
            supabase,
            userId: 'user-1',
            fetchImpl,
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: true, count: 1 });
        expect(deleted).toEqual(['google_live']);
        expect(inserted).toEqual([
            [
                {
                    user_id: 'user-1',
                    model_id: 'gemini-3.7-flash',
                    display_name: 'Flash',
                    source: 'google_live',
                    supports_generate: true,
                },
            ],
        ]);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const request = fetchImpl.mock.calls[0]![0] as Request;
        expect(new URL(request.url).pathname).toBe('/v1beta/models');
        expect(request.headers.get('x-goog-api-key')).toBe('AIzaSyTEST');
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
        const actual = await syncGoogleModelCatalog({
            supabase,
            userId: 'user-1',
            fetchImpl: vi.fn(),
            geminiBaseUrl: 'https://origin.test/',
        });
        expect(actual).toEqual({ ok: false });
    });
});
