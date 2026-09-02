import { REQUEST_LOG_ESTIMATED_SPEED_FIELD } from '@/features/request-logs/request-log-table-filter-utils';

export function supabaseOrderOptions(sorter: { field: string; order: 'asc' | 'desc' }): {
    ascending: boolean;
    nullsFirst?: boolean;
} {
    if (sorter.field === REQUEST_LOG_ESTIMATED_SPEED_FIELD) {
        return { ascending: sorter.order === 'asc', nullsFirst: false };
    }
    return { ascending: sorter.order === 'asc' };
}
