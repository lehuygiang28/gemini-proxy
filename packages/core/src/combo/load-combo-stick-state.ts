import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';

export async function loadComboStickState(
    supabase: SupabaseClient<Database>,
    proxyKeyId: string,
    comboId: string,
): Promise<{ lastApiKeyId: string | null; consecutiveSuccesses: number }> {
    const { data } = await supabase
        .from('model_combo_stick_state')
        .select('last_api_key_id, consecutive_successes')
        .eq('proxy_key_id', proxyKeyId)
        .eq('combo_id', comboId)
        .maybeSingle();
    return {
        lastApiKeyId: data?.last_api_key_id ?? null,
        consecutiveSuccesses: data?.consecutive_successes ?? 0,
    };
}
