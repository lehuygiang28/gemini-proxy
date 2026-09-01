import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';

export type ComboPairCooldown = {
    readonly apiKeyId: string;
    readonly canonicalModel: string;
    readonly cooldownUntil: string;
};

export async function loadComboPairCooldowns(
    supabase: SupabaseClient<Database>,
    keyIds: readonly string[],
): Promise<ComboPairCooldown[]> {
    if (keyIds.length === 0) {
        return [];
    }
    const { data, error } = await supabase
        .from('api_key_model_cooldowns')
        .select('api_key_id, canonical_model, cooldown_until')
        .in('api_key_id', [...keyIds]);
    if (error) {
        console.error('Failed to load combo pair cooldowns:', error);
        return [];
    }
    if (!data) {
        return [];
    }
    return data.map((row) => ({
        apiKeyId: row.api_key_id,
        canonicalModel: row.canonical_model,
        cooldownUntil: row.cooldown_until,
    }));
}
