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

export async function recordApiKeyFailure(
    c: Context<HonoApp>,
    input: {
        readonly apiKeyId: string;
        readonly failure: ClassifiedUpstreamFailure;
        readonly consecutiveFailures: number;
        readonly canonicalModel?: string;
        readonly nowMs?: number;
        readonly random?: () => number;
    },
): Promise<void> {
    const cooldown = computeCooldownUntil({
        failureClass: input.failure.class,
        retryAfterSeconds: input.failure.retryAfterSeconds,
        nowMs: input.nowMs ?? Date.now(),
        keyWide: input.failure.keyWide,
    });
    const { error } = await getSupabaseClient(c).rpc('record_api_key_failure', {
        p_id: input.apiKeyId,
        p_disable: input.failure.disableKey,
        p_cooldown_until: cooldown?.until.toISOString() ?? null,
        p_reason: FAILURE_REASONS[input.failure.class] ?? null,
        p_canonical_model: input.canonicalModel ?? '*',
        p_scope: cooldown?.scope ?? null,
    });
    if (error) {
        console.error(`Failed to record API key failure ${input.apiKeyId}:`, error);
    }
}

export async function recordApiKeySuccess(
    c: Context<HonoApp>,
    apiKeyId: string,
    canonicalModel?: string,
): Promise<void> {
    const { error } = await getSupabaseClient(c).rpc('record_api_key_success', {
        p_id: apiKeyId,
        p_canonical_model: canonicalModel ?? null,
    });
    if (error) {
        console.error(`Failed to record API key success ${apiKeyId}:`, error);
    }
}
