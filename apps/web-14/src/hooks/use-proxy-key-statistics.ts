'use client';

import useSWR from 'swr';
import { useGetIdentity } from '@refinedev/core';
import { supabaseRpcClient } from '@/lib/supabase-rpc-client';
import type { ProxyKeyStatistics, User } from '@gemini-proxy/database';

interface UseProxyKeyStatisticsReturn {
    statistics: ProxyKeyStatistics | null;
    isLoading: boolean;
    error: Error | null;
    mutate: () => Promise<ProxyKeyStatistics | undefined>;
}

// Fetcher function for SWR
const fetcher = async (userId: string | undefined): Promise<ProxyKeyStatistics> => {
    return supabaseRpcClient.getProxyKeyStatistics(userId || undefined);
};

export const useProxyKeyStatistics = (): UseProxyKeyStatisticsReturn => {
    const { data: user } = useGetIdentity<User>();

    const {
        data: statistics,
        error,
        isLoading,
        mutate,
    } = useSWR<ProxyKeyStatistics, Error>(
        // SWR key includes user ID to ensure proper cache isolation
        user?.id ? `proxy-key-statistics-${user.id}` : null,
        () => fetcher(user?.id),
        {
            // Refresh every 3 minutes for proxy key statistics
            refreshInterval: 3 * 60 * 1000,
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
