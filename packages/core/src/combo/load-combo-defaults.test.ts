import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { loadComboDefaults } from './load-combo-defaults';

function createSettingsClient(row: {
    combo_strategy: string | null;
    combo_stick_after_successes: number | null;
} | null): SupabaseClient<Database> {
    return {
        from(table: string) {
            expect(table).toBe('user_settings');
            return {
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => ({ data: row, error: null }),
                    }),
                }),
            };
        },
    } as unknown as SupabaseClient<Database>;
}

describe('loadComboDefaults', () => {
    it('returns stored global strategy', async () => {
        const actual = await loadComboDefaults(
            createSettingsClient({
                combo_strategy: 'sticky_until_error',
                combo_stick_after_successes: 3,
            }),
            'user-1',
        );
        expect(actual).toEqual({ strategy: 'sticky_until_error', stickAfterSuccesses: 3 });
    });

    it('falls back to fallback when settings are missing', async () => {
        const actual = await loadComboDefaults(createSettingsClient(null), 'user-1');
        expect(actual).toEqual({ strategy: 'fallback', stickAfterSuccesses: null });
    });
});
