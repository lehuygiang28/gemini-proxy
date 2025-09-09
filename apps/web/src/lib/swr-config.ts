import { SWRConfiguration } from 'swr';

// Production-grade SWR configuration
export const swrConfig: SWRConfiguration = {
    // Revalidate on focus - good for real-time updates
    revalidateOnFocus: true,

    // Revalidate on reconnect - important for offline/online scenarios
    revalidateOnReconnect: true,

    // Refresh interval - periodic background updates (5 minutes)
    refreshInterval: 5 * 60 * 1000,

    // Dedupe interval - prevent duplicate requests within 2 seconds
    dedupingInterval: 2000,

    // Error retry configuration
    errorRetryCount: 3,
    errorRetryInterval: 5000,

    // Keep previous data during revalidation
    keepPreviousData: true,

    // Global error handler
    onError: (error, key) => {
        console.error('SWR Error:', error, 'Key:', key);

        // You can add error reporting here (e.g., Sentry, LogRocket, etc.)
        if (process.env.NODE_ENV === 'production') {
            // Report to error tracking service
            // errorTracking.captureException(error, { key });
        }
    },

    // Success handler for analytics
    onSuccess: (data, key) => {
        if (process.env.NODE_ENV === 'production') {
            // Track successful data fetches for analytics
            // analytics.track('data_fetch_success', { key, dataSize: JSON.stringify(data).length });
        }
    },
};

// Custom fetcher for Supabase RPC calls
export const supabaseRpcFetcher = async <T>(
    url: string,
    args: Record<string, any> = {},
): Promise<T> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        },
        body: JSON.stringify(args),
    });

    if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
    }

    const data = await response.json();
    return data;
};
