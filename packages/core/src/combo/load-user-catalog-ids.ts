import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';

export async function loadUserCatalogIds(
    supabase: SupabaseClient<Database>,
    userId: string,
): Promise<string[]> {
    const { data, error } = await supabase
        .from('user_model_catalog')
        .select('model_id')
        .eq('user_id', userId);
    if (error || !data) {
        return [];
    }
    return data.map((row) => row.model_id);
}
