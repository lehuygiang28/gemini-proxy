import type { Context } from 'hono';
import type { HonoApp } from '../types';
import { getSupabaseClient } from '../services/supabase.service';
import { computeCooldownUntil } from './compute-cooldown';
import { UPSTREAM_FAILURE_CLASS, type ClassifiedUpstreamFailure } from './types';

const FAILURE_REASONS: Partial<Record<ClassifiedUpstreamFailure['class'], string>> = {
    [UPSTREAM_FAILURE_CLASS.key_invalid]: 'invalid_key',
    [UPSTREAM_FAILURE_CLASS.key_permission]: 'permission',
    [UPSTREAM_FAILURE_CLASS.spend_limit]: 'spend_limit',
};

const PROJECT_POOL_COOLDOWN_CLASSES: ReadonlySet<ClassifiedUpstreamFailure['class']> = new Set([
    UPSTREAM_FAILURE_CLASS.rate_limit,
    UPSTREAM_FAILURE_CLASS.spend_limit,
    UPSTREAM_FAILURE_CLASS.key_permission,
]);

export function doesFailureCoolProjectPool(
    failureClass: ClassifiedUpstreamFailure['class'],
): boolean {
    return PROJECT_POOL_COOLDOWN_CLASSES.has(failureClass);
}

async function applyProjectPoolFailure(
    c: Context<HonoApp>,
    projectPoolId: string,
    cooldownUntil: Date | null,
): Promise<void> {
    const supabase = getSupabaseClient(c);
    const { data, error: selectError } = await supabase
        .from('google_project_pools')
        .select('consecutive_failures')
        .eq('id', projectPoolId);
    if (selectError) {
        console.error(`Failed to load project pool ${projectPoolId} for failure:`, selectError);
        return;
    }
    const poolRow = Array.isArray(data) ? data[0] : data;
    const { error } = await supabase
        .from('google_project_pools')
        .update({
            cooldown_until: cooldownUntil?.toISOString() ?? null,
            consecutive_failures: (poolRow?.consecutive_failures ?? 0) + 1,
        })
        .eq('id', projectPoolId);
    if (error) {
        console.error(`Failed to record project pool failure ${projectPoolId}:`, error);
    }
}

async function applyProjectPoolSuccess(c: Context<HonoApp>, projectPoolId: string): Promise<void> {
    const { error } = await getSupabaseClient(c)
        .from('google_project_pools')
        .update({
            consecutive_failures: 0,
            cooldown_until: null,
        })
        .eq('id', projectPoolId);
    if (error) {
        console.error(`Failed to record project pool success ${projectPoolId}:`, error);
    }
}

export async function recordApiKeyFailure(
    c: Context<HonoApp>,
    input: {
        readonly apiKeyId: string;
        readonly failure: ClassifiedUpstreamFailure;
        readonly consecutiveFailures: number;
        readonly projectPoolId?: string | null;
        readonly nowMs?: number;
        readonly random?: () => number;
    },
): Promise<void> {
    const cooldownUntil = computeCooldownUntil({
        failureClass: input.failure.class,
        retryAfterSeconds: input.failure.retryAfterSeconds,
        consecutiveFailures: input.consecutiveFailures,
        nowMs: input.nowMs ?? Date.now(),
        random: input.random ?? Math.random,
    });
    const { error } = await getSupabaseClient(c).rpc('record_api_key_failure', {
        p_id: input.apiKeyId,
        p_disable: input.failure.disableKey,
        p_cooldown_until: cooldownUntil?.toISOString() ?? null,
        p_reason: FAILURE_REASONS[input.failure.class] ?? null,
    });
    if (error) {
        console.error(`Failed to record API key failure ${input.apiKeyId}:`, error);
    }
    if (input.projectPoolId && doesFailureCoolProjectPool(input.failure.class)) {
        await applyProjectPoolFailure(c, input.projectPoolId, cooldownUntil);
    }
}

export async function recordApiKeySuccess(
    c: Context<HonoApp>,
    apiKeyId: string,
    projectPoolId?: string | null,
): Promise<void> {
    const { error } = await getSupabaseClient(c).rpc('record_api_key_success', {
        p_id: apiKeyId,
    });
    if (error) {
        console.error(`Failed to record API key success ${apiKeyId}:`, error);
    }
    if (projectPoolId) {
        await applyProjectPoolSuccess(c, projectPoolId);
    }
}
