import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import type { ComboStrategy } from './combo-types';

export async function loadComboDefaults(
    supabase: SupabaseClient<Database>,
    userId: string,
): Promise<{ strategy: ComboStrategy; stickAfterSuccesses: number | null }> {
    const { data } = await supabase
        .from('user_settings')
        .select('combo_strategy, combo_stick_after_successes')
        .eq('id', userId)
        .maybeSingle();
    const strategy = data?.combo_strategy;
    if (strategy === 'sticky_until_error' || strategy === 'stick_n' || strategy === 'fallback') {
        return {
            strategy,
            stickAfterSuccesses: data?.combo_stick_after_successes ?? null,
        };
    }
    return { strategy: 'fallback', stickAfterSuccesses: null };
}
