import { describe, expect, it } from 'vitest';
import {
    REQUEST_LOG_DURATION_MS_FIELD,
    REQUEST_LOG_ESTIMATED_SPEED_FIELD,
    REQUEST_LOG_PROMPT_TOKENS_FIELD,
} from '@/features/request-logs/request-log-table-filter-utils';
import { supabaseOrderOptions, resolveRequestLogQueryField } from './supabase-order-options';

describe('supabaseOrderOptions', () => {
    it('forces nulls last for estimated speed', () => {
        expect(
            supabaseOrderOptions({
                field: REQUEST_LOG_ESTIMATED_SPEED_FIELD,
                order: 'desc',
            }),
        ).toEqual({ ascending: false, nullsFirst: false });
        expect(
            supabaseOrderOptions({
                field: REQUEST_LOG_ESTIMATED_SPEED_FIELD,
                order: 'asc',
            }),
        ).toEqual({ ascending: true, nullsFirst: false });
    });

    it('forces nulls last for JSONB-backed metric columns', () => {
        expect(
            supabaseOrderOptions({
                field: REQUEST_LOG_PROMPT_TOKENS_FIELD,
                order: 'desc',
            }),
        ).toEqual({ ascending: false, nullsFirst: false });
        expect(
            supabaseOrderOptions({
                field: 'total_response_time_ms',
                order: 'desc',
            }),
        ).toEqual({ ascending: false, nullsFirst: false });
        expect(resolveRequestLogQueryField('total_response_time_ms')).toBe(
            REQUEST_LOG_DURATION_MS_FIELD,
        );
    });

    it('leaves other columns on the default null placement', () => {
        expect(supabaseOrderOptions({ field: 'created_at', order: 'desc' })).toEqual({
            ascending: false,
        });
    });
});

describe('resolveRequestLogQueryField', () => {
    it('maps Refine column keys like prompt_tokens onto JSONB PostgREST paths', () => {
        expect(resolveRequestLogQueryField('prompt_tokens')).toBe('usage_metadata->prompt_tokens');
        expect(resolveRequestLogQueryField('completion_tokens')).toBe(
            'usage_metadata->completion_tokens',
        );
        expect(resolveRequestLogQueryField('cache_tokens')).toBe('usage_metadata->cache_tokens');
        expect(resolveRequestLogQueryField('estimated_cost_usd')).toBe(
            'usage_metadata->estimated_cost_usd',
        );
        expect(resolveRequestLogQueryField('total_response_time_ms')).toBe(
            'performance_metrics->total_response_time_ms',
        );
        expect(resolveRequestLogQueryField('usage_metadata->prompt_tokens')).toBe(
            'usage_metadata->prompt_tokens',
        );
        expect(resolveRequestLogQueryField('created_at')).toBe('created_at');
        expect(resolveRequestLogQueryField('estimated_speed_tok_per_s')).toBe(
            REQUEST_LOG_ESTIMATED_SPEED_FIELD,
        );
    });

    it('does not resolve inherited object property names as aliases', () => {
        expect(resolveRequestLogQueryField('toString')).toBe('toString');
        expect(resolveRequestLogQueryField('constructor')).toBe('constructor');
        expect(resolveRequestLogQueryField('__proto__')).toBe('__proto__');
    });
});
