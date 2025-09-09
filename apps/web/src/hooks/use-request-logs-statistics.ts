'use client';

import useSWR from 'swr';
import { useGetIdentity } from '@refinedev/core';
import { supabaseRpcClient } from '@/lib/supabase-rpc-client';
import type { RequestLogsStatistics, User } from '@gemini-proxy/database';

interface UseRequestLogsStatisticsReturn {
    statistics: RequestLogsStatistics | null;
    isLoading: boolean;
    error: Error | null;
    mutate: () => Promise<RequestLogsStatistics | undefined>;
}

// Fetcher function for SWR
const fetcher = async (params: {
    userId: string | undefined;
    daysBack: number;
}): Promise<RequestLogsStatistics> => {
    return supabaseRpcClient.getRequestLogsStatistics(params.userId, params.daysBack);
};

export const useRequestLogsStatistics = (daysBack: number = 7): UseRequestLogsStatisticsReturn => {
    const { data: user } = useGetIdentity<User>();

    const {
        data: statistics,
        error,
        isLoading,
        mutate,
    } = useSWR<RequestLogsStatistics, Error>(
        // SWR key includes user ID and days back for proper cache isolation
        user?.id ? `request-logs-statistics-${user.id}-${daysBack}` : null,
        () => fetcher({ userId: user?.id, daysBack }),
        {
            // Refresh every 1 minute for request logs statistics (most frequent)
            refreshInterval: 1 * 60 * 1000,
            // Revalidate on focus
            revalidateOnFocus: true,
            // Keep previous data during revalidation
            keepPreviousData: true,
            // Error retry configuration
            errorRetryCount: 3,
            errorRetryInterval: 5000,
            // Dedupe requests within 2 seconds
            dedupingInterval: 2000,
        },
    );

    return {
        statistics: statistics || null,
        isLoading,
        error: error || null,
        mutate,
    };
};
