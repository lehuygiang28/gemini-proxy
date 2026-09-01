import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { parseGoogleModelsList } from './parse-google-models-list';

function isHttpsBaseUrl(raw: string): boolean {
    try {
        return new URL(raw).protocol === 'https:';
    } catch {
        return false;
    }
}

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
    if (!isHttpsBaseUrl(base)) {
        return { ok: false };
    }
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
                redirect: 'error',
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
    if (models === null) {
        return { ok: false };
    }
    const { data: customRows, error: customError } = await input.supabase
        .from('user_model_catalog')
        .select('model_id')
        .eq('user_id', input.userId)
        .eq('source', 'custom');
    if (customError) {
        return { ok: false };
    }
    const customIds = new Set((customRows ?? []).map((row) => row.model_id));
    const payload = models
        .filter((model) => !customIds.has(model.modelId))
        .map((model) => ({
            model_id: model.modelId,
            display_name: model.displayName,
            supports_generate: model.supportsGenerate,
        }));
    const { data: count, error: replaceError } = await input.supabase.rpc(
        'replace_user_google_live_catalog',
        { p_models: payload },
    );
    if (replaceError) {
        return { ok: false };
    }
    return { ok: true, count: typeof count === 'number' ? count : payload.length };
}
