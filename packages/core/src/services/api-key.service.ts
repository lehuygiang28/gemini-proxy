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

export interface SelectedApiKey {
    id: string;
    api_key_value: string;
    name?: string;
    last_used_at: string | null;
    last_error_at: string | null;
    created_at: string | null;
    failure_count: number;
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

    /** Count available API keys for a user (including global keys with user_id null). */
    static async countAvailableApiKeys(
        c: Context<HonoApp>,
        userId: string | null,
    ): Promise<number> {
        const supabase = getSupabaseClient(c);
        const { count, error } = await supabase
            .from('api_keys')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .or(`user_id.is.null, user_id.eq.${userId}`);
        if (error) {
            throw new Error(`Failed to count API keys: ${error.message}`);
        }
        return count || 0;
    }

    /**
     * Reserve the next best API key according to selection criteria, excluding used IDs.
     * It immediately updates last_used_at to reduce race conditions across concurrent requests.
     */
    static async reserveNextApiKey(
        c: Context<HonoApp>,
        params: ApiKeyParams & { excludeIds?: string[]; preferKeyId?: string | null },
    ): Promise<SelectedApiKey | null> {
        const supabase = getSupabaseClient(c);
        const CANDIDATE_POOL_SIZE = Math.max(3, Math.min(10, (params.count ?? 0) || 5));

        // Helper to fetch a small candidate pool ordered for round-robin
        const fetchCandidates = async () => {
            let query = supabase
                .from('api_keys')
                .select(
                    'id, api_key_value, name, last_used_at, last_error_at, created_at, failure_count, is_active',
                )
                .eq('is_active', true)
                .or(`user_id.is.null, user_id.eq.${params.userId}`);

            const excludeIds =
                params.excludeIds && params.excludeIds.length > 0 ? params.excludeIds : [];
            if (excludeIds.length > 0) {
                const inList = `(${excludeIds.map((id) => `"${id}"`).join(',')})`;
                query = query.not('id', 'in', inList);
            }

            // Primary RR ordering
            query = query
                .order('last_used_at', { ascending: true, nullsFirst: true })
                .order('last_error_at', { ascending: true, nullsFirst: true });

            // Preferences as tie-breakers
            if (params.prioritizeLeastErrors) {
                query = query.order('failure_count', { ascending: true, nullsFirst: true });
            }
            if (params.prioritizeNewer) {
                query = query.order('created_at', { ascending: false, nullsFirst: true });
            }

            const { data, error } = await query.limit(CANDIDATE_POOL_SIZE);
            if (error || !data || data.length === 0) return [] as SelectedApiKey[];
            return data as unknown as SelectedApiKey[];
        };

        // Try to atomically reserve a key by conditionally updating last_used_at if unchanged
        const tryReserve = async (candidate: SelectedApiKey): Promise<boolean> => {
            const nowIso = new Date().toISOString();
            let updateQuery = supabase
                .from('api_keys')
                .update({ last_used_at: nowIso, updated_at: nowIso })
                .eq('id', candidate.id)
                .eq('is_active', true);

            if (candidate.last_used_at === null) {
                updateQuery = updateQuery.is('last_used_at', null);
            } else {
                updateQuery = updateQuery.eq('last_used_at', candidate.last_used_at);
            }

            const { error, data } = await updateQuery.select('id');
            if (error) return false;
            const ok = (data?.length ?? 0) > 0;
            if (ok) {
                const requestId = (c as any).get?.('proxyRequestId');
                console.log(
                    `[${requestId}] Reserved API key: ${candidate.id}` +
                        (candidate.name ? ` (${candidate.name})` : ''),
                );
            }
            return ok;
        };

        // Helper: determine if a key is healthy for sticky reuse
        const isHealthyForSticky = (key: {
            last_used_at: string | null;
            last_error_at: string | null;
            is_active?: boolean;
        }): boolean => {
            // must be active
            if (key.is_active === false) return false;
            // If no error ever, healthy
            if (!key.last_error_at) return true;
            // If never used, but has error timestamp, consider unhealthy to avoid thrashing
            if (!key.last_used_at) return false;
            // Healthy only when last error happened strictly before last successful use
            try {
                const errAt = new Date(key.last_error_at).getTime();
                const usedAt = new Date(key.last_used_at).getTime();
                return errAt < usedAt;
            } catch {
                // On parsing issues, be conservative
                return false;
            }
        };

        // Sticky try: prefer a specific key id if provided, not excluded, and healthy
        if (params.preferKeyId && !(params.excludeIds || []).includes(params.preferKeyId)) {
            const { data: preferred, error: preferErr } = await getSupabaseClient(c)
                .from('api_keys')
                .select(
                    'id, api_key_value, name, last_used_at, last_error_at, created_at, failure_count, is_active',
                )
                .eq('id', params.preferKeyId)
                .single();
            if (!preferErr && preferred && isHealthyForSticky(preferred)) {
                const selected: SelectedApiKey = {
                    id: preferred.id,
                    api_key_value: preferred.api_key_value,
                    name: preferred.name,
                    last_used_at: preferred.last_used_at,
                    last_error_at: preferred.last_error_at,
                    created_at: preferred.created_at,
                    failure_count: preferred.failure_count,
                };
                // Optimistic reservation to avoid concurrent reuse
                const ok = await tryReserve(selected);
                if (ok) return selected;
            }
        }

        // Fetch a pool and attempt to reserve one atomically
        const candidates = await fetchCandidates();
        for (const candidate of candidates) {
            const ok = await tryReserve(candidate);
            if (ok) return candidate;
        }

        return null;
    }

    /** Update last_used_at to now without touching counters. */
    static async touchLastUsed(c: Context, apiKeyId: string): Promise<void> {
        const supabase = getSupabaseClient(c);
        await supabase
            .from('api_keys')
            .update({
                last_used_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', apiKeyId);
    }

    /** Update last_error_at to now without changing counters (counters are handled elsewhere). */
    static async touchLastError(c: Context, apiKeyId: string): Promise<void> {
        const supabase = getSupabaseClient(c);
        await supabase
            .from('api_keys')
            .update({
                last_error_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', apiKeyId);
    }
}
