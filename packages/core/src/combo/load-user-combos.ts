import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { mapComboRows } from './map-combo-rows';
import type { StoredCombo } from './combo-types';

export async function loadUserCombos(
    supabase: SupabaseClient<Database>,
    userId: string,
): Promise<StoredCombo[]> {
    const { data, error } = await supabase
        .from('model_combos')
        .select(
            'id, name, is_active, strategy, stick_after_successes, model_combo_members(position, canonical_model)',
        )
        .eq('user_id', userId);
    if (error || !data) {
        return [];
    }
    return mapComboRows(data);
}
