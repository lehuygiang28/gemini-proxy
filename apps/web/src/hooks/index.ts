// Statistics hooks using SWR with Supabase RPC
// Export all statistics hooks
export { useDashboardStatistics } from './use-dashboard-statistics';
export { useRetryStatisticsRpc } from './use-retry-statistics-rpc';
export { useApiKeyStatistics } from './use-api-key-statistics';
export { useProxyKeyStatistics } from './use-proxy-key-statistics';
export { useRequestLogsStatistics } from './use-request-logs-statistics';

// Re-export types from database package for convenience
export type {
    DashboardStatistics,
    RetryStatistics,
    ApiKeyStatistics,
    ProxyKeyStatistics,
    RequestLogsStatistics,
    User,
} from '@gemini-proxy/database';

// Legacy hook (deprecated - use useRetryStatisticsRpc instead)
export { useRetryStatistics } from './use-retry-statistics';
