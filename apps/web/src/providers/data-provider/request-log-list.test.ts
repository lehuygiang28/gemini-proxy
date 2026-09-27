import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { REQUEST_LOG_PROMPT_TOKENS_FIELD } from '@/features/request-logs/request-log-table-filter-utils';
import { getRequestLogList } from './request-log-list';

function createAwaitableQueryBuilder() {
    const order = vi.fn();
    const range = vi.fn();
    const select = vi.fn();
    const builder: {
        range: ReturnType<typeof vi.fn>;
        order: ReturnType<typeof vi.fn>;
        select: ReturnType<typeof vi.fn>;
        then: (
            onFulfilled: (value: { data: unknown[]; count: number; error: null }) => unknown,
        ) => Promise<unknown>;
    } = {
        range,
        order,
        select,
        then(onFulfilled) {
            return Promise.resolve({ data: [], count: 0, error: null }).then(onFulfilled);
        },
    };
    range.mockReturnValue(builder);
    order.mockReturnValue(builder);
    select.mockReturnValue(builder);
    return builder;
}

describe('getRequestLogList', () => {
    it('orders legacy prompt_tokens sorter on the JSONB PostgREST path', async () => {
        const query = createAwaitableQueryBuilder();
        const from = vi.fn(() => query);
        const client = { from } as unknown as SupabaseClient;

        await getRequestLogList(client, {
            resource: 'request_logs',
            pagination: { currentPage: 1, pageSize: 20, mode: 'server' },
            sorters: [{ field: 'prompt_tokens', order: 'desc' }],
            filters: [],
            meta: { select: 'id' },
        });

        expect(query.order).toHaveBeenCalledWith(REQUEST_LOG_PROMPT_TOKENS_FIELD, {
            ascending: false,
            nullsFirst: false,
        });
        expect(query.select).not.toHaveBeenCalledWith(expect.stringContaining('usage_metadata('));
    });
});
