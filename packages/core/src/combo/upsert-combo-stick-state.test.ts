import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { upsertComboStickState } from './upsert-combo-stick-state';

describe('upsertComboStickState', () => {
    it('upserts stick state for the proxy key and combo', async () => {
        const upserts: unknown[] = [];
        const supabase = {
            from(table: string) {
                expect(table).toBe('model_combo_stick_state');
                return {
                    upsert: async (payload: unknown) => {
                        upserts.push(payload);
                        return { error: null };
                    },
                };
            },
        } as unknown as SupabaseClient<Database>;
        await upsertComboStickState(supabase, {
            proxyKeyId: 'proxy-1',
            comboId: 'combo-1',
            lastApiKeyId: 'key-a',
            consecutiveSuccesses: 2,
        });
        expect(upserts).toEqual([
            {
                proxy_key_id: 'proxy-1',
                combo_id: 'combo-1',
                last_api_key_id: 'key-a',
                consecutive_successes: 2,
            },
        ]);
    });
});
