import { describe, expect, it } from 'vitest';
import { REQUEST_LOG_ESTIMATED_SPEED_FIELD } from '@/features/request-logs/request-log-table-filter-utils';
import { supabaseOrderOptions } from './supabase-order-options';

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

    it('leaves other columns on the default null placement', () => {
        expect(supabaseOrderOptions({ field: 'created_at', order: 'desc' })).toEqual({
            ascending: false,
        });
    });
});
