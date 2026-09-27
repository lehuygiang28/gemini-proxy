import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { probeModelForUser } from './probe-model-for-user';

function createSupabase(input: {
    readonly apiKey?: { id: string; api_key_value: string } | null;
    readonly filterById?: string;
}): SupabaseClient<Database> {
    return {
        from(table: string) {
            if (table !== 'api_keys') {
                throw new Error(`unexpected table ${table}`);
            }
            const chain = {
                select: () => chain,
                eq: () => chain,
                is: () => chain,
                order: () => chain,
                limit: () => ({
                    maybeSingle: async () => ({
                        data: input.apiKey,
                        error: null,
                    }),
                }),
                maybeSingle: async () => ({
                    data:
                        input.filterById && input.apiKey?.id !== input.filterById
                            ? null
                            : input.apiKey,
                    error: null,
                }),
            };
            return chain;
        },
    } as unknown as SupabaseClient<Database>;
}

describe('probeModelForUser', () => {
    it('returns no_api_key when the user has no active keys', async () => {
        const actual = await probeModelForUser({
            supabase: createSupabase({ apiKey: null }),
            userId: 'user-1',
            modelId: 'gemini-2.0-flash',
        });
        expect(actual).toEqual({ ok: false, message: 'no_api_key' });
    });

    it('delegates to probeGeminiModel with the selected api key', async () => {
        const fetchImpl = vi.fn(
            async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
        );
        const actual = await probeModelForUser({
            supabase: createSupabase({
                apiKey: { id: 'key-1', api_key_value: 'AIzaSyTEST' },
                filterById: 'key-1',
            }),
            userId: 'user-1',
            modelId: 'gemini-2.0-flash',
            apiKeyId: 'key-1',
            fetchImpl,
        });
        expect(actual).toEqual({ ok: true });
        expect(fetchImpl).toHaveBeenCalledOnce();
    });
});
