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
    refreshed_at?: string | null;
};

export function useModelCatalog(mode: PickerModelMode): {
    entries: PickerModelEntry[];
    catalogIds: string[];
    googleIds: string[];
    builtinIds: string[];
    lastGoogleSyncAt: string | null;
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
    const googleIds = useMemo(
        () =>
            (catalogResult?.data ?? [])
                .filter((row) => row.source === 'google_live')
                .map((row) => row.model_id),
        [catalogResult?.data],
    );
    const catalogIds = useMemo(
        () =>
            (catalogResult?.data ?? [])
                .filter((row) => row.source === 'custom')
                .map((row) => row.model_id),
        [catalogResult?.data],
    );
    const lastGoogleSyncAt = useMemo(() => {
        const times = (catalogResult?.data ?? [])
            .filter((row) => row.source === 'google_live' && row.refreshed_at)
            .map((row) => row.refreshed_at as string);
        if (times.length === 0) {
            return null;
        }
        return times.reduce((latest, stamp) => (stamp > latest ? stamp : latest));
    }, [catalogResult?.data]);
    const entries = useMemo(
        () =>
            mergePickerCatalog({
                mode,
                googleIds,
                catalogIds,
                builtinIds,
                combos,
            }),
        [mode, googleIds, catalogIds, builtinIds, combos],
    );
    return { entries, catalogIds, googleIds, builtinIds, lastGoogleSyncAt };
}
