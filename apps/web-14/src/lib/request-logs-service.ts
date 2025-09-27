import { supabaseBrowserClient } from '@/utils/supabase/client';
import { supabaseRpcClient } from './supabase-rpc-client';
import type { Tables } from '@gemini-proxy/database';
import type { FilterState } from '@/components/common/advanced-filters';
import type { CrudFilter } from '@refinedev/core';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { FilterAdapter } from './filter-adapter';
import { ErrorHandler } from './error-handler';

type RequestLog = Tables<'request_logs'>;

// Clean type definitions
interface QueryOptions {
    filters: FilterState;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface QueryResponse {
    data: RequestLog[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

interface FilterOptions {
    models: string[];
    errorTypes: string[];
    statusCodes: number[];
}

interface Statistics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    totalTokens: number;
}

interface JsonFilter {
    field: string;
    path?: string;
    operator: string;
    value: unknown;
}

/**
 * Clean, maintainable service for request logs with enterprise filtering
 */
export class RequestLogsService {
    private static readonly DEFAULT_PAGE_SIZE = 20;
    private static readonly MAX_PAGE_SIZE = 100;
    private static readonly EXPORT_PAGE_SIZE = 10000;

    /**
     * Get filtered request logs with pagination and sorting
     */
    static async getRequestLogs(options: QueryOptions): Promise<QueryResponse> {
        const {
            filters,
            page = 1,
            pageSize = this.DEFAULT_PAGE_SIZE,
            sortBy = 'created_at',
            sortOrder = 'desc',
        } = options;

        // Validate filters first
        const validation = FilterAdapter.validateFilters(filters);
        if (!validation.isValid) {
            throw new Error(`Invalid filters: ${validation.errors.join(', ')}`);
        }

        const safePageSize = this.clampPageSize(pageSize);
        const offset = (page - 1) * safePageSize;

        try {
            const query = this.buildQuery(filters, sortBy, sortOrder, offset, safePageSize);
            const { data, error, count } = (await query) as any;

            if (error) {
                throw new Error(`Database query failed: ${error.message}`);
            }

            return {
                data: data || [],
                total: count || 0,
                page,
                pageSize: safePageSize,
                hasMore: offset + safePageSize < (count || 0),
            };
        } catch (error) {
            const serviceError = ErrorHandler.handleDatabaseError(error);
            ErrorHandler.logError(serviceError, 'RequestLogsService.getRequestLogs');
            throw new Error(ErrorHandler.getUserFriendlyMessage(serviceError));
        }
    }

    /**
     * Get filter options for dropdowns
     */
    static async getFilterOptions(userId?: string): Promise<FilterOptions> {
        try {
            // Use efficient database RPC function instead of fetching 1000+ records
            const filterOptions = await supabaseRpcClient.getFilterOptionsAll(userId);

            return {
                models: filterOptions.models || [],
                errorTypes: filterOptions.error_types || [],
                statusCodes: filterOptions.status_codes || [],
            };
        } catch (error) {
            const serviceError = ErrorHandler.handleDatabaseError(error);
            ErrorHandler.logError(serviceError, 'RequestLogsService.getFilterOptions');
            throw new Error(ErrorHandler.getUserFriendlyMessage(serviceError));
        }
    }

    /**
     * Get request log statistics
     */
    static async getRequestLogStats(filters: FilterState): Promise<Statistics> {
        try {
            const query = this.buildStatsQuery(filters);
            const { data, error } = (await query) as any;

            if (error) {
                throw new Error(`Failed to fetch stats: ${error.message}`);
            }

            return this.calculateStatistics(data || []);
        } catch (error) {
            const serviceError = ErrorHandler.handleDatabaseError(error);
            ErrorHandler.logError(serviceError, 'RequestLogsService.getRequestLogStats');
            throw new Error(ErrorHandler.getUserFriendlyMessage(serviceError));
        }
    }

    /**
     * Export filtered request logs
     */
    static async exportRequestLogs(
        filters: FilterState,
        format: 'csv' | 'json' = 'csv',
    ): Promise<string> {
        try {
            const response = await this.getRequestLogs({
                filters,
                pageSize: this.EXPORT_PAGE_SIZE,
            });

            return format === 'csv'
                ? this.convertToCSV(response.data)
                : JSON.stringify(response.data, null, 2);
        } catch (error) {
            const serviceError = ErrorHandler.handleDatabaseError(error);
            ErrorHandler.logError(serviceError, 'RequestLogsService.exportRequestLogs');
            throw new Error(ErrorHandler.getUserFriendlyMessage(serviceError));
        }
    }

    // Private helper methods

    private static clampPageSize(pageSize: number): number {
        return Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE);
    }

    private static buildQuery(
        filters: FilterState,
        sortBy: string,
        sortOrder: 'asc' | 'desc',
        offset: number,
        limit: number,
    ): PostgrestFilterBuilder<any, any, any> {
        let query = supabaseBrowserClient.from('request_logs').select('*', { count: 'exact' });

        // Apply basic filters
        const refineFilters = FilterAdapter.toRefineFilters(filters);
        query = this.applyFilters(query, refineFilters);

        // Apply JSON filters
        const jsonFilters = FilterAdapter.getJsonFilters(filters);
        query = this.applyJsonFilters(query, jsonFilters);

        // Apply sorting and pagination
        return query
            .order(sortBy, { ascending: sortOrder === 'asc' })
            .range(offset, offset + limit - 1);
    }

    private static buildStatsQuery(filters: FilterState): PostgrestFilterBuilder<any, any, any> {
        let query = supabaseBrowserClient
            .from('request_logs')
            .select('is_successful, performance_metrics, usage_metadata');

        const refineFilters = FilterAdapter.toRefineFilters(filters);
        return this.applyFilters(query, refineFilters);
    }

    private static applyFilters(
        query: PostgrestFilterBuilder<any, any, any>,
        filters: CrudFilter[],
    ): PostgrestFilterBuilder<any, any, any> {
        return filters.reduce((q, filter) => {
            switch (filter.operator) {
                case 'eq':
                    return q.eq(filter.field, filter.value);
                case 'gte':
                    return q.gte(filter.field, filter.value);
                case 'lte':
                    return q.lte(filter.field, filter.value);
                case 'contains':
                    return q.ilike(filter.field, `%${filter.value}%`);
                case 'in':
                    return q.in(filter.field, filter.value as readonly any[]);
                case 'ne':
                    return q.neq(filter.field, filter.value);
                default:
                    return q;
            }
        }, query);
    }

    private static applyJsonFilters(
        query: PostgrestFilterBuilder<any, any, any>,
        jsonFilters: JsonFilter[],
    ): PostgrestFilterBuilder<any, any, any> {
        return jsonFilters.reduce((q, filter) => {
            // Standard JSON field filtering with proper path construction
            const fieldPath = filter.path ? `${filter.field}->>${filter.path}` : filter.field;

            switch (filter.operator) {
                case 'eq':
                    return q.eq(fieldPath, filter.value);
                case 'gte':
                    return q.gte(fieldPath, filter.value);
                case 'lte':
                    return q.lte(fieldPath, filter.value);
                case 'gt':
                    return q.gt(fieldPath, filter.value);
                case 'in':
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return q.in(fieldPath, filter.value as readonly any[]);
                case 'ne':
                    return q.neq(fieldPath, filter.value);
                case 'contains':
                    return q.ilike(fieldPath, `%${filter.value}%`);
                default:
                    return q;
            }
        }, query);
    }

    private static calculateStatistics(logs: RequestLog[]): Statistics {
        const totalRequests = logs.length;
        const successfulRequests = logs.filter((log) => log.is_successful).length;
        const failedRequests = totalRequests - successfulRequests;

        const responseTimes = logs
            .map(
                (log) =>
                    (log.performance_metrics as Record<string, unknown>)?.response_time as number,
            )
            .filter((time) => typeof time === 'number');

        const avgResponseTime =
            responseTimes.length > 0
                ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                : 0;

        const totalTokens = logs
            .map((log) => (log.usage_metadata as Record<string, unknown>)?.total_tokens as number)
            .filter((tokens) => typeof tokens === 'number')
            .reduce((sum, tokens) => sum + tokens, 0);

        return {
            totalRequests,
            successfulRequests,
            failedRequests,
            avgResponseTime: Math.round(avgResponseTime),
            totalTokens,
        };
    }

    private static convertToCSV(logs: RequestLog[]): string {
        if (logs.length === 0) return '';

        const headers = [
            'ID',
            'Request ID',
            'API Format',
            'Is Successful',
            'Is Stream',
            'Created At',
            'User ID',
            'Proxy Key ID',
            'API Key ID',
        ];

        const rows = logs.map((log) => [
            log.id,
            log.request_id,
            log.api_format,
            log.is_successful,
            log.is_stream,
            log.created_at,
            log.user_id || '',
            log.proxy_key_id || '',
            log.api_key_id || '',
        ]);

        return [headers, ...rows]
            .map((row) => row.map((field) => `"${field}"`).join(','))
            .join('\n');
    }
}
