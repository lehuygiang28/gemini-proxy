import { COMBO_STRATEGIES, type ComboStrategy, type StoredCombo } from './combo-types';

export type ComboRowInput = {
    readonly id: string;
    readonly name: string;
    readonly is_active: boolean;
    readonly strategy: string | null;
    readonly stick_after_successes: number | null;
    readonly model_combo_members?: ReadonlyArray<{
        readonly position: number;
        readonly canonical_model: string;
    }> | null;
};

export function mapComboRows(rows: readonly ComboRowInput[]): StoredCombo[] {
    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        isActive: row.is_active,
        strategy: toComboStrategy(row.strategy),
        stickAfterSuccesses: row.stick_after_successes,
        members: [...(row.model_combo_members ?? [])]
            .sort((left, right) => left.position - right.position)
            .map((member) => member.canonical_model),
    }));
}

function toComboStrategy(value: string | null): ComboStrategy | null {
    return COMBO_STRATEGIES.includes(value as ComboStrategy) ? (value as ComboStrategy) : null;
}
