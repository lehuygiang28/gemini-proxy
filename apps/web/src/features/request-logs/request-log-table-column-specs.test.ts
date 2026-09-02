import { describe, expect, it } from 'vitest';
import { REQUEST_LOG_LIST_SELECT } from '@/constants/request-log-select';
import {
    REQUEST_LOG_CACHE_TOKENS_FIELD,
    REQUEST_LOG_COMPLETION_TOKENS_FIELD,
    REQUEST_LOG_COST_FIELD,
    REQUEST_LOG_DURATION_MS_FIELD,
    REQUEST_LOG_ESTIMATED_SPEED_FIELD,
    REQUEST_LOG_PROMPT_TOKENS_FIELD,
} from './request-log-table-filter-utils';
import { REQUEST_LOG_TABLE_COLUMN_SPECS } from './request-log-table-column-specs';

describe('REQUEST_LOG_LIST_SELECT', () => {
    it('includes the generated Est. Speed column', () => {
        expect(REQUEST_LOG_LIST_SELECT.split(',').map((part) => part.trim())).toContain(
            'estimated_speed_tok_per_s',
        );
    });
});

describe('REQUEST_LOG_TABLE_COLUMN_SPECS', () => {
    it('orders columns per spec and drops overhead', () => {
        expect(REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => column.key)).toEqual([
            'created_at',
            'model',
            'is_successful',
            'api_format',
            'is_stream',
            'prompt_tokens',
            'completion_tokens',
            'cache_tokens',
            'estimated_cost_usd',
            'estimated_speed_tok_per_s',
            'total_response_time_ms',
            'key',
            'actions',
        ]);
        expect(REQUEST_LOG_TABLE_COLUMN_SPECS.some((column) => column.key === 'overhead')).toBe(
            false,
        );
    });

    it('uses JSONB -> numeric paths and the generated speed field for sort/filter', () => {
        const byKey = Object.fromEntries(
            REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => [column.key, column]),
        );

        expect(byKey.prompt_tokens).toMatchObject({
            dataIndex: REQUEST_LOG_PROMPT_TOKENS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey.completion_tokens).toMatchObject({
            dataIndex: REQUEST_LOG_COMPLETION_TOKENS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey.cache_tokens).toMatchObject({
            dataIndex: REQUEST_LOG_CACHE_TOKENS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey.estimated_cost_usd).toMatchObject({
            dataIndex: REQUEST_LOG_COST_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey.total_response_time_ms).toMatchObject({
            dataIndex: REQUEST_LOG_DURATION_MS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey.estimated_speed_tok_per_s).toMatchObject({
            dataIndex: REQUEST_LOG_ESTIMATED_SPEED_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(REQUEST_LOG_PROMPT_TOKENS_FIELD.includes('.')).toBe(false);
        expect(REQUEST_LOG_CACHE_TOKENS_FIELD.includes('->>')).toBe(false);
        expect(REQUEST_LOG_CACHE_TOKENS_FIELD.includes('->')).toBe(true);
    });

    it('puts Format and Stream on sortable enum columns', () => {
        const byKey = Object.fromEntries(
            REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => [column.key, column]),
        );
        expect(byKey.api_format).toMatchObject({
            dataIndex: 'api_format',
            sorter: true,
            filter: 'enum',
        });
        expect(byKey.is_stream).toMatchObject({
            dataIndex: 'is_stream',
            sorter: true,
            filter: 'enum',
        });
    });
});
