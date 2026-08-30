import { describe, expect, it } from 'vitest';
import type { CrudFilter } from '@refinedev/core';
import {
    REQUEST_LOG_MODEL_FIELD,
    countActiveLogFilters,
    getDateRangeFromFilters,
    getFilterScalar,
    upsertContainsFilter,
    upsertDateRangeFilters,
    upsertEqFilter,
} from './request-log-table-filter-utils';

describe('request-log-table-filter-utils', () => {
    it('upsertEqFilter adds, updates, and removes filters', () => {
        const base: CrudFilter[] = [{ field: 'api_format', operator: 'eq', value: 'gemini' }];

        const withStatus = upsertEqFilter(base, 'is_successful', true);
        expect(getFilterScalar(withStatus, 'is_successful')).toBe(true);
        expect(withStatus).toHaveLength(2);

        const updated = upsertEqFilter(withStatus, 'is_successful', false);
        expect(getFilterScalar(updated, 'is_successful')).toBe(false);

        const cleared = upsertEqFilter(updated, 'is_successful', undefined);
        expect(getFilterScalar(cleared, 'is_successful')).toBeUndefined();
        expect(cleared).toHaveLength(1);
    });

    it('upsertContainsFilter trims and removes empty values', () => {
        const filters = upsertContainsFilter([], REQUEST_LOG_MODEL_FIELD, '  gemini-pro  ');
        expect(getFilterScalar(filters, REQUEST_LOG_MODEL_FIELD)).toBe('gemini-pro');

        const cleared = upsertContainsFilter(filters, REQUEST_LOG_MODEL_FIELD, '   ');
        expect(cleared).toHaveLength(0);
    });

    it('upsertDateRangeFilters replaces prior date bounds', () => {
        const first = upsertDateRangeFilters([], ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z']);
        expect(getDateRangeFromFilters(first)).toEqual([
            '2026-01-01T00:00:00.000Z',
            '2026-01-02T00:00:00.000Z',
        ]);

        const second = upsertDateRangeFilters(first, ['2026-02-01T00:00:00.000Z', '2026-02-03T00:00:00.000Z']);
        expect(getDateRangeFromFilters(second)).toEqual([
            '2026-02-01T00:00:00.000Z',
            '2026-02-03T00:00:00.000Z',
        ]);
        expect(second.filter((f) => 'field' in f && f.field === 'created_at')).toHaveLength(2);

        const cleared = upsertDateRangeFilters(second, null);
        expect(getDateRangeFromFilters(cleared)).toBeNull();
    });

    it('countActiveLogFilters counts date range once and ignores lte duplicate field', () => {
        const filters: CrudFilter[] = [
            { field: 'request_id', operator: 'contains', value: 'req-1' },
            { field: 'created_at', operator: 'gte', value: '2026-01-01T00:00:00.000Z' },
            { field: 'created_at', operator: 'lte', value: '2026-01-02T00:00:00.000Z' },
            { field: 'api_format', operator: 'eq', value: 'gemini' },
        ];

        expect(countActiveLogFilters(filters)).toBe(3);
    });

    it('countActiveLogFilters ignores unknown fields', () => {
        const filters: CrudFilter[] = [
            { field: 'unknown_field', operator: 'eq', value: 'x' },
            { field: 'is_stream', operator: 'eq', value: true },
        ];

        expect(countActiveLogFilters(filters)).toBe(1);
    });
});
