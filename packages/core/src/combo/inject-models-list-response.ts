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
        const original = objectRows(root.data);
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
    const original = objectRows(root.models);
    const byId = new Map(
        original.map((row) => [normalizeGeminiModelId(String(row.name ?? '')), row]),
    );
    return JSON.stringify({
        ...root,
        models: merged.map((entry) => {
            if (entry.source === 'combo') {
                return {
                    name: `models/${entry.id}`,
                    displayName: entry.id,
                    description: entry.description,
                    supportedGenerationMethods: ['generateContent'],
                };
            }
            return byId.get(entry.id) ?? { name: `models/${entry.id}` };
        }),
    });
}

function extractGoogleIds(apiFormat: ProxyApiFormat, root: Record<string, unknown>): string[] {
    const rows = objectRows(apiFormat === 'openai' ? root.data : root.models);
    const key = apiFormat === 'openai' ? 'id' : 'name';
    return rows.map((row) => (key in row ? String(row[key] ?? '') : '')).filter((id) => id !== '');
}

function objectRows(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(
        (row): row is Record<string, unknown> =>
            row !== null && typeof row === 'object' && !Array.isArray(row),
    );
}
