import type { Variables as HonoVariables, Bindings as HonoBindings } from 'hono/types';
import type { Tables } from '@gemini-proxy/database';
import type { ResolvedCombo, StoredCombo } from '../combo/combo-types';

export type ProxyApiFormat = 'gemini' | 'openai';

export type ProxyRequestDataParsed = {
    model?: string;
    apiFormat: ProxyApiFormat;
    stream: boolean;
    urlToProxy: string;
    managed: boolean;
};

export type LoadBalanceStrategy = 'round_robin' | 'sticky_until_error';

// Hono-specific types
export interface Variables extends HonoVariables {
    proxyRequestId: string;
    proxyRequestDataParsed: ProxyRequestDataParsed;
    proxyApiKeyData: Tables<'proxy_api_keys'>;
    proxyPolicyReservation?: {
        reserved_tokens: number;
        reserved_usd: number;
        window_starts: {
            minute: string | null;
            day: string | null;
            month: string | null;
        };
    };
    requestStartTime?: number;
    resolvedCombo?: ResolvedCombo;
    userCombos?: StoredCombo[];
    comboWinningMember?: string;
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
