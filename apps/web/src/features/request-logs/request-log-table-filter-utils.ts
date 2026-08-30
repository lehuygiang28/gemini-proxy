import type { CrudFilter, LogicalFilter } from '@refinedev/core';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export const REQUEST_LOG_MODEL_FIELD = 'usage_metadata->>model';
export const REQUEST_LOG_DATE_GTE_FIELD = 'created_at';
export const REQUEST_LOG_DATE_LTE_FIELD = 'created_at';

export interface RequestLogSearch {
    request_id?: string;
    model?: string;
    api_format?: string;
    is_successful?: boolean;
    is_stream?: boolean;
    api_key_id?: string;
    proxy_key_id?: string;
    date_range?: [Dayjs | string, Dayjs | string] | null;
}

function isLogicalFilter(filter: CrudFilter): filter is LogicalFilter {
    return 'field' in filter;
}

function toIsoTimestamp(value: Dayjs | string): string {
    return dayjs.isDayjs(value) ? value.toISOString() : value;
}

/**
 * Maps Refine search form values to Supabase CrudFilters (used by useTable onSearch).
 */
export function buildRequestLogSearchFilters(values: RequestLogSearch): CrudFilter[] {
    const filters: CrudFilter[] = [];

    const requestId = values.request_id?.trim();
    if (requestId) {
        filters.push({ field: 'request_id', operator: 'contains', value: requestId });
    }

    const model = values.model?.trim();
    if (model) {
        filters.push({ field: REQUEST_LOG_MODEL_FIELD, operator: 'contains', value: model });
    }

    if (values.api_format) {
        filters.push({ field: 'api_format', operator: 'eq', value: values.api_format });
    }

    if (values.is_successful !== undefined && values.is_successful !== null) {
        filters.push({ field: 'is_successful', operator: 'eq', value: values.is_successful });
    }

    if (values.is_stream !== undefined && values.is_stream !== null) {
        filters.push({ field: 'is_stream', operator: 'eq', value: values.is_stream });
    }

    if (values.api_key_id) {
        filters.push({ field: 'api_key_id', operator: 'eq', value: values.api_key_id });
    }

    if (values.proxy_key_id) {
        filters.push({ field: 'proxy_key_id', operator: 'eq', value: values.proxy_key_id });
    }

    if (values.date_range?.[0] && values.date_range[1]) {
        filters.push({
            field: REQUEST_LOG_DATE_GTE_FIELD,
            operator: 'gte',
            value: toIsoTimestamp(values.date_range[0]),
        });
        filters.push({
            field: REQUEST_LOG_DATE_LTE_FIELD,
            operator: 'lte',
            value: toIsoTimestamp(values.date_range[1]),
        });
    }

    return filters;
}

export function buildRequestLogDeepLinkInitialFilters(searchParams: URLSearchParams): CrudFilter[] {
    const filters: CrudFilter[] = [];
    const apiKeyId = searchParams.get('api_key_id');
    const proxyKeyId = searchParams.get('proxy_key_id');

    if (proxyKeyId) {
        filters.push({ field: 'proxy_key_id', operator: 'eq', value: proxyKeyId });
    }
    if (apiKeyId) {
        filters.push({ field: 'api_key_id', operator: 'eq', value: apiKeyId });
    }

    return filters;
}

export function buildRequestLogDeepLinkInitialValues(
    searchParams: URLSearchParams,
): Partial<RequestLogSearch> {
    const apiKeyId = searchParams.get('api_key_id');
    const proxyKeyId = searchParams.get('proxy_key_id');

    return {
        api_key_id: apiKeyId ?? undefined,
        proxy_key_id: proxyKeyId ?? undefined,
    };
}

export function findFilter(filters: CrudFilter[], field: string): LogicalFilter | undefined {
    return filters.find(
        (filter) => isLogicalFilter(filter) && filter.field === field,
    ) as LogicalFilter | undefined;
}

export function getFilterScalar(filters: CrudFilter[], field: string): unknown {
    return findFilter(filters, field)?.value;
}

export function hasActiveFilter(filters: CrudFilter[], field: string): boolean {
    const value = getFilterScalar(filters, field);
    return value !== undefined && value !== null && value !== '';
}

export function getDateRangeFromFilters(filters: CrudFilter[]): [string, string] | null {
    const gte = filters.find(
        (filter) =>
            isLogicalFilter(filter) &&
            filter.field === REQUEST_LOG_DATE_GTE_FIELD &&
            filter.operator === 'gte',
    )?.value;
    const lte = filters.find(
        (filter) =>
            isLogicalFilter(filter) &&
            filter.field === REQUEST_LOG_DATE_LTE_FIELD &&
            filter.operator === 'lte',
    )?.value;
    if (typeof gte === 'string' && typeof lte === 'string') {
        return [gte, lte];
    }
    return null;
}

const COUNTABLE_FILTER_FIELDS = new Set([
    'request_id',
    REQUEST_LOG_MODEL_FIELD,
    'api_format',
    'is_successful',
    'is_stream',
    'api_key_id',
    'proxy_key_id',
    REQUEST_LOG_DATE_GTE_FIELD,
]);

export function countActiveLogFilters(filters: CrudFilter[]): number {
    let count = 0;
    let hasDateRange = false;
    for (const filter of filters) {
        if (!isLogicalFilter(filter)) {
            continue;
        }
        const field = String(filter.field);
        if (!COUNTABLE_FILTER_FIELDS.has(field)) {
            continue;
        }
        if (field === REQUEST_LOG_DATE_GTE_FIELD && filter.operator === 'gte') {
            if (!hasDateRange) {
                count += 1;
                hasDateRange = true;
            }
            continue;
        }
        if (field === REQUEST_LOG_DATE_LTE_FIELD && filter.operator === 'lte') {
            continue;
        }
        if (filter.value !== undefined && filter.value !== null && filter.value !== '') {
            count += 1;
        }
    }
    return count;
}
