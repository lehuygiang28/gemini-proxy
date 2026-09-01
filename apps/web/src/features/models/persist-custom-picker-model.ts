import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from '@gemini-proxy/database';

type CatalogRow = Tables<'user_model_catalog'>;

export async function persistCustomPickerModel(input: {
    readonly supabase: SupabaseClient<Database>;
    readonly userId: string;
    readonly modelId: string;
    readonly inputPerMillion: number | null;
    readonly outputPerMillion: number | null;
}): Promise<{ ok: true } | { ok: false }> {
    const { data: existing, error: existingError } = await input.supabase
        .from('user_model_catalog')
        .select('user_id, model_id, source, display_name, supports_generate, refreshed_at')
        .eq('user_id', input.userId)
        .eq('model_id', input.modelId)
        .maybeSingle();
    if (existingError) {
        return { ok: false };
    }

    const { error: catalogError } = await input.supabase.from('user_model_catalog').upsert({
        user_id: input.userId,
        model_id: input.modelId,
        source: 'custom',
        supports_generate: true,
    });
    if (catalogError) {
        return { ok: false };
    }

    if (input.inputPerMillion == null && input.outputPerMillion == null) {
        return { ok: true };
    }

    const { data: settings, error: settingsReadError } = await input.supabase
        .from('user_settings')
        .select('id, custom_model_pricing')
        .eq('id', input.userId)
        .maybeSingle();
    if (settingsReadError) {
        await compensateCatalogMutation(input, existing);
        return { ok: false };
    }

    const current =
        settings?.custom_model_pricing &&
        typeof settings.custom_model_pricing === 'object' &&
        !Array.isArray(settings.custom_model_pricing)
            ? settings.custom_model_pricing
            : {};
    const pricing: Json = {
        ...current,
        [input.modelId]: {
            inputPerMillion: input.inputPerMillion ?? 0,
            outputPerMillion: input.outputPerMillion ?? 0,
        },
    };
    const { error: pricingError } = settings?.id
        ? await input.supabase
              .from('user_settings')
              .update({ custom_model_pricing: pricing })
              .eq('id', settings.id)
        : await input.supabase.from('user_settings').insert({
              id: input.userId,
              custom_model_pricing: pricing,
          });
    if (pricingError) {
        await compensateCatalogMutation(input, existing);
        return { ok: false };
    }
    return { ok: true };
}

async function compensateCatalogMutation(
    input: {
        readonly supabase: SupabaseClient<Database>;
        readonly userId: string;
        readonly modelId: string;
    },
    previous: CatalogRow | null,
): Promise<void> {
    if (previous == null) {
        await input.supabase
            .from('user_model_catalog')
            .delete()
            .eq('user_id', input.userId)
            .eq('model_id', input.modelId)
            .eq('source', 'custom');
        return;
    }
    await input.supabase.from('user_model_catalog').upsert({
        user_id: previous.user_id,
        model_id: previous.model_id,
        source: previous.source,
        display_name: previous.display_name,
        supports_generate: previous.supports_generate,
        refreshed_at: previous.refreshed_at,
    });
}
