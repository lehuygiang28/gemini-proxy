'use client';

import type { BaseRecord, DataProvider, GetListResponse } from '@refinedev/core';
import { generateFilter, handleError } from '@refinedev/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveRequestLogQueryField, supabaseOrderOptions } from './supabase-order-options';

type GetListParams = Parameters<NonNullable<DataProvider['getList']>>[0];

/**
 * Same as @refinedev/supabase getList, with nullsLast on estimated_speed_tok_per_s.
 * Success payload is asserted to TData[] — supabase-js types select errors as GenericStringError[].
 */
export async function getRequestLogList<TData extends BaseRecord = BaseRecord>(
    supabaseClient: SupabaseClient,
    { resource, pagination, filters, sorters, meta }: GetListParams,
): Promise<GetListResponse<TData>> {
    const { currentPage = 1, pageSize = 10, mode = 'server' } = pagination ?? {};
    const client = meta?.schema ? supabaseClient.schema(meta.schema) : supabaseClient;
    const query = client.from(resource).select(meta?.select ?? '*', {
        count: meta?.count ?? 'exact',
    });

    if (mode === 'server') {
        query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    }

    sorters?.forEach((item) => {
        const resolvedField = resolveRequestLogQueryField(item.field);
        if (resolvedField.includes('->')) {
            query.order(resolvedField, supabaseOrderOptions({ ...item, field: resolvedField }));
            return;
        }
        const [foreignTable, field] = resolvedField.split(/\.(?=[^.]+$)/);
        if (foreignTable && field) {
            query.select(meta?.select ?? `*, ${foreignTable}(${field})`).order(field, {
                ascending: item.order === 'asc',
                foreignTable,
            });
            return;
        }
        query.order(resolvedField, supabaseOrderOptions({ ...item, field: resolvedField }));
    });

    filters?.forEach((item) => {
        if ('field' in item && typeof item.field === 'string') {
            generateFilter({ ...item, field: resolveRequestLogQueryField(item.field) }, query);
            return;
        }
        generateFilter(item, query);
    });

    const { data, count, error } = await query;
    if (error) {
        await handleError(error);
    }
    return {
        data: (data ?? []) as unknown as TData[],
        total: count ?? 0,
    };
}
