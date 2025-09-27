'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tables, User } from '@gemini-proxy/database';
import type { FilterState } from '@/components/common/advanced-filters';
import { useGetIdentity } from '@refinedev/core';
import type { TableProps } from 'antd';
import { RequestLogsService } from '@/lib/request-logs-service';

type RequestLog = Tables<'request_logs'>;

interface FilterOptions {
    models: string[];
    errorTypes: string[];
    statusCodes: number[];
}

interface UseServerSideFiltersReturn {
    tableProps: TableProps<RequestLog>;
    searchFormProps: Record<string, unknown>;
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    resetFilters: () => void;
    isLoading: boolean;
    filteredData: RequestLog[] | undefined;
    totalCount: number;
    filterOptions: FilterOptions;
    refreshData: () => Promise<void>;
}

/**
 * Clean, maintainable hook for server-side filtering with enterprise features
 */
export const useServerSideFilters = (): UseServerSideFiltersReturn => {
    const { data: user } = useGetIdentity<User>();

    // State management
    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        apiFormat: 'all',
        dateRange: null,
        datePreset: '',
        searchText: '',
        durationRange: [null, null],
        responseTimeRange: [null, null],
        tokenRange: [null, null],
        modelFilter: [],
        errorTypes: [],
        statusCodes: [],
        hasErrors: null,
        retryStatus: 'all',
        attemptCountRange: [null, null],
        retrySeverity: [],
        streamOnly: null,
        userFilter: '',
        proxyKeyFilter: '',
        apiKeyFilter: '',
    });

    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        models: [],
        errorTypes: [],
        statusCodes: [],
    });

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<RequestLog[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Data loading function
    const loadData = useCallback(
        async (page: number = currentPage, size: number = pageSize) => {
            if (!user) return;

            setIsLoading(true);
            try {
                const response = await RequestLogsService.getRequestLogs({
                    filters,
                    page,
                    pageSize: size,
                    sortBy: 'created_at',
                    sortOrder: 'desc',
                });

                setData(response.data);
                setTotalCount(response.total);
                setCurrentPage(response.page);
                setPageSize(response.pageSize);
            } catch (error) {
                console.error('Error loading request logs:', error);
                setData([]);
                setTotalCount(0);
                // In a real app, you might want to show a toast notification here
            } finally {
                setIsLoading(false);
            }
        },
        [filters, currentPage, pageSize, user],
    );

    // Filter options loading
    const loadFilterOptions = useCallback(async () => {
        if (!user) return;

        try {
            const options = await RequestLogsService.getFilterOptions(user.id);
            setFilterOptions(options);
        } catch (error) {
            console.error('Error loading filter options:', error);
            // In a real app, you might want to show a toast notification here
        }
    }, [user]);

    // Refresh data function
    const refreshData = useCallback(async () => {
        await loadData(1, pageSize);
    }, [loadData, pageSize]);

    // Reset filters function
    const resetFilters = useCallback(() => {
        setFilters({
            status: 'all',
            apiFormat: 'all',
            dateRange: null,
            datePreset: '',
            searchText: '',
            durationRange: [null, null],
            responseTimeRange: [null, null],
            tokenRange: [null, null],
            modelFilter: [],
            errorTypes: [],
            statusCodes: [],
            hasErrors: null,
            retryStatus: 'all',
            attemptCountRange: [null, null],
            retrySeverity: [],
            streamOnly: null,
            userFilter: '',
            proxyKeyFilter: '',
            apiKeyFilter: '',
        });
    }, []);

    // Table change handler
    const handleTableChange = useCallback(
        (page: number, pageSize: number) => {
            loadData(page, pageSize);
        },
        [loadData],
    );

    // Effects
    useEffect(() => {
        if (user) {
            loadData(1, pageSize);
        }
    }, [filters, user, loadData, pageSize]);

    useEffect(() => {
        if (user) {
            loadFilterOptions();
        }
    }, [user, loadFilterOptions]);

    // Memoized table props
    const tableProps: TableProps<RequestLog> = useMemo(
        () => ({
            dataSource: data,
            loading: isLoading,
            pagination: {
                current: currentPage,
                pageSize: pageSize,
                total: totalCount,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                onChange: handleTableChange,
                onShowSizeChange: handleTableChange,
            },
            rowKey: 'id',
        }),
        [data, isLoading, currentPage, pageSize, totalCount, handleTableChange],
    );

    return {
        tableProps,
        searchFormProps: {},
        filters,
        setFilters,
        resetFilters,
        isLoading,
        filteredData: data,
        totalCount,
        filterOptions,
        refreshData,
    };
};
