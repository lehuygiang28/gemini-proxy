'use client';

import { useState, useMemo } from 'react';
import { useTable } from '@refinedev/antd';
import type { CrudFilter } from '@refinedev/core';
import type { Tables } from '@gemini-proxy/database';
import type { FilterState } from '@/components/common/advanced-filters';

type RequestLog = Tables<'request_logs'>;

interface UseAdvancedFiltersReturn {
    tableProps: any;
    searchFormProps: any;
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    resetFilters: () => void;
    isLoading: boolean;
    filteredData: RequestLog[] | undefined;
    totalCount: number;
}

export const useAdvancedFilters = (): UseAdvancedFiltersReturn => {
    const [filters, setFilters] = useState<FilterState>({
        searchText: '',
        status: 'all',
        apiFormat: 'all',
        retryStatus: 'all',
        dateRange: null,
        datePreset: 'last_7_days',
        durationRange: [null, null],
        tokenRange: [null, null],
        responseTimeRange: [null, null],
        retrySeverity: [],
        attemptCountRange: [null, null],
        errorTypes: [],
        statusCodes: [],
        hasErrors: null,
        streamOnly: null,
        modelFilter: [],
        userFilter: '',
        proxyKeyFilter: '',
        apiKeyFilter: '',
    });

    // Build Supabase filters from filter state
    const buildSupabaseFilters = useMemo(() => {
        const supabaseFilters: CrudFilter[] = [];

        // Status filter
        if (filters.status !== 'all') {
            supabaseFilters.push({
                field: 'is_successful',
                operator: 'eq',
                value: filters.status === 'success',
            });
        }

        // API format filter
        if (filters.apiFormat !== 'all') {
            supabaseFilters.push({
                field: 'api_format',
                operator: 'eq',
                value: filters.apiFormat,
            });
        }

        // Date range filter
        if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
            supabaseFilters.push({
                field: 'created_at',
                operator: 'gte',
                value: filters.dateRange[0].toISOString(),
            });
            supabaseFilters.push({
                field: 'created_at',
                operator: 'lte',
                value: filters.dateRange[1].toISOString(),
            });
        }

        // Stream filter
        if (filters.streamOnly !== null) {
            supabaseFilters.push({
                field: 'is_stream',
                operator: 'eq',
                value: filters.streamOnly,
            });
        }

        // User filter
        if (filters.userFilter) {
            supabaseFilters.push({
                field: 'user_id',
                operator: 'eq',
                value: filters.userFilter,
            });
        }

        // Proxy key filter
        if (filters.proxyKeyFilter) {
            supabaseFilters.push({
                field: 'proxy_key_id',
                operator: 'eq',
                value: filters.proxyKeyFilter,
            });
        }

        // API key filter
        if (filters.apiKeyFilter) {
            supabaseFilters.push({
                field: 'api_key_id',
                operator: 'eq',
                value: filters.apiKeyFilter,
            });
        }

        return supabaseFilters;
    }, [filters]);

    // Use Refine's useTable with our filters
    const { tableProps, searchFormProps } = useTable<RequestLog>({
        syncWithLocation: true,
        pagination: { pageSize: 20 },
        sorters: { initial: [{ field: 'created_at', order: 'desc' }] },
        filters: {
            initial: buildSupabaseFilters,
        },
    });

    // Client-side filtering for complex filters that can't be handled by Supabase
    const filteredData = useMemo(() => {
        if (!tableProps.dataSource) return undefined;

        let filtered = [...(tableProps.dataSource as RequestLog[])];

        // Search text filter (client-side for better UX)
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            filtered = filtered.filter(
                (log) =>
                    log.request_id.toLowerCase().includes(searchLower) ||
                    String(log.id).toLowerCase().includes(searchLower) ||
                    (log.user_id && log.user_id.toLowerCase().includes(searchLower)) ||
                    (log.proxy_key_id && log.proxy_key_id.toLowerCase().includes(searchLower)) ||
                    (log.api_key_id && log.api_key_id.toLowerCase().includes(searchLower)) ||
                    JSON.stringify(log.request_data).toLowerCase().includes(searchLower) ||
                    (log.response_data &&
                        JSON.stringify(log.response_data).toLowerCase().includes(searchLower)) ||
                    (log.error_details &&
                        JSON.stringify(log.error_details).toLowerCase().includes(searchLower)),
            );
        }

        // Retry status filter
        if (filters.retryStatus !== 'all') {
            filtered = filtered.filter((log) => {
                const retryCount = Array.isArray(log.retry_attempts)
                    ? log.retry_attempts.length
                    : 0;
                if (filters.retryStatus === 'with_retries') {
                    return retryCount > 0;
                } else if (filters.retryStatus === 'no_retries') {
                    return retryCount === 0;
                }
                return true;
            });
        }

        // Duration filter
        if (filters.durationRange[0] !== null || filters.durationRange[1] !== null) {
            filtered = filtered.filter((log) => {
                const metrics = (log.performance_metrics as Record<string, unknown>) || {};
                const duration = (metrics.duration as number) || 0;
                const minDuration = filters.durationRange[0] || 0;
                const maxDuration = filters.durationRange[1] || Infinity;
                return duration >= minDuration && duration <= maxDuration;
            });
        }

        // Token usage filter
        if (filters.tokenRange[0] !== null || filters.tokenRange[1] !== null) {
            filtered = filtered.filter((log) => {
                const usage = (log.usage_metadata as Record<string, unknown>) || {};
                const totalTokens = (usage.total_tokens as number) || 0;
                const minTokens = filters.tokenRange[0] || 0;
                const maxTokens = filters.tokenRange[1] || Infinity;
                return totalTokens >= minTokens && totalTokens <= maxTokens;
            });
        }

        // Response time filter
        if (filters.responseTimeRange[0] !== null || filters.responseTimeRange[1] !== null) {
            filtered = filtered.filter((log) => {
                const metrics = (log.performance_metrics as Record<string, unknown>) || {};
                const responseTime = (metrics.response_time as number) || 0;
                const minResponseTime = filters.responseTimeRange[0] || 0;
                const maxResponseTime = filters.responseTimeRange[1] || Infinity;
                return responseTime >= minResponseTime && responseTime <= maxResponseTime;
            });
        }

        // Retry severity filter
        if (filters.retrySeverity.length > 0) {
            filtered = filtered.filter((log) => {
                const retryCount = Array.isArray(log.retry_attempts)
                    ? log.retry_attempts.length
                    : 0;
                const totalAttempts = retryCount + 1; // +1 for initial attempt

                return filters.retrySeverity.some((severity) => {
                    switch (severity) {
                        case 'success':
                            return totalAttempts === 1;
                        case 'minor':
                            return totalAttempts === 2;
                        case 'moderate':
                            return totalAttempts >= 3 && totalAttempts <= 4;
                        case 'high':
                            return totalAttempts === 5;
                        case 'critical':
                            return totalAttempts >= 6 && totalAttempts <= 10;
                        case 'severe':
                            return totalAttempts >= 11 && totalAttempts <= 20;
                        case 'extreme':
                            return totalAttempts > 20;
                        default:
                            return false;
                    }
                });
            });
        }

        // Attempt count range filter
        if (filters.attemptCountRange[0] !== null || filters.attemptCountRange[1] !== null) {
            filtered = filtered.filter((log) => {
                const retryCount = Array.isArray(log.retry_attempts)
                    ? log.retry_attempts.length
                    : 0;
                const totalAttempts = retryCount + 1;
                const minAttempts = filters.attemptCountRange[0] || 0;
                const maxAttempts = filters.attemptCountRange[1] || Infinity;
                return totalAttempts >= minAttempts && totalAttempts <= maxAttempts;
            });
        }

        // Error types filter
        if (filters.errorTypes.length > 0) {
            filtered = filtered.filter((log) => {
                if (!log.error_details) return false;
                const errorDetails = log.error_details as Record<string, unknown>;
                const errorType = (errorDetails.type as string) || 'unknown';
                return filters.errorTypes.includes(errorType);
            });
        }

        // Status codes filter
        if (filters.statusCodes.length > 0) {
            filtered = filtered.filter((log) => {
                if (!log.error_details) return false;
                const errorDetails = log.error_details as Record<string, unknown>;
                const statusCode = errorDetails.status as number;
                return statusCode && filters.statusCodes.includes(statusCode);
            });
        }

        // Has errors filter
        if (filters.hasErrors !== null) {
            filtered = filtered.filter((log) => {
                const hasErrors = !!log.error_details;
                return hasErrors === filters.hasErrors;
            });
        }

        // Model filter
        if (filters.modelFilter.length > 0) {
            filtered = filtered.filter((log) => {
                const usage = (log.usage_metadata as Record<string, unknown>) || {};
                const request = (log.request_data as Record<string, unknown>) || {};
                const model = (usage.model as string) || (request.model as string);
                return model && filters.modelFilter.includes(model);
            });
        }

        return filtered;
    }, [tableProps.dataSource, filters]);

    const resetFilters = () => {
        setFilters({
            searchText: '',
            status: 'all',
            apiFormat: 'all',
            retryStatus: 'all',
            dateRange: null,
            datePreset: 'last_7_days',
            durationRange: [null, null],
            tokenRange: [null, null],
            responseTimeRange: [null, null],
            retrySeverity: [],
            attemptCountRange: [null, null],
            errorTypes: [],
            statusCodes: [],
            hasErrors: null,
            streamOnly: null,
            modelFilter: [],
            userFilter: '',
            proxyKeyFilter: '',
            apiKeyFilter: '',
        });
    };

    return {
        tableProps: {
            ...tableProps,
            dataSource: filteredData,
        },
        searchFormProps,
        filters,
        setFilters,
        resetFilters,
        isLoading: Boolean(tableProps.loading),
        filteredData,
        totalCount: filteredData?.length || 0,
    };
};
