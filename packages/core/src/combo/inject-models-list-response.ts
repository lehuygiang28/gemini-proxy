import { normalizeGeminiModelId } from '../constants/gemini-pricing';
import type { ProxyApiFormat } from '../types';
import type { StoredCombo } from './combo-types';
import { mergeModelList } from './merge-model-list';

export function injectModelsListResponse(input: {
    readonly apiFormat: ProxyApiFormat;
    readonly originBodyText: string;
    readonly combos: readonly StoredCombo[];
    readonly catalogIds: readonly string[];
    readonly builtinIds: readonly string[];
    readonly allowedModels: readonly string[] | null;
}): string {
    let parsed: unknown;
    try {
        parsed = JSON.parse(input.originBodyText);
    } catch {
        return input.originBodyText;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return input.originBodyText;
    }
    const root = parsed as Record<string, unknown>;
    const googleIds = extractGoogleIds(input.apiFormat, root);
    const merged = mergeModelList({
        googleIds,
        catalogIds: input.catalogIds,
        builtinIds: input.builtinIds,
        combos: input.combos,
        allowedModels: input.allowedModels,
    });
    if (input.apiFormat === 'openai') {
        const original = Array.isArray(root.data) ? (root.data as Array<Record<string, unknown>>) : [];
        const byId = new Map(
            original.map((row) => [normalizeGeminiModelId(String(row.id ?? '')), row]),
        );
        return JSON.stringify({
            ...root,
            data: merged.map((entry) => {
                if (entry.source === 'combo') {
                    return {
                        id: entry.id,
                        object: 'model',
                        owned_by: 'gproxy-combo',
                        description: entry.description,
                    };
                }
                return (
                    byId.get(entry.id) ?? {
                        id: entry.id,
                        object: 'model',
                        owned_by: 'google',
                    }
                );
            }),
        });
    }
    const original = Array.isArray(root.models)
        ? (root.models as Array<Record<string, unknown>>)
        : [];
    const byId = new Map(
        original.map((row) => [normalizeGeminiModelId(String(row.name ?? '')), row]),
    );
    return JSON.stringify({
        ...root,
        models: merged.map((entry) => {
            if (entry.source === 'combo') {
                return {
                    name: `models/${entry.id}`,
                    description: entry.description,
                };
            }
            return byId.get(entry.id) ?? { name: `models/${entry.id}` };
        }),
    });
}

function extractGoogleIds(apiFormat: ProxyApiFormat, root: Record<string, unknown>): string[] {
    if (apiFormat === 'openai') {
        if (!Array.isArray(root.data)) {
            return [];
        }
        return root.data
            .map((row) =>
                row !== null && typeof row === 'object' && 'id' in row
                    ? String((row as { id: unknown }).id)
                    : '',
            )
            .filter((id) => id !== '');
    }
    if (!Array.isArray(root.models)) {
        return [];
    }
    return root.models
        .map((row) =>
            row !== null && typeof row === 'object' && 'name' in row
                ? String((row as { name: unknown }).name)
                : '',
        )
        .filter((name) => name !== '');
}
