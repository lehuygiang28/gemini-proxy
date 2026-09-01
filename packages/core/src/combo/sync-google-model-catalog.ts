import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { parseGoogleModelsList } from './parse-google-models-list';

export async function syncGoogleModelCatalog(input: {
    readonly supabase: SupabaseClient<Database>;
    readonly userId: string;
    readonly fetchImpl?: typeof fetch;
    readonly geminiBaseUrl?: string;
}): Promise<{ ok: true; count: number } | { ok: false }> {
    const fetchImpl = input.fetchImpl ?? fetch;
    const base = (input.geminiBaseUrl ?? 'https://generativelanguage.googleapis.com/').replace(
        /\/?$/,
        '/',
    );
    const { data: apiKey, error: keyError } = await input.supabase
        .from('api_keys')
        .select('id, api_key_value')
        .eq('user_id', input.userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();
    if (keyError || !apiKey?.api_key_value) {
        return { ok: false };
    }
    let response: Response;
    try {
        response = await fetchImpl(
            new Request(`${base}v1beta/models`, {
                headers: { 'x-goog-api-key': apiKey.api_key_value },
            }),
        );
    } catch {
        return { ok: false };
    }
    if (!response.ok) {
        return { ok: false };
    }
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        return { ok: false };
    }
    const models = parseGoogleModelsList(body);
    const { error: deleteError } = await input.supabase
        .from('user_model_catalog')
        .delete()
        .eq('user_id', input.userId)
        .eq('source', 'google_live');
    if (deleteError) {
        return { ok: false };
    }
    if (models.length > 0) {
        const { error: insertError } = await input.supabase.from('user_model_catalog').insert(
            models.map((model) => ({
                user_id: input.userId,
                model_id: model.modelId,
                display_name: model.displayName,
                source: 'google_live',
                supports_generate: model.supportsGenerate,
            })),
        );
        if (insertError) {
            return { ok: false };
        }
    }
    return { ok: true, count: models.length };
}
