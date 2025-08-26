import { createClient } from '@supabase/supabase-js';
import type { Database } from '@gemini-proxy/database';
import { ConfigManager } from './config';
import { ErrorHandler } from './error-handler';
import { Logger } from './logger';

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

async function getSupabaseClient() {
    if (!supabaseClient) {
        try {
            const config = await ConfigManager.getConfig();

            Logger.debug('Initializing Supabase client', { url: config.supabaseUrl });

            supabaseClient = createClient<Database>(
                config.supabaseUrl,
                config.supabaseServiceRoleKey,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                },
            );

            Logger.debug('Supabase client initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize Supabase client', error);
            throw ErrorHandler.createError('Failed to initialize database connection', {
                code: 'DB_INIT_ERROR',
                exitCode: 1,
            });
        }
    }
    return supabaseClient;
}

export const supabase = {
    get client() {
        if (!supabaseClient) {
            throw ErrorHandler.createError(
                'Database client not initialized. Please run a command first.',
                {
                    code: 'DB_NOT_INITIALIZED',
                    exitCode: 1,
                },
            );
        }
        return supabaseClient;
    },

    async init() {
        try {
            supabaseClient = await getSupabaseClient();
            return supabaseClient;
        } catch (error) {
            Logger.error('Database initialization failed', error);
            throw error;
        }
    },

    async testConnection() {
        try {
            const client = await this.init();
            const { data, error } = await client.from('api_keys').select('count').limit(1);

            if (error) {
                throw error;
            }

            Logger.debug('Database connection test successful');
            return true;
        } catch (error) {
            Logger.error('Database connection test failed', error);
            throw ErrorHandler.createError('Database connection test failed', {
                code: 'DB_CONNECTION_TEST_FAILED',
                exitCode: 1,
            });
        }
    },
};

export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert'];
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update'];

export type ProxyApiKey = Database['public']['Tables']['proxy_api_keys']['Row'];
export type ProxyApiKeyInsert = Database['public']['Tables']['proxy_api_keys']['Insert'];
export type ProxyApiKeyUpdate = Database['public']['Tables']['proxy_api_keys']['Update'];
