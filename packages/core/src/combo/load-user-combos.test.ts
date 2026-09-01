import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { loadUserCombos } from './load-user-combos';

type ComboSeedRow = {
    id: string;
    name: string;
    is_active: boolean;
    strategy: string | null;
    stick_after_successes: number | null;
    model_combo_members: Array<{ position: number; canonical_model: string }>;
};

function createComboClient(result: {
    data: ComboSeedRow[] | null;
    error: { message: string } | null;
}): SupabaseClient<Database> {
    return {
        from(table: string) {
            expect(table).toBe('model_combos');
            return {
                select: () => ({
                    eq: async (column: string, userId: string) => {
                        expect(column).toBe('user_id');
                        expect(userId).toBe('user-1');
                        return result;
                    },
                }),
            };
        },
    } as unknown as SupabaseClient<Database>;
}

describe('loadUserCombos', () => {
    it('joins members ordered by position and keeps inactive combos', async () => {
        const actual = await loadUserCombos(
            createComboClient({
                data: [
                    {
                        id: 'c1',
                        name: 'flash-combo',
                        is_active: true,
                        strategy: null,
                        stick_after_successes: null,
                        model_combo_members: [
                            { position: 1, canonical_model: 'gemini-3.5-flash' },
                            { position: 0, canonical_model: 'gemini-3.7-flash' },
                        ],
                    },
                    {
                        id: 'c2',
                        name: 'off-combo',
                        is_active: false,
                        strategy: 'sticky_until_error',
                        stick_after_successes: null,
                        model_combo_members: [{ position: 0, canonical_model: 'gemini-3.7-flash' }],
                    },
                ],
                error: null,
            }),
            'user-1',
        );
        expect(actual).toEqual([
            {
                id: 'c1',
                name: 'flash-combo',
                isActive: true,
                strategy: null,
                stickAfterSuccesses: null,
                members: ['gemini-3.7-flash', 'gemini-3.5-flash'],
            },
            {
                id: 'c2',
                name: 'off-combo',
                isActive: false,
                strategy: 'sticky_until_error',
                stickAfterSuccesses: null,
                members: ['gemini-3.7-flash'],
            },
        ]);
    });

    it('returns an empty list when the query errors', async () => {
        const actual = await loadUserCombos(
            createComboClient({ data: null, error: { message: 'boom' } }),
            'user-1',
        );
        expect(actual).toEqual([]);
    });
});
