import { createClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { ConfigManager } from './config.js';

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

async function getSupabaseClient() {
    if (!supabaseClient) {
        const config = await ConfigManager.getConfig();

        supabaseClient = createClient<Database>(config.supabaseUrl, config.supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return supabaseClient;
}

export const supabase = {
    get client() {
        if (!supabaseClient) {
            throw new Error('Database client not initialized. Please run a command first.');
        }
        return supabaseClient;
    },
    async init() {
        supabaseClient = await getSupabaseClient();
        return supabaseClient;
    },
};

export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert'];
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update'];

export type ProxyApiKey = Database['public']['Tables']['proxy_api_keys']['Row'];
export type ProxyApiKeyInsert = Database['public']['Tables']['proxy_api_keys']['Insert'];
export type ProxyApiKeyUpdate = Database['public']['Tables']['proxy_api_keys']['Update'];
