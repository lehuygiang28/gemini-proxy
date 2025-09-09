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
}

// Export singleton instance
export const supabaseRpcClient = new SupabaseRpcClient();
