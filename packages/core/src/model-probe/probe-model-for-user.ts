import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { probeGeminiModel, type ProbeGeminiModelResult } from './probe-gemini-model';

export type ProbeModelForUserResult =
    | ProbeGeminiModelResult
    | { readonly ok: false; readonly message: 'no_api_key' | 'api_key_not_found' };

export async function probeModelForUser(input: {
    readonly supabase: SupabaseClient<Database>;
    readonly userId: string;
    readonly modelId: string;
    readonly apiKeyId?: string;
    readonly geminiBaseUrl?: string;
    readonly fetchImpl?: typeof fetch;
}): Promise<ProbeModelForUserResult> {
    let query = input.supabase
        .from('api_keys')
        .select('id, api_key_value')
        .eq('user_id', input.userId)
        .is('deleted_at', null);
    if (input.apiKeyId) {
        const { data: apiKey, error: keyError } = await query
            .eq('id', input.apiKeyId)
            .maybeSingle();
        if (keyError || !apiKey?.api_key_value) {
            return { ok: false, message: 'api_key_not_found' };
        }
        return probeGeminiModel({
            apiKeyValue: apiKey.api_key_value,
            modelId: input.modelId,
            geminiBaseUrl: input.geminiBaseUrl,
            fetchImpl: input.fetchImpl,
        });
    }
    const { data: apiKey, error: keyError } = await query
        .eq('is_active', true)
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .order('last_error_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle();
    if (keyError || !apiKey?.api_key_value) {
        return { ok: false, message: 'no_api_key' };
    }
    return probeGeminiModel({
        apiKeyValue: apiKey.api_key_value,
        modelId: input.modelId,
        geminiBaseUrl: input.geminiBaseUrl,
        fetchImpl: input.fetchImpl,
    });
}
