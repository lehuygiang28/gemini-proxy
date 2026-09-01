import { listBuiltinModelPricingRows } from '@gemini-proxy/pricing';

const FLASH_IDS = [
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
] as const;

export type ComboPresetKind = 'flash' | 'pro' | 'gemma';

export function fillComboPreset(
    kind: ComboPresetKind,
    availableIds: readonly string[],
): { name: string; models: string[] } {
    const available = new Set(availableIds);
    if (kind === 'flash') {
        return {
            name: 'flash-combo',
            models: FLASH_IDS.filter((id) => available.has(id)),
        };
    }
    if (kind === 'pro') {
        return {
            name: 'pro-combo',
            models: listBuiltinModelPricingRows()
                .filter(
                    (row) =>
                        row.modelId.startsWith('gemini-') &&
                        row.modelId.includes('pro') &&
                        available.has(row.modelId),
                )
                .map((row) => row.modelId),
        };
    }
    return {
        name: 'gemma-combo',
        models: listBuiltinModelPricingRows()
            .filter((row) => row.family === 'gemma' && available.has(row.modelId))
            .map((row) => row.modelId),
    };
}
