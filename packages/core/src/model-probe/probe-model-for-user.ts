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
    const query = input.supabase
        .from('api_keys')
        .select('id, api_key_value')
        .eq('user_id', input.userId)
        .eq('is_active', true)
        .is('deleted_at', null);
    const { data: apiKey, error: keyError } = await (input.apiKeyId
        ? query.eq('id', input.apiKeyId).maybeSingle()
        : query.limit(1).maybeSingle());
    if (keyError || !apiKey?.api_key_value) {
        return input.apiKeyId
            ? { ok: false, message: 'api_key_not_found' }
            : { ok: false, message: 'no_api_key' };
    }
    return probeGeminiModel({
        apiKeyValue: apiKey.api_key_value,
        modelId: input.modelId,
        geminiBaseUrl: input.geminiBaseUrl,
        fetchImpl: input.fetchImpl,
    });
}
