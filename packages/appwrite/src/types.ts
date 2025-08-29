export interface AppwriteRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    bodyRaw?: string;
    body?: any;
}

export interface AppwriteResponse {
    send: (body: any, status?: number, headers?: Record<string, any>) => any;
    json: (body: any, status?: number) => any;
    text: (body: string, status?: number) => any;
    empty: (status?: number) => any;
}

export interface AppwriteContext {
    req: AppwriteRequest;
    res: AppwriteResponse;
    log: (msg: any) => void;
    error: (msg: any) => void;
    warn: (msg: any) => void;
    info: (msg: any) => void;
    debug: (msg: any) => void;
}

// Environment variables interface
export interface AppwriteEnvironment {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    GOOGLE_GEMINI_API_BASE_URL?: string;
    GOOGLE_OPENAI_API_BASE_URL?: string;
    PROXY_MAX_RETRIES?: string;
    PROXY_RETRY_DELAY_MS?: string;
    PROXY_BACKOFF_MULTIPLIER?: string;
    PROXY_LOGGING_ENABLED?: string;
    PROXY_LOG_LEVEL?: string;
    NODE_ENV?: string;
    PORT?: string;
}
