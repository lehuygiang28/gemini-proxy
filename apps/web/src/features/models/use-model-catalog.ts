'use client';

import { useMemo } from 'react';
import { useList } from '@refinedev/core';
import { listBuiltinModelPricingRows } from '@gemini-proxy/pricing';
import type { StoredCombo } from '@gemini-proxy/core';
import {
    mergePickerCatalog,
    type PickerModelEntry,
    type PickerModelMode,
} from './merge-picker-catalog';

type ComboRow = {
    id: string;
    name: string;
    is_active: boolean;
    strategy: StoredCombo['strategy'];
    stick_after_successes: number | null;
    model_combo_members?: Array<{ position: number; canonical_model: string }>;
};

type CatalogRow = {
    model_id: string;
    source: string;
    display_name: string | null;
};

export function useModelCatalog(mode: PickerModelMode): {
    entries: PickerModelEntry[];
    catalogIds: string[];
    builtinIds: string[];
} {
    const builtinIds = useMemo(() => listBuiltinModelPricingRows().map((row) => row.modelId), []);
    const { result: comboResult } = useList<ComboRow>({
        resource: 'model_combos',
        pagination: { currentPage: 1, pageSize: 500 },
        meta: {
            select: 'id, name, is_active, strategy, stick_after_successes, model_combo_members(position, canonical_model)',
        },
    });
    const { result: catalogResult } = useList<CatalogRow>({
        resource: 'user_model_catalog',
        pagination: { currentPage: 1, pageSize: 1000 },
    });
    const combos: StoredCombo[] = useMemo(
        () =>
            (comboResult?.data ?? []).map((row) => ({
                id: row.id,
                name: row.name,
                isActive: row.is_active,
                strategy: row.strategy,
                stickAfterSuccesses: row.stick_after_successes,
                members: [...(row.model_combo_members ?? [])]
                    .sort((left, right) => left.position - right.position)
                    .map((member) => member.canonical_model),
            })),
        [comboResult?.data],
    );
    const catalogIds = useMemo(
        () => (catalogResult?.data ?? []).map((row) => row.model_id),
        [catalogResult?.data],
    );
    const entries = useMemo(
        () =>
            mergePickerCatalog({
                mode,
                googleIds: catalogIds.filter((id) =>
                    (catalogResult?.data ?? []).some(
                        (row) => row.model_id === id && row.source === 'google_live',
                    ),
                ),
                catalogIds,
                builtinIds,
                combos,
            }),
        [mode, catalogIds, builtinIds, combos, catalogResult?.data],
    );
    return { entries, catalogIds, builtinIds };
}
