import type { CrudFilter, LogicalFilter } from '@refinedev/core';
import type { FilterValue } from 'antd/es/table/interface';

export const REQUEST_LOG_MODEL_FIELD = 'usage_metadata->>model';
export const REQUEST_LOG_DATE_GTE_FIELD = 'created_at';
export const REQUEST_LOG_DATE_LTE_FIELD = 'created_at';

function isLogicalFilter(filter: CrudFilter): filter is LogicalFilter {
    return 'field' in filter;
}

export function findFilter(filters: CrudFilter[], field: string): LogicalFilter | undefined {
    return filters.find(
        (filter) => isLogicalFilter(filter) && filter.field === field,
    ) as LogicalFilter | undefined;
}

export function getFilterScalar(filters: CrudFilter[], field: string): unknown {
    return findFilter(filters, field)?.value;
}

export function getColumnFilteredValue(
    filters: CrudFilter[],
    field: string,
): FilterValue | null {
    const match = findFilter(filters, field);
    if (match?.value === undefined || match.value === null) {
        return null;
    }
    if (Array.isArray(match.value)) {
        return match.value as FilterValue;
    }
    return [match.value] as FilterValue;
}

export function replaceFiltersForFields(
    filters: CrudFilter[],
    fieldsToReplace: string[],
    nextForFields: LogicalFilter[],
): CrudFilter[] {
    const fieldSet = new Set(fieldsToReplace);
    const preserved = filters.filter(
        (filter) => !(isLogicalFilter(filter) && fieldSet.has(String(filter.field))),
    );
    return [...preserved, ...nextForFields];
}

export function upsertEqFilter(
    filters: CrudFilter[],
    field: string,
    value: unknown,
): CrudFilter[] {
    const withoutField = filters.filter(
        (filter) => !(isLogicalFilter(filter) && filter.field === field),
    );
    if (value === undefined || value === null || value === '') {
        return withoutField;
    }
    return [...withoutField, { field, operator: 'eq', value }];
}

export function upsertContainsFilter(
    filters: CrudFilter[],
    field: string,
    value: string | undefined,
): CrudFilter[] {
    const withoutField = filters.filter(
        (filter) => !(isLogicalFilter(filter) && filter.field === field),
    );
    const trimmed = value?.trim();
    if (!trimmed) {
        return withoutField;
    }
    return [...withoutField, { field, operator: 'contains', value: trimmed }];
}

export function upsertDateRangeFilters(
    filters: CrudFilter[],
    range: [string, string] | null | undefined,
): CrudFilter[] {
    const withoutDate = filters.filter(
        (filter) =>
            !(
                isLogicalFilter(filter) &&
                filter.field === REQUEST_LOG_DATE_GTE_FIELD &&
                (filter.operator === 'gte' || filter.operator === 'lte')
            ),
    );
    if (!range || range.length !== 2) {
        return withoutDate;
    }
    return [
        ...withoutDate,
        { field: REQUEST_LOG_DATE_GTE_FIELD, operator: 'gte', value: range[0] },
        { field: REQUEST_LOG_DATE_LTE_FIELD, operator: 'lte', value: range[1] },
    ];
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

export function clearAllLogFilters(): CrudFilter[] {
    return [];
}
