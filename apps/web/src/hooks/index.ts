// Statistics hooks using SWR with Supabase RPC
// Export all statistics hooks
export { useDashboardStatistics } from './use-dashboard-statistics';
export { useRetryStatisticsRpc } from './use-retry-statistics-rpc';
export { useApiKeyStatistics } from './use-api-key-statistics';
export { useProxyKeyStatistics } from './use-proxy-key-statistics';
export { useRequestLogsStatistics } from './use-request-logs-statistics';

// Advanced filtering hooks
export { useAdvancedFilters } from './use-advanced-filters';
export { useServerSideFilters } from './use-server-side-filters';

// Re-export types from database package for convenience
export type {
    DashboardStatistics,
    RetryStatistics,
    ApiKeyStatistics,
    ProxyKeyStatistics,
    RequestLogsStatistics,
    User,
} from '@gemini-proxy/database';
