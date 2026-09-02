'use client';

import type { DataProvider } from '@refinedev/core';
import { generateFilter, handleError } from '@refinedev/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseOrderOptions } from './supabase-order-options';

type GetListParams = Parameters<NonNullable<DataProvider['getList']>>[0];

/**
 * Same as @refinedev/supabase getList, with nullsLast on estimated_speed_tok_per_s.
 */
export async function getRequestLogList(
    supabaseClient: SupabaseClient,
    { resource, pagination, filters, sorters, meta }: GetListParams,
) {
    const { currentPage = 1, pageSize = 10, mode = 'server' } = pagination ?? {};
    const client = meta?.schema ? supabaseClient.schema(meta.schema) : supabaseClient;
    const query = client.from(resource).select(meta?.select ?? '*', {
        count: meta?.count ?? 'exact',
    });

    if (mode === 'server') {
        query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    }

    sorters?.forEach((item) => {
        const [foreignTable, field] = item.field.split(/\.(?=[^.]+$)/);
        if (foreignTable && field) {
            query.select(meta?.select ?? `*, ${foreignTable}(${field})`).order(field, {
                ascending: item.order === 'asc',
                foreignTable,
            });
            return;
        }
        query.order(item.field, supabaseOrderOptions(item));
    });

    filters?.forEach((item) => {
        generateFilter(item, query);
    });

    const { data, count, error } = await query;
    if (error) {
        return handleError(error);
    }
    return {
        data: data || [],
        total: count || 0,
    };
}
