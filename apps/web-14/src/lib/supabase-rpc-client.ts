import { supabaseBrowserClient } from '@/utils/supabase/client';
import type {
    DashboardStatistics,
    RetryStatistics,
    ApiKeyStatistics,
    ProxyKeyStatistics,
    RequestLogsStatistics,
} from '@gemini-proxy/database';

// Type-safe RPC client for Supabase functions
export class SupabaseRpcClient {
    private client = supabaseBrowserClient;

    // Dashboard statistics
    async getDashboardStatistics(userId?: string) {
        const { data, error } = await this.client.rpc('get_dashboard_statistics', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`Dashboard statistics error: ${error.message}`);
        }

        return data as unknown as DashboardStatistics;
    }

    // Retry statistics
    async getRetryStatistics(userId?: string, daysBack: number = 30) {
        const { data, error } = await this.client.rpc('get_retry_statistics', {
            p_user_id: userId || undefined,
            p_days_back: daysBack,
        });

        if (error) {
            throw new Error(`Retry statistics error: ${error.message}`);
        }

        return data as unknown as RetryStatistics;
    }

    // API key statistics
    async getApiKeyStatistics(userId?: string) {
        const { data, error } = await this.client.rpc('get_api_key_statistics', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`API key statistics error: ${error.message}`);
        }

        return data as unknown as ApiKeyStatistics;
    }

    // Proxy key statistics
    async getProxyKeyStatistics(userId?: string) {
        const { data, error } = await this.client.rpc('get_proxy_key_statistics', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`Proxy key statistics error: ${error.message}`);
        }

        return data as unknown as ProxyKeyStatistics;
    }

    // Request logs statistics
    async getRequestLogsStatistics(userId?: string, daysBack: number = 7) {
        const { data, error } = await this.client.rpc('get_request_logs_statistics', {
            p_user_id: userId || undefined,
            p_days_back: daysBack,
        });

        if (error) {
            throw new Error(`Request logs statistics error: ${error.message}`);
        }

        return data as unknown as RequestLogsStatistics;
    }

    // Filter options - get all filter options in one call (most efficient)
    async getFilterOptionsAll(userId?: string) {
        const { data, error } = await this.client.rpc('get_filter_options_all', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`Filter options error: ${error.message}`);
        }

        return data as {
            models: string[];
            error_types: string[];
            status_codes: number[];
            api_formats: string[];
        };
    }

    // Individual filter options methods (for specific needs)
    async getFilterOptionsModels(userId?: string): Promise<string[]> {
        const { data, error } = await this.client.rpc('get_filter_options_models', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`Models filter options error: ${error.message}`);
        }

        return data as string[];
    }

    async getFilterOptionsErrorTypes(userId?: string): Promise<string[]> {
        const { data, error } = await this.client.rpc('get_filter_options_error_types', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`Error types filter options error: ${error.message}`);
        }

        return data as string[];
    }

    async getFilterOptionsStatusCodes(userId?: string): Promise<number[]> {
        const { data, error } = await this.client.rpc('get_filter_options_status_codes', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`Status codes filter options error: ${error.message}`);
        }

        return data as number[];
    }

    async getFilterOptionsApiFormats(userId?: string): Promise<string[]> {
        const { data, error } = await this.client.rpc('get_filter_options_api_formats', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`API formats filter options error: ${error.message}`);
        }

        return data as string[];
    }

    // Admin-only filter options
    async getFilterOptionsUserIds(userId?: string): Promise<string[]> {
        const { data, error } = await this.client.rpc('get_filter_options_user_ids', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`User IDs filter options error: ${error.message}`);
        }

        return data as string[];
    }

    async getFilterOptionsProxyKeyIds(userId?: string): Promise<string[]> {
        const { data, error } = await this.client.rpc('get_filter_options_proxy_key_ids', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`Proxy key IDs filter options error: ${error.message}`);
        }

        return data as string[];
    }

    async getFilterOptionsApiKeyIds(userId?: string): Promise<string[]> {
        const { data, error } = await this.client.rpc('get_filter_options_api_key_ids', {
            p_user_id: userId || undefined,
        });

        if (error) {
            throw new Error(`API key IDs filter options error: ${error.message}`);
        }

        return data as string[];
    }
}

// Export singleton instance
export const supabaseRpcClient = new SupabaseRpcClient();
