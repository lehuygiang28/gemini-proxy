import type { Context } from 'hono';
import { SupabaseClient } from '@supabase/supabase-js';

import type { Tables } from '@gemini-proxy/database';
import { getSupabaseClient } from './supabase.service';
import type { HonoApp } from '../types';

export interface ApiKeyParams {
    userId: string | null;
    prioritizeNewer?: boolean;
    prioritizeLeastErrors?: boolean;
    prioritizeLeastRecentlyUsed?: boolean;
    count?: number;
}

export interface ApiKeyWithStats extends Tables<'api_keys'> {
    // Additional computed fields
    total_requests: number;
    successful_requests: number;
    error_rate: number;
    hours_since_creation: number;
    hours_since_last_use: number;
    health_score: number;
}

type ApiKeyComputedStats = {
    last_used_at: string | null;
    total_requests: number;
    successful_requests: number;
    error_rate: number;
    hours_since_creation: number;
    hours_since_last_use: number;
    health_score: number;
};

export class ApiKeyService {
    /**
     * Get the proxy API key from the request, this not api use for GOOGLE, this is our system api key.
     * @param c - The Hono context
     * @returns The proxy API key
     */
    static getProxyApiKey(c: Context<HonoApp>): string {
        const path = c.req.path;
        if (path.includes('/gemini/')) {
            return c.req.header('x-goog-api-key') || '';
        } else if (path.includes('/openai/')) {
            // Bearer <token>
            const authHeader = c.req.header('authorization') || '';
            return authHeader.split(' ')[1];
        }
        return '';
    }

    static async getSmartApiKeys(
        c: Context<HonoApp>,
        params: ApiKeyParams,
    ): Promise<ApiKeyWithStats[]> {
        const supabase = getSupabaseClient(c);

        const { data: apiKeys, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('is_active', true)
            .or(`user_id.is.null, user_id.eq.${params.userId}`)
            .order('last_used_at', { ascending: true })
            .order('last_error_at', { ascending: true })
            .order('failure_count', { ascending: true });

        if (error || !apiKeys) {
            throw new Error(`Failed to fetch API keys: ${error?.message}`);
        }

        const apiKeysWithStats = await Promise.all(
            apiKeys.map(async (apiKey) => {
                const stats = await this.getApiKeyStats(supabase, apiKey.id, apiKey.created_at);
                return { ...apiKey, ...stats };
            }),
        );

        return this.filterAndSortApiKeys(apiKeysWithStats, params);
    }

    private static async getApiKeyStats(
        supabase: SupabaseClient,
        apiKeyId: string,
        apiKeyCreatedAt: string | null,
    ): Promise<ApiKeyComputedStats> {
        const now = new Date();
        const createdAt = apiKeyCreatedAt ? new Date(apiKeyCreatedAt) : now;

        const { data: requestLogs, error } = await supabase
            .from('request_logs')
            .select('created_at, is_successful')
            .eq('api_key_id', apiKeyId)
            .order('created_at', { ascending: false });

        if (error || !requestLogs || requestLogs.length === 0) {
            return this.getDefaultStats();
        }

        const totalRequests = requestLogs.length;
        const successfulRequests = requestLogs.filter((log: any) => log.is_successful).length;
        const errorRate =
            totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0;
        const lastUsedAt = requestLogs[0]?.created_at || null;
        const hoursSinceLastUse = lastUsedAt
            ? (now.getTime() - new Date(lastUsedAt).getTime()) / (1000 * 60 * 60)
            : Infinity;
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        return {
            last_used_at: lastUsedAt,
            total_requests: totalRequests,
            successful_requests: successfulRequests,
            error_rate: errorRate,
            hours_since_creation: hoursSinceCreation,
            hours_since_last_use: hoursSinceLastUse,
            health_score: this.calculateHealthScore({
                errorRate,
                hoursSinceLastUse,
                totalRequests,
            }),
        };
    }

    private static calculateHealthScore(params: {
        errorRate: number;
        hoursSinceLastUse: number;
        totalRequests: number;
    }): number {
        const { errorRate, hoursSinceLastUse, totalRequests } = params;
        const errorScore = Math.max(0, 40 - errorRate * 0.4);
        const recencyScore = Math.min(30, (hoursSinceLastUse / 24) * 30);
        const usageScore =
            totalRequests > 0 ? Math.min(30, Math.max(0, 30 - (totalRequests / 100) * 10)) : 15;
        return Math.round(errorScore + recencyScore + usageScore);
    }

    private static filterAndSortApiKeys(
        apiKeys: ApiKeyWithStats[],
        params: ApiKeyParams,
    ): ApiKeyWithStats[] {
        const sortedKeys = [...apiKeys].sort((a, b) => {
            let scoreA = a.health_score;
            let scoreB = b.health_score;

            if (params.prioritizeNewer) {
                scoreA += (a.hours_since_creation || 0) * -0.1;
                scoreB += (b.hours_since_creation || 0) * -0.1;
            }

            if (params.prioritizeLeastErrors) {
                scoreA += (100 - a.error_rate) * 0.5;
                scoreB += (100 - b.error_rate) * 0.5;
            }

            if (params.prioritizeLeastRecentlyUsed) {
                scoreA += (a.hours_since_last_use || 0) * 0.3;
                scoreB += (b.hours_since_last_use || 0) * 0.3;
            }

            return scoreB - scoreA;
        });

        return params.count && params.count > 0 ? sortedKeys.slice(0, params.count) : sortedKeys;
    }

    private static getDefaultStats(): ApiKeyComputedStats {
        return {
            last_used_at: null,
            total_requests: 0,
            successful_requests: 0,
            error_rate: 0,
            hours_since_creation: 0,
            hours_since_last_use: Infinity,
            health_score: 50,
        };
    }

    static async getBestApiKey(
        c: Context<HonoApp>,
        params: ApiKeyParams,
    ): Promise<ApiKeyWithStats | null> {
        const apiKeys = await this.getSmartApiKeys(c, { ...params, count: 1 });
        return apiKeys.length > 0 ? apiKeys[0] : null;
    }
}
