import type { Variables as HonoVariables, Bindings as HonoBindings } from 'hono/types';
import type { Tables } from '@gemini-proxy/database';
import type { RetryConfig } from '../services/config.service';

export type ProxyApiFormat = 'gemini' | 'openai';

export type ProxyRequestDataParsed = {
    model?: string;
    apiFormat: ProxyApiFormat;
    stream: boolean;
    urlToProxy: string;
};

export type LoadBalanceStrategy = 'round_robin' | 'sticky_until_error';

export interface ProxyRequestOptions {
    retry?: Partial<RetryConfig> & {
        onZeroCompletionTokens?: boolean;
    };
    apiKeySelection?: {
        prioritizeNewer?: boolean;
        prioritizeLeastErrors?: boolean;
        prioritizeLeastRecentlyUsed?: boolean;
    };
    loadbalance?: {
        strategy?: LoadBalanceStrategy;
    };
}

// Hono-specific types
export interface Variables extends HonoVariables {
    proxyRequestId: string;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    proxyRequestOptions?: ProxyRequestOptions;
    requestStartTime?: number;
}

export interface Bindings extends HonoBindings {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    GOOGLE_GEMINI_API_BASE_URL: string;
    GOOGLE_OPENAI_API_BASE_URL: string;
    [key: string]: string;
}

export type HonoApp = {
    Variables: Variables;
    Bindings: Bindings;
};
