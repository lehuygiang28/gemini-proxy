import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
    REQUEST_LOG_MODEL_FIELD,
    buildRequestLogDeepLinkInitialFilters,
    buildRequestLogSearchFilters,
    countActiveLogFilters,
    getDateRangeFromFilters,
    mapFiltersToSearchFormValues,
} from './request-log-table-filter-utils';

describe('request-log-table-filter-utils', () => {
    it('buildRequestLogSearchFilters maps form values to CrudFilters', () => {
        const filters = buildRequestLogSearchFilters({
            request_id: ' req-1 ',
            model: ' gemini-pro ',
            api_format: 'gemini',
            is_successful: true,
            is_stream: false,
            api_key_id: 'key-1',
            proxy_key_id: 'proxy-1',
            date_range: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
        });

        expect(filters).toEqual([
            { field: 'request_id', operator: 'contains', value: 'req-1' },
            { field: REQUEST_LOG_MODEL_FIELD, operator: 'contains', value: 'gemini-pro' },
            { field: 'api_format', operator: 'eq', value: 'gemini' },
            { field: 'is_successful', operator: 'eq', value: true },
            { field: 'is_stream', operator: 'eq', value: false },
            { field: 'api_key_id', operator: 'eq', value: 'key-1' },
            { field: 'proxy_key_id', operator: 'eq', value: 'proxy-1' },
            { field: 'created_at', operator: 'gte', value: '2026-01-01T00:00:00.000Z' },
            { field: 'created_at', operator: 'lte', value: '2026-01-02T00:00:00.000Z' },
        ]);
    });

    it('buildRequestLogSearchFilters converts dayjs date ranges', () => {
        const start = dayjs('2026-02-01T10:00:00.000Z');
        const end = dayjs('2026-02-03T12:00:00.000Z');
        const filters = buildRequestLogSearchFilters({ date_range: [start, end] });

        expect(getDateRangeFromFilters(filters)).toEqual([start.toISOString(), end.toISOString()]);
    });

    it('buildRequestLogSearchFilters omits empty values', () => {
        expect(buildRequestLogSearchFilters({ model: '   ', request_id: '' })).toEqual([]);
    });

    it('buildRequestLogDeepLinkInitialFilters reads api_key_id and proxy_key_id params', () => {
        const params = new URLSearchParams('api_key_id=a&proxy_key_id=p');
        expect(buildRequestLogDeepLinkInitialFilters(params)).toEqual([
            { field: 'proxy_key_id', operator: 'eq', value: 'p' },
            { field: 'api_key_id', operator: 'eq', value: 'a' },
        ]);
    });

    it('mapFiltersToSearchFormValues maps model and date_range fields', () => {
        const filters = buildRequestLogSearchFilters({
            model: 'gemini-flash',
            date_range: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
        });

        expect(mapFiltersToSearchFormValues(filters)).toMatchObject({
            model: 'gemini-flash',
            date_range: expect.any(Array),
        });
    });

    it('countActiveLogFilters counts date range once and ignores lte duplicate field', () => {
        const filters = buildRequestLogSearchFilters({
            request_id: 'req-1',
            date_range: ['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
            api_format: 'gemini',
        });

        expect(countActiveLogFilters(filters)).toBe(3);
    });
});
