'use client';

import useSWR from 'swr';
import { useGetIdentity } from '@refinedev/core';
import { supabaseRpcClient } from '@/lib/supabase-rpc-client';
import type { RetryStatistics, User } from '@gemini-proxy/database';

interface UseRetryStatisticsRpcReturn {
    statistics: RetryStatistics | null;
    isLoading: boolean;
    error: Error | null;
    mutate: () => Promise<RetryStatistics | undefined>;
}

// Fetcher function for SWR
const fetcher = async (params: {
    userId: string | undefined;
    daysBack: number;
}): Promise<RetryStatistics> => {
    return supabaseRpcClient.getRetryStatistics(params.userId, params.daysBack);
};

export const useRetryStatisticsRpc = (daysBack: number = 30): UseRetryStatisticsRpcReturn => {
    const { data: user } = useGetIdentity<User>();

    const {
        data: statistics,
        error,
        isLoading,
        mutate,
    } = useSWR<RetryStatistics, Error>(
        // SWR key includes user ID and days back for proper cache isolation
        user?.id ? `retry-statistics-${user.id}-${daysBack}` : null,
        () => fetcher({ userId: user?.id, daysBack }),
        {
            // Refresh every 2 minutes for retry statistics (more frequent than dashboard)
            refreshInterval: 2 * 60 * 1000,
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
