import { normalizeGeminiModelId } from '../constants/gemini-pricing';
import { globModel } from '../policy/match-model-policy';
import type { StoredCombo } from './combo-types';

export type MergedModelEntry = {
    readonly id: string;
    readonly source: 'combo' | 'catalog' | 'builtin' | 'google';
    readonly overrides: boolean;
    readonly description: string | null;
    readonly members: readonly string[] | null;
};

export function mergeModelList(input: {
    readonly googleIds: readonly string[];
    readonly catalogIds: readonly string[];
    readonly builtinIds: readonly string[];
    readonly combos: readonly StoredCombo[];
    readonly allowedModels: readonly string[] | null;
}): MergedModelEntry[] {
    const byId = new Map<string, MergedModelEntry>();
    const occupied = new Set<string>();
    const add = (entry: MergedModelEntry, overwrite: boolean): void => {
        if (!overwrite && occupied.has(entry.id)) {
            return;
        }
        byId.set(entry.id, entry);
        occupied.add(entry.id);
    };
    for (const combo of input.combos) {
        if (!combo.isActive) {
            continue;
        }
        const id = normalizeGeminiModelId(combo.name);
        const overrides =
            input.googleIds.some((googleId) => normalizeGeminiModelId(googleId) === id) ||
            input.catalogIds.some((catalogId) => normalizeGeminiModelId(catalogId) === id) ||
            input.builtinIds.some((builtinId) => normalizeGeminiModelId(builtinId) === id);
        add(
            {
                id,
                source: 'combo',
                overrides,
                description: `Combo: ${combo.members.join(' → ')}`,
                members: combo.members,
            },
            true,
        );
    }
    for (const catalogId of input.catalogIds) {
        add(plainEntry(catalogId, 'catalog'), false);
    }
    for (const builtinId of input.builtinIds) {
        add(plainEntry(builtinId, 'builtin'), false);
    }
    for (const googleId of input.googleIds) {
        add(plainEntry(googleId, 'google'), false);
    }
    const merged = [...byId.values()];
    if (input.allowedModels == null || input.allowedModels.length === 0) {
        return merged;
    }
    return merged.filter((entry) =>
        input.allowedModels!.some((pattern) => globModel(pattern, entry.id)),
    );
}

function plainEntry(rawId: string, source: 'catalog' | 'builtin' | 'google'): MergedModelEntry {
    return {
        id: normalizeGeminiModelId(rawId),
        source,
        overrides: false,
        description: null,
        members: null,
    };
}
