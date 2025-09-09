// Statistics types for RPC functions
// These match the return types defined in our PostgreSQL functions

export interface DashboardStatistics {
    total_api_keys: number;
    total_proxy_keys: number;
    total_requests: number;
    successful_requests: number;
    total_tokens: number;
    avg_response_time_ms: number;
    success_rate: number;
    active_keys: number;
}

export interface RetryStatistics {
    total_requests: number;
    requests_with_retries: number;
    total_retry_attempts: number;
    retry_rate: number;
    period_days: number;
}

export interface ApiKeyStatistics {
    total_keys: number;
    active_keys: number;
    inactive_keys: number;
    total_success_count: number;
    total_failure_count: number;
    total_usage_count: number;
    success_rate: number;
}

export interface ProxyKeyStatistics {
    total_keys: number;
    active_keys: number;
    inactive_keys: number;
    total_success_count: number;
    total_failure_count: number;
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    success_rate: number;
}

export interface RequestLogsStatistics {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    total_tokens: number;
    avg_response_time_ms: number;
    success_rate: number;
    requests_by_format: Record<string, number>;
    requests_by_hour: Record<string, number>;
    period_days: number;
}
