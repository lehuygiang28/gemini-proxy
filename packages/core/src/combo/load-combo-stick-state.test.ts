import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { loadComboStickState } from './load-combo-stick-state';

function createStickClient(
    row: {
        last_api_key_id: string | null;
        consecutive_successes: number;
    } | null,
): SupabaseClient<Database> {
    return {
        from(table: string) {
            expect(table).toBe('model_combo_stick_state');
            return {
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: row, error: null }),
                        }),
                    }),
                }),
            };
        },
    } as unknown as SupabaseClient<Database>;
}

describe('loadComboStickState', () => {
    it('returns stored stick state', async () => {
        const actual = await loadComboStickState(
            createStickClient({
                last_api_key_id: 'key-a',
                consecutive_successes: 4,
            }),
            'proxy-1',
            'combo-1',
        );
        expect(actual).toEqual({ lastApiKeyId: 'key-a', consecutiveSuccesses: 4 });
    });

    it('defaults when no row exists', async () => {
        const actual = await loadComboStickState(createStickClient(null), 'proxy-1', 'combo-1');
        expect(actual).toEqual({ lastApiKeyId: null, consecutiveSuccesses: 0 });
    });
});
