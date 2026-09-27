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
    it('orders eleven columns and hosts Format/Stream on Model, not as headers', () => {
        expect(REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => column.key)).toEqual([
            'created_at',
            'model',
            'is_successful',
            REQUEST_LOG_PROMPT_TOKENS_FIELD,
            REQUEST_LOG_COMPLETION_TOKENS_FIELD,
            REQUEST_LOG_CACHE_TOKENS_FIELD,
            REQUEST_LOG_COST_FIELD,
            REQUEST_LOG_ESTIMATED_SPEED_FIELD,
            REQUEST_LOG_DURATION_MS_FIELD,
            'key',
            'actions',
        ]);
        expect(REQUEST_LOG_TABLE_COLUMN_SPECS.some((column) => column.key === 'api_format')).toBe(
            false,
        );
        expect(REQUEST_LOG_TABLE_COLUMN_SPECS.some((column) => column.key === 'is_stream')).toBe(
            false,
        );
        expect(REQUEST_LOG_TABLE_COLUMN_SPECS.some((column) => column.key === 'overhead')).toBe(
            false,
        );

        const byKey = Object.fromEntries(
            REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => [column.key, column]),
        );
        expect(byKey.model).toMatchObject({ sorter: false, filter: 'model' });
        expect(byKey.is_successful).toMatchObject({
            dataIndex: 'is_successful',
            sorter: true,
            filter: 'enum',
        });
    });

    it('uses JSONB -> numeric paths and the generated speed field for sort/filter', () => {
        const byKey = Object.fromEntries(
            REQUEST_LOG_TABLE_COLUMN_SPECS.map((column) => [column.key, column]),
        );

        expect(byKey[REQUEST_LOG_PROMPT_TOKENS_FIELD]).toMatchObject({
            dataIndex: REQUEST_LOG_PROMPT_TOKENS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey[REQUEST_LOG_COMPLETION_TOKENS_FIELD]).toMatchObject({
            dataIndex: REQUEST_LOG_COMPLETION_TOKENS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey[REQUEST_LOG_CACHE_TOKENS_FIELD]).toMatchObject({
            dataIndex: REQUEST_LOG_CACHE_TOKENS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey[REQUEST_LOG_COST_FIELD]).toMatchObject({
            dataIndex: REQUEST_LOG_COST_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey[REQUEST_LOG_DURATION_MS_FIELD]).toMatchObject({
            dataIndex: REQUEST_LOG_DURATION_MS_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(byKey[REQUEST_LOG_ESTIMATED_SPEED_FIELD]).toMatchObject({
            dataIndex: REQUEST_LOG_ESTIMATED_SPEED_FIELD,
            sorter: true,
            filter: 'numeric',
        });
        expect(REQUEST_LOG_PROMPT_TOKENS_FIELD.includes('.')).toBe(false);
        expect(REQUEST_LOG_CACHE_TOKENS_FIELD.includes('->>')).toBe(false);
        expect(REQUEST_LOG_CACHE_TOKENS_FIELD.includes('->')).toBe(true);
    });

    it('uses the PostgREST field as the Ant Design column key (Refine sorter.columnKey)', () => {
        for (const column of REQUEST_LOG_TABLE_COLUMN_SPECS) {
            if (!column.sorter) {
                continue;
            }
            expect(column.dataIndex).toBeDefined();
            expect(column.key).toBe(column.dataIndex);
            expect(column.key.includes('.')).toBe(false);
        }
    });
});
