import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';

export async function upsertComboStickState(
    supabase: SupabaseClient<Database>,
    input: {
        readonly proxyKeyId: string;
        readonly comboId: string;
        readonly lastApiKeyId: string | null;
        readonly consecutiveSuccesses: number;
    },
): Promise<void> {
    const { error } = await supabase.from('model_combo_stick_state').upsert({
        proxy_key_id: input.proxyKeyId,
        combo_id: input.comboId,
        last_api_key_id: input.lastApiKeyId,
        consecutive_successes: input.consecutiveSuccesses,
    });
    if (error) {
        console.error('Failed to persist combo stick state:', error);
    }
}
