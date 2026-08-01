'use client';

import type { CrudFilter, CrudFilters, LiveProvider } from '@refinedev/core';
import { liveProvider as createSupabaseLiveProvider } from '@refinedev/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Realtime filter for IS NULL must be `column=is.null`.
 * @refinedev/supabase maps operator `null` → `is` but keeps Refine's
 * sentinel `value: true`, producing invalid `column=is.true`.
 */
function toRealtimeFilters(filters?: CrudFilters): CrudFilters | undefined {
    if (!filters?.length) {
        return filters;
    }

    return filters.map((filter: CrudFilter): CrudFilter => {
        if (!('field' in filter)) {
            return filter;
        }
        if (filter.operator === 'null' || filter.operator === 'nnull') {
            return { ...filter, value: null };
        }
        return filter;
    });
}

/**
 * Refine liveProvider for Supabase with correct null-filter encoding.
 */
export function createLiveProvider(supabaseClient: SupabaseClient): LiveProvider {
    const base = createSupabaseLiveProvider(supabaseClient);

    return {
        ...base,
        subscribe: (options) => {
            return base.subscribe({
                ...options,
                params: {
                    ...options.params,
                    filters: toRealtimeFilters(options.params?.filters),
                },
            });
        },
    };
}
