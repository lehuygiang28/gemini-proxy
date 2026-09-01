import { normalizeGeminiModelId } from '../constants/gemini-pricing';
import type { ResolvedCombo, StoredCombo } from './combo-types';

export function resolveCombo(input: {
    readonly combos: readonly StoredCombo[];
    readonly requestedModel: string;
}): ResolvedCombo {
    const requested = normalizeGeminiModelId(input.requestedModel);
    const combo = input.combos.find((row) => row.isActive && row.name === requested);
    if (!combo) {
        return { kind: 'single', members: [requested] };
    }
    return { kind: 'combo', combo, members: combo.members };
}
