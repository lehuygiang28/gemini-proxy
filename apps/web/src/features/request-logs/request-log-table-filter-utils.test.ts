import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
    REQUEST_LOG_CACHE_TOKENS_FIELD,
    REQUEST_LOG_COMPLETION_TOKENS_FIELD,
    REQUEST_LOG_COST_FIELD,
    REQUEST_LOG_DURATION_MS_FIELD,
    REQUEST_LOG_ESTIMATED_SPEED_FIELD,
    REQUEST_LOG_MODEL_FIELD,
    REQUEST_LOG_PROMPT_TOKENS_FIELD,
    REQUEST_LOG_REQUESTED_MODEL_FIELD,
    buildRequestLogDeepLinkInitialFilters,
    buildRequestLogSearchFilters,
    countActiveLogFilters,
    getDateRangeFromFilters,
    mapFiltersToSearchFormValues,
    blankRequestLogSearchValues,
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
            {
                operator: 'or',
                value: [
                    { field: REQUEST_LOG_MODEL_FIELD, operator: 'contains', value: 'gemini-pro' },
                    {
                        field: REQUEST_LOG_REQUESTED_MODEL_FIELD,
                        operator: 'contains',
                        value: 'gemini-pro',
                    },
                ],
            },
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

    it('counts a model or-filter once and maps it back onto the search form', () => {
        const filters = buildRequestLogSearchFilters({ model: 'flash-combo' });
        expect(countActiveLogFilters(filters)).toBe(1);
        expect(mapFiltersToSearchFormValues(filters).model).toBe('flash-combo');
    });

    it('maps numeric JSON metrics with -> (not ->>) and speed as a column', () => {
        const filters = buildRequestLogSearchFilters({
            prompt_tokens: [100, 5000],
            completion_tokens: [10, undefined],
            cache_tokens: [undefined, 80],
            estimated_cost_usd: [0.01, 1],
            total_response_time_ms: [0, 2000],
            estimated_speed_tok_per_s: [5, 200],
        });
        expect(filters).toEqual([
            { field: REQUEST_LOG_PROMPT_TOKENS_FIELD, operator: 'between', value: [100, 5000] },
            { field: REQUEST_LOG_COMPLETION_TOKENS_FIELD, operator: 'gte', value: 10 },
            { field: REQUEST_LOG_CACHE_TOKENS_FIELD, operator: 'lte', value: 80 },
            { field: REQUEST_LOG_COST_FIELD, operator: 'between', value: [0.01, 1] },
            { field: REQUEST_LOG_DURATION_MS_FIELD, operator: 'between', value: [0, 2000] },
            { field: REQUEST_LOG_ESTIMATED_SPEED_FIELD, operator: 'between', value: [5, 200] },
        ]);
        expect(REQUEST_LOG_CACHE_TOKENS_FIELD).toBe('usage_metadata->cache_tokens');
        expect(REQUEST_LOG_CACHE_TOKENS_FIELD.includes('.')).toBe(false);
        expect(REQUEST_LOG_PROMPT_TOKENS_FIELD.includes('->>')).toBe(false);
        expect(REQUEST_LOG_DURATION_MS_FIELD).toBe('performance_metrics->total_response_time_ms');
        expect(REQUEST_LOG_ESTIMATED_SPEED_FIELD).toBe('estimated_speed_tok_per_s');
        expect(REQUEST_LOG_MODEL_FIELD).toBe('usage_metadata->>model');
    });

    it('skips numeric ranges when min is greater than max', () => {
        expect(buildRequestLogSearchFilters({ cache_tokens: [90, 8] })).toEqual([]);
    });

    it('counts each numeric metric range once', () => {
        const filters = buildRequestLogSearchFilters({
            cache_tokens: [1, 10],
            estimated_speed_tok_per_s: [20, 40],
        });
        expect(countActiveLogFilters(filters)).toBe(2);
    });

    it('blankRequestLogSearchValues clears every search field including deep-link keys', () => {
        const blank = blankRequestLogSearchValues();
        expect(blank.api_key_id).toBeUndefined();
        expect(blank.proxy_key_id).toBeUndefined();
        expect(blank.api_format).toBeUndefined();
        expect(blank.estimated_speed_tok_per_s).toBeUndefined();
        expect(buildRequestLogSearchFilters(blank)).toEqual([]);
    });
});
