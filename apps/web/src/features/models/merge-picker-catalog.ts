import { mergeModelList, type StoredCombo } from '@gemini-proxy/core';

export type PickerModelMode = 'concrete' | 'requestName';

export type PickerModelEntry = {
    readonly id: string;
    readonly source: 'combo' | 'catalog' | 'builtin' | 'google';
    readonly group: 'combos' | 'gemini' | 'gemma' | 'custom';
    readonly overrides: boolean;
    readonly description: string | null;
};

export function mergePickerCatalog(input: {
    readonly mode: PickerModelMode;
    readonly googleIds: readonly string[];
    readonly catalogIds: readonly string[];
    readonly builtinIds: readonly string[];
    readonly combos: readonly StoredCombo[];
}): PickerModelEntry[] {
    const merged = mergeModelList({
        googleIds: input.googleIds,
        catalogIds: input.catalogIds,
        builtinIds: input.builtinIds,
        combos: input.mode === 'requestName' ? input.combos : [],
        allowedModels: null,
    });
    return merged.map((entry) => ({
        id: entry.id,
        source: entry.source,
        overrides: entry.overrides,
        description: entry.description,
        group: groupFor(entry.id, entry.source),
    }));
}

function groupFor(id: string, source: PickerModelEntry['source']): PickerModelEntry['group'] {
    if (source === 'combo') {
        return 'combos';
    }
    if (source === 'catalog') {
        return 'custom';
    }
    if (id.startsWith('gemma-')) {
        return 'gemma';
    }
    return 'gemini';
}
