import {
    REQUEST_LOG_CACHE_TOKENS_FIELD,
    REQUEST_LOG_COMPLETION_TOKENS_FIELD,
    REQUEST_LOG_COST_FIELD,
    REQUEST_LOG_DURATION_MS_FIELD,
    REQUEST_LOG_ESTIMATED_SPEED_FIELD,
    REQUEST_LOG_PROMPT_TOKENS_FIELD,
    type RequestLogSearch,
} from './request-log-table-filter-utils';

export type RequestLogColumnFilterKind = 'date' | 'model' | 'enum' | 'numeric' | 'key' | 'none';

export type RequestLogTableColumnSpec = {
    key: string;
    dataIndex?: string;
    sorter: boolean;
    filter: RequestLogColumnFilterKind;
    searchField?: keyof RequestLogSearch;
};

export const REQUEST_LOG_TABLE_COLUMN_SPECS: RequestLogTableColumnSpec[] = [
    { key: 'created_at', dataIndex: 'created_at', sorter: true, filter: 'date' },
    { key: 'model', sorter: false, filter: 'model' },
    { key: 'is_successful', dataIndex: 'is_successful', sorter: true, filter: 'enum' },
    {
        key: REQUEST_LOG_PROMPT_TOKENS_FIELD,
        dataIndex: REQUEST_LOG_PROMPT_TOKENS_FIELD,
        sorter: true,
        filter: 'numeric',
        searchField: 'prompt_tokens',
    },
    {
        key: REQUEST_LOG_COMPLETION_TOKENS_FIELD,
        dataIndex: REQUEST_LOG_COMPLETION_TOKENS_FIELD,
        sorter: true,
        filter: 'numeric',
        searchField: 'completion_tokens',
    },
    {
        key: REQUEST_LOG_CACHE_TOKENS_FIELD,
        dataIndex: REQUEST_LOG_CACHE_TOKENS_FIELD,
        sorter: true,
        filter: 'numeric',
        searchField: 'cache_tokens',
    },
    {
        key: REQUEST_LOG_COST_FIELD,
        dataIndex: REQUEST_LOG_COST_FIELD,
        sorter: true,
        filter: 'numeric',
        searchField: 'estimated_cost_usd',
    },
    {
        key: REQUEST_LOG_ESTIMATED_SPEED_FIELD,
        dataIndex: REQUEST_LOG_ESTIMATED_SPEED_FIELD,
        sorter: true,
        filter: 'numeric',
        searchField: 'estimated_speed_tok_per_s',
    },
    {
        key: REQUEST_LOG_DURATION_MS_FIELD,
        dataIndex: REQUEST_LOG_DURATION_MS_FIELD,
        sorter: true,
        filter: 'numeric',
        searchField: 'total_response_time_ms',
    },
    { key: 'key', sorter: false, filter: 'key' },
    { key: 'actions', sorter: false, filter: 'none' },
];
