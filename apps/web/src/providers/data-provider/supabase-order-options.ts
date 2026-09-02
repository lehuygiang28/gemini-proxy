import {
    REQUEST_LOG_CACHE_TOKENS_FIELD,
    REQUEST_LOG_COMPLETION_TOKENS_FIELD,
    REQUEST_LOG_COST_FIELD,
    REQUEST_LOG_DURATION_MS_FIELD,
    REQUEST_LOG_ESTIMATED_SPEED_FIELD,
    REQUEST_LOG_PROMPT_TOKENS_FIELD,
} from '@/features/request-logs/request-log-table-filter-utils';

const REQUEST_LOG_QUERY_FIELD_ALIASES: Record<string, string> = {
    prompt_tokens: REQUEST_LOG_PROMPT_TOKENS_FIELD,
    completion_tokens: REQUEST_LOG_COMPLETION_TOKENS_FIELD,
    cache_tokens: REQUEST_LOG_CACHE_TOKENS_FIELD,
    estimated_cost_usd: REQUEST_LOG_COST_FIELD,
    total_response_time_ms: REQUEST_LOG_DURATION_MS_FIELD,
};

/**
 * Refine antd uses sorter.columnKey (Ant Design `key`) over dataIndex.
 * Short keys like `prompt_tokens` are not request_logs columns — map them to JSONB paths.
 */
export function resolveRequestLogQueryField(field: string): string {
    return REQUEST_LOG_QUERY_FIELD_ALIASES[field] ?? field;
}

export function supabaseOrderOptions(sorter: { field: string; order: 'asc' | 'desc' }): {
    ascending: boolean;
    nullsFirst?: boolean;
} {
    const field = resolveRequestLogQueryField(sorter.field);
    if (field === REQUEST_LOG_ESTIMATED_SPEED_FIELD) {
        return { ascending: sorter.order === 'asc', nullsFirst: false };
    }
    return { ascending: sorter.order === 'asc' };
}
