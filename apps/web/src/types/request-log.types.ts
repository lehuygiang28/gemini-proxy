import { Tables } from '@gemini-proxy/database';

export type RequestLog = Tables<'request_logs'> & {
    api_keys?: Tables<'api_keys'> | null;
    proxy_api_keys?: Tables<'proxy_api_keys'> | null;
};

export interface RetryAttemptError {
    type: string;
    status?: number;
    message?: string;
    code?: string;
}

export interface RetryAttemptProviderError {
    status: number;
    headers: Record<string, string>;
    raw_body: string;
}

export interface RetryAttempt {
    error: RetryAttemptError;
    timestamp: string;
    api_key_id: string | null;
    api_key_name?: string | null;
    duration_ms: number;
    attempt_number: number;
    canonical_model?: string;
    provider_error?: RetryAttemptProviderError;
}
