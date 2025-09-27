'use client';

import useSWR from 'swr';
import { useGetIdentity } from '@refinedev/core';
import { supabaseRpcClient } from '@/lib/supabase-rpc-client';
import type { DashboardStatistics, User } from '@gemini-proxy/database';

interface UseDashboardStatisticsReturn {
    statistics: DashboardStatistics | null;
    isLoading: boolean;
    error: Error | null;
    mutate: () => Promise<DashboardStatistics | undefined>;
}

// Fetcher function for SWR
const fetcher = async (userId: string | undefined): Promise<DashboardStatistics> => {
    return supabaseRpcClient.getDashboardStatistics(userId || undefined);
};

export const useDashboardStatistics = (): UseDashboardStatisticsReturn => {
    const { data: user } = useGetIdentity<User>();

    const {
        data: statistics,
        error,
        isLoading,
        mutate,
    } = useSWR<DashboardStatistics, Error>(
        // SWR key includes user ID to ensure proper cache isolation
        user?.id ? `dashboard-statistics-${user.id}` : null,
        () => fetcher(user?.id),
        {
            // Refresh every 5 minutes
            refreshInterval: 5 * 60 * 1000,
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
