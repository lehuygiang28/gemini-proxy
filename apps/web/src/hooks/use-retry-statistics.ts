'use client';

import { useList } from '@refinedev/core';
import { useMemo } from 'react';

interface RetryStatistics {
    totalRequests: number;
    requestsWithRetries: number;
    totalRetryAttempts: number;
    retryRate: number;
}

export const useRetryStatistics = (): {
    statistics: RetryStatistics;
    isLoading: boolean;
    error: any;
} => {
    // Fetch all request logs for statistics calculation
    const { data, isLoading, error } = useList({
        resource: 'request_logs',
        pagination: { pageSize: 1000 }, // Get more data for accurate statistics
        sorters: [{ field: 'created_at', order: 'desc' }],
    });

    const statistics = useMemo(() => {
        if (!data?.data) {
            return {
                totalRequests: 0,
                requestsWithRetries: 0,
                totalRetryAttempts: 0,
                retryRate: 0,
            };
        }

        const logs = data.data;
        const totalRequests = logs.length;
        const requestsWithRetries = logs.filter(
            (log) => Array.isArray(log.retry_attempts) && log.retry_attempts.length > 0,
        ).length;
        const totalRetryAttempts = logs.reduce(
            (sum, log) => sum + (Array.isArray(log.retry_attempts) ? log.retry_attempts.length : 0),
            0,
        );
        const retryRate =
            totalRequests > 0 ? Math.round((requestsWithRetries / totalRequests) * 100) : 0;

        return {
            totalRequests,
            requestsWithRetries,
            totalRetryAttempts,
            retryRate,
        };
    }, [data?.data]);

    return {
        statistics,
        isLoading,
        error,
    };
};
