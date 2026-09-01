export const COMBO_STRATEGIES = ['fallback', 'sticky_until_error', 'stick_n'] as const;

export type ComboStrategy = (typeof COMBO_STRATEGIES)[number];

export type StoredCombo = {
    readonly id: string;
    readonly name: string;
    readonly isActive: boolean;
    readonly strategy: ComboStrategy | null;
    readonly stickAfterSuccesses: number | null;
    readonly members: readonly string[];
};

export type ResolvedCombo =
    | { readonly kind: 'combo'; readonly combo: StoredCombo; readonly members: readonly string[] }
    | { readonly kind: 'single'; readonly members: readonly string[] };

export type EffectiveComboStrategy = {
    readonly strategy: ComboStrategy;
    readonly stickAfterSuccesses: number | null;
};

export type ComboAttempt = {
    readonly apiKeyId: string;
    readonly canonicalModel: string;
};
