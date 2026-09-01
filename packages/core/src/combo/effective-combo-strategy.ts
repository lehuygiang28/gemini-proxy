import type { ComboStrategy, EffectiveComboStrategy } from './combo-types';

export function effectiveComboStrategy(input: {
    readonly globalStrategy: ComboStrategy;
    readonly globalStickAfterSuccesses: number | null;
    readonly comboStrategy: ComboStrategy | null;
    readonly comboStickAfterSuccesses: number | null;
}): EffectiveComboStrategy {
    const strategy = input.comboStrategy ?? input.globalStrategy;
    const stickAfterSuccesses = input.comboStickAfterSuccesses ?? input.globalStickAfterSuccesses;
    if (strategy !== 'stick_n') {
        return { strategy, stickAfterSuccesses: null };
    }
    if (stickAfterSuccesses == null) {
        return { strategy: 'fallback', stickAfterSuccesses: null };
    }
    return { strategy: 'stick_n', stickAfterSuccesses };
}
