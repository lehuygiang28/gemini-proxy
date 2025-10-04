import { Tables } from '@gemini-proxy/database';

export type RequestLog = Tables<'request_logs'> & {
    api_keys?: Tables<'api_keys'> | null;
    proxy_api_keys?: Tables<'proxy_api_keys'> | null;
};

// Type definitions for retry attempt data structure
export interface RetryAttemptError {
    type: string;
    status?: number;
    message?: string;
}

export interface RetryAttemptProviderError {
    status: number;
    headers: Record<string, string>;
    raw_body: string;
}

export interface RetryAttempt {
    error: RetryAttemptError;
    timestamp: string;
    api_key_id: string;
    duration_ms: number;
    attempt_number: number;
    provider_error?: RetryAttemptProviderError;
}
