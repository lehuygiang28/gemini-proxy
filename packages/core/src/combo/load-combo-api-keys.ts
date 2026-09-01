import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';

export type ComboApiKeyRow = {
    readonly id: string;
    readonly apiKeyValue: string;
    readonly name: string | null;
    readonly lastUsedAt: string | null;
    readonly consecutiveFailures: number;
    readonly cooldownUntil: string | null;
};

export async function loadComboApiKeys(
    supabase: SupabaseClient<Database>,
    userId: string,
): Promise<ComboApiKeyRow[]> {
    const { data, error } = await supabase
        .from('api_keys')
        .select(
            'id, api_key_value, name, last_used_at, consecutive_failures, cooldown_until, is_active',
        )
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('deleted_at', null);
    if (error || !data) {
        return [];
    }
    return data.map((row) => ({
        id: row.id,
        apiKeyValue: row.api_key_value,
        name: row.name ?? null,
        lastUsedAt: row.last_used_at,
        consecutiveFailures: row.consecutive_failures ?? 0,
        cooldownUntil: row.cooldown_until,
    }));
}
