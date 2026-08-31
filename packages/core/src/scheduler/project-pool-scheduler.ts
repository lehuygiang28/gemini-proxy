import type { Context } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '../services/supabase.service';
import type { HonoApp } from '../types';

const API_KEY_SELECT_FIELDS =
    'id, api_key_value, name, last_used_at, last_error_at, created_at, failure_count, consecutive_failures, cooldown_until, is_active, project_pool_id';
const DEFAULT_CANDIDATE_POOL_SIZE = 5;
const MINIMUM_CANDIDATE_POOL_SIZE = 3;
const MAXIMUM_CANDIDATE_POOL_SIZE = 10;

export interface SchedulerCandidate {
    readonly id: string;
    readonly projectPoolId: string | null;
    readonly lastUsedAt: string | null;
    readonly lastErrorAt: string | null;
    readonly failureCount: number;
    readonly createdAt: string | null;
    readonly cooldownUntil: string | null;
    readonly isActive: boolean;
}

export interface PoolWindowState {
    readonly poolId: string;
    readonly cooldownUntil: string | null;
    readonly rpmLimit: number | null;
    readonly tpmLimit: number | null;
    readonly minuteRequests: number;
    readonly minuteTokens: number;
}

export interface SelectPoolAndKeyInput {
    readonly candidates: SchedulerCandidate[];
    readonly pools: PoolWindowState[];
    readonly nowMs: number;
    readonly excludeKeyIds: string[];
    readonly preferKeyId: string | null;
    readonly requiredPoolId: string | null;
    readonly requiredKeyId: string | null;
}

export interface PoolAndKeySelection {
    readonly keyId: string;
    readonly poolId: string | null;
}

export interface SelectedApiKey {
    readonly id: string;
    readonly api_key_value: string;
    readonly name?: string;
    readonly last_used_at: string | null;
    readonly last_error_at: string | null;
    readonly created_at: string | null;
    readonly failure_count: number;
    readonly consecutive_failures: number;
    readonly cooldown_until: string | null;
    readonly project_pool_id: string | null;
}

export interface ProjectPoolReservationInput {
    readonly userId: string;
    readonly excludeKeyIds?: readonly string[];
    readonly excludePoolIds?: readonly string[];
    readonly preferKeyId?: string | null;
    readonly requiredPoolId?: string | null;
    readonly requiredKeyId?: string | null;
    readonly candidateCount?: number;
    readonly prioritizeLeastErrors?: boolean;
    readonly prioritizeNewer?: boolean;
}

interface CandidateGroup {
    readonly poolId: string | null;
    readonly selectedKey: SchedulerCandidate;
    readonly score: number;
}

function compareNullableTimestamps(
    firstTimestamp: string | null,
    secondTimestamp: string | null,
): number {
    if (firstTimestamp === secondTimestamp) return 0;
    if (firstTimestamp === null) return -1;
    if (secondTimestamp === null) return 1;
    return firstTimestamp.localeCompare(secondTimestamp);
}

function compareCandidates(
    firstCandidate: SchedulerCandidate,
    secondCandidate: SchedulerCandidate,
): number {
    const lastUsedComparison = compareNullableTimestamps(
        firstCandidate.lastUsedAt,
        secondCandidate.lastUsedAt,
    );
    if (lastUsedComparison !== 0) return lastUsedComparison;
    const lastErrorComparison = compareNullableTimestamps(
        firstCandidate.lastErrorAt,
        secondCandidate.lastErrorAt,
    );
    if (lastErrorComparison !== 0) return lastErrorComparison;
    if (firstCandidate.failureCount !== secondCandidate.failureCount) {
        return firstCandidate.failureCount - secondCandidate.failureCount;
    }
    const createdAtComparison = compareNullableTimestamps(
        secondCandidate.createdAt,
        firstCandidate.createdAt,
    );
    if (createdAtComparison !== 0) return createdAtComparison;
    return firstCandidate.id.localeCompare(secondCandidate.id);
}

function isTimestampInFuture(timestamp: string | null, nowMs: number): boolean {
    return timestamp !== null && new Date(timestamp).getTime() > nowMs;
}

function isAssignedPoolAvailable(
    projectPoolId: string | null,
    pool: PoolWindowState | undefined,
    nowMs: number,
): boolean {
    if (projectPoolId === null) return true;
    if (!pool) return false;
    if (isTimestampInFuture(pool.cooldownUntil, nowMs)) return false;
    if (pool.rpmLimit !== null && pool.minuteRequests >= pool.rpmLimit) return false;
    return pool.tpmLimit === null || pool.minuteTokens < pool.tpmLimit;
}

function calculatePoolScore(pool: PoolWindowState | undefined): number {
    if (!pool) return 0;
    if (pool.rpmLimit === null && pool.tpmLimit === null) return pool.minuteRequests;
    const requestLoad = pool.rpmLimit === null ? 0 : pool.minuteRequests / pool.rpmLimit;
    const tokenLoad = pool.tpmLimit === null ? 0 : pool.minuteTokens / pool.tpmLimit;
    return 0.5 * requestLoad + 0.5 * tokenLoad;
}

function isHealthyForSticky(candidate: SchedulerCandidate): boolean {
    if (candidate.lastErrorAt === null) return true;
    if (candidate.lastUsedAt === null) return false;
    return new Date(candidate.lastErrorAt).getTime() < new Date(candidate.lastUsedAt).getTime();
}

function createCandidateGroups(
    candidates: SchedulerCandidate[],
    poolById: ReadonlyMap<string, PoolWindowState>,
): CandidateGroup[] {
    const candidatesByGroup = new Map<string, SchedulerCandidate[]>();
    for (const candidate of candidates) {
        const groupId =
            candidate.projectPoolId === null
                ? `singleton:${candidate.id}`
                : `pool:${candidate.projectPoolId}`;
        const groupCandidates = candidatesByGroup.get(groupId) ?? [];
        groupCandidates.push(candidate);
        candidatesByGroup.set(groupId, groupCandidates);
    }
    return [...candidatesByGroup.values()].map((groupCandidates) => {
        const selectedKey = [...groupCandidates].sort(compareCandidates)[0]!;
        const pool =
            selectedKey.projectPoolId === null
                ? undefined
                : poolById.get(selectedKey.projectPoolId);
        return {
            poolId: selectedKey.projectPoolId,
            selectedKey,
            score: calculatePoolScore(pool),
        };
    });
}

export function selectPoolAndKey(input: SelectPoolAndKeyInput): PoolAndKeySelection | null {
    const excludedKeyIds = new Set(input.excludeKeyIds);
    const poolById = new Map(input.pools.map((pool) => [pool.poolId, pool]));
    const eligibleCandidates = input.candidates.filter((candidate) => {
        if (!candidate.isActive || excludedKeyIds.has(candidate.id)) return false;
        if (isTimestampInFuture(candidate.cooldownUntil, input.nowMs)) return false;
        if (input.requiredKeyId !== null && candidate.id !== input.requiredKeyId) return false;
        if (input.requiredPoolId !== null && candidate.projectPoolId !== input.requiredPoolId) {
            return false;
        }
        const pool =
            candidate.projectPoolId === null ? undefined : poolById.get(candidate.projectPoolId);
        return isAssignedPoolAvailable(candidate.projectPoolId, pool, input.nowMs);
    });
    const preferredCandidate = eligibleCandidates.find(
        (candidate) => candidate.id === input.preferKeyId && isHealthyForSticky(candidate),
    );
    if (preferredCandidate) {
        return {
            keyId: preferredCandidate.id,
            poolId: preferredCandidate.projectPoolId,
        };
    }
    const groups = createCandidateGroups(eligibleCandidates, poolById);
    groups.sort((firstGroup, secondGroup) => {
        if (firstGroup.score !== secondGroup.score) {
            return firstGroup.score - secondGroup.score;
        }
        return compareCandidates(firstGroup.selectedKey, secondGroup.selectedKey);
    });
    const selectedGroup = groups[0];
    return selectedGroup
        ? { keyId: selectedGroup.selectedKey.id, poolId: selectedGroup.poolId }
        : null;
}

interface ApiKeyReservationRow extends SelectedApiKey {
    readonly is_active: boolean;
}

interface ReservationCandidate extends SchedulerCandidate {
    readonly selectedApiKey: SelectedApiKey;
}

function createMinuteWindowStartIso(nowMs: number): string {
    return new Date(Math.floor(nowMs / 60_000) * 60_000).toISOString();
}

function collectDistinctPoolIds(candidates: ReservationCandidate[]): string[] {
    return [
        ...new Set(
            candidates
                .map((candidate) => candidate.projectPoolId)
                .filter((poolId): poolId is string => poolId !== null),
        ),
    ];
}

function mapPoolWindowState(
    pool: {
        id: string;
        cooldown_until: string | null;
        rpm_limit: number | null;
        tpm_limit: number | null;
    },
    window: { request_count: number; token_count: number } | undefined,
): PoolWindowState {
    return {
        poolId: pool.id,
        cooldownUntil: pool.cooldown_until,
        rpmLimit: pool.rpm_limit,
        tpmLimit: pool.tpm_limit,
        minuteRequests: window?.request_count ?? 0,
        minuteTokens: window?.token_count ?? 0,
    };
}

async function fetchPoolWindowStates(
    supabase: SupabaseClient,
    poolIds: string[],
    nowMs: number,
): Promise<PoolWindowState[]> {
    if (poolIds.length === 0) return [];
    const { data: poolRows, error: poolError } = await supabase
        .from('google_project_pools')
        .select('id, cooldown_until, rpm_limit, tpm_limit')
        .in('id', poolIds);
    if (poolError || !poolRows) return [];
    const { data: windowRows } = await supabase
        .from('project_pool_quota_windows')
        .select('project_pool_id, request_count, token_count')
        .eq('window_type', 'minute')
        .eq('window_start', createMinuteWindowStartIso(nowMs))
        .in('project_pool_id', poolIds);
    const windowByPoolId = new Map(
        (windowRows ?? []).map((window) => [window.project_pool_id, window]),
    );
    return poolRows.map((pool) => mapPoolWindowState(pool, windowByPoolId.get(pool.id)));
}

async function incrementPoolMinuteWindow(
    supabase: SupabaseClient,
    poolId: string,
    nowMs: number,
): Promise<void> {
    const windowStart = createMinuteWindowStartIso(nowMs);
    const { data, error } = await supabase
        .from('project_pool_quota_windows')
        .select('request_count')
        .eq('project_pool_id', poolId)
        .eq('window_type', 'minute')
        .eq('window_start', windowStart);
    if (error) return;
    const existingWindow = Array.isArray(data) ? data[0] : data;
    if (existingWindow) {
        await supabase
            .from('project_pool_quota_windows')
            .update({ request_count: (existingWindow.request_count ?? 0) + 1 })
            .eq('project_pool_id', poolId)
            .eq('window_type', 'minute')
            .eq('window_start', windowStart);
        return;
    }
    await supabase.from('project_pool_quota_windows').upsert({
        project_pool_id: poolId,
        window_type: 'minute',
        window_start: windowStart,
        request_count: 1,
        token_count: 0,
    });
}

function mapReservationCandidate(row: ApiKeyReservationRow): ReservationCandidate {
    return {
        id: row.id,
        projectPoolId: row.project_pool_id ?? null,
        lastUsedAt: row.last_used_at,
        lastErrorAt: row.last_error_at,
        failureCount: row.failure_count,
        createdAt: row.created_at,
        cooldownUntil: row.cooldown_until,
        isActive: row.is_active,
        selectedApiKey: {
            id: row.id,
            api_key_value: row.api_key_value,
            name: row.name,
            last_used_at: row.last_used_at,
            last_error_at: row.last_error_at,
            created_at: row.created_at,
            failure_count: row.failure_count,
            consecutive_failures: row.consecutive_failures,
            cooldown_until: row.cooldown_until,
            project_pool_id: row.project_pool_id ?? null,
        },
    };
}

function createPostgrestInList(ids: readonly string[]): string {
    return `(${ids.map((id) => `"${id}"`).join(',')})`;
}

function calculateCandidatePoolSize(candidateCount: number | undefined): number {
    const requestedCount =
        candidateCount && candidateCount > 0 ? candidateCount : DEFAULT_CANDIDATE_POOL_SIZE;
    return Math.max(
        MINIMUM_CANDIDATE_POOL_SIZE,
        Math.min(MAXIMUM_CANDIDATE_POOL_SIZE, requestedCount),
    );
}

async function fetchCandidates(
    supabase: SupabaseClient,
    input: ProjectPoolReservationInput,
    nowIso: string,
): Promise<ReservationCandidate[]> {
    let query = supabase
        .from('api_keys')
        .select(API_KEY_SELECT_FIELDS)
        .eq('is_active', true)
        .is('deleted_at', null)
        .eq('user_id', input.userId)
        .or(`cooldown_until.is.null,cooldown_until.lte.${nowIso}`);
    const excludeKeyIds = input.excludeKeyIds ?? [];
    if (excludeKeyIds.length > 0) {
        query = query.not('id', 'in', createPostgrestInList(excludeKeyIds));
    }
    query = query
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .order('last_error_at', { ascending: true, nullsFirst: true });
    if (input.prioritizeLeastErrors) {
        query = query.order('failure_count', { ascending: true, nullsFirst: true });
    }
    if (input.prioritizeNewer) {
        query = query.order('created_at', { ascending: false, nullsFirst: true });
    }
    const { data, error } = await query.limit(calculateCandidatePoolSize(input.candidateCount));
    if (error || !data) return [];
    return (data as ApiKeyReservationRow[])
        .filter((row) => !excludeKeyIds.includes(row.id))
        .map(mapReservationCandidate);
}

async function fetchCandidateById(
    supabase: SupabaseClient,
    input: ProjectPoolReservationInput,
    keyId: string,
    nowIso: string,
): Promise<ReservationCandidate | null> {
    const { data, error } = await supabase
        .from('api_keys')
        .select(API_KEY_SELECT_FIELDS)
        .eq('id', keyId)
        .eq('user_id', input.userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .or(`cooldown_until.is.null,cooldown_until.lte.${nowIso}`)
        .single();
    if (error || !data) return null;
    const row = Array.isArray(data)
        ? (data as ApiKeyReservationRow[]).find((candidate) => candidate.id === keyId)
        : (data as ApiKeyReservationRow);
    return row ? mapReservationCandidate(row) : null;
}

async function tryReserve(
    c: Context<HonoApp>,
    supabase: SupabaseClient,
    candidate: ReservationCandidate,
): Promise<boolean> {
    const nowIso = new Date().toISOString();
    let updateQuery = supabase
        .from('api_keys')
        .update({ last_used_at: nowIso, updated_at: nowIso })
        .eq('id', candidate.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .or(`cooldown_until.is.null,cooldown_until.lte.${nowIso}`);
    updateQuery =
        candidate.lastUsedAt === null
            ? updateQuery.is('last_used_at', null)
            : updateQuery.eq('last_used_at', candidate.lastUsedAt);
    const { error, data } = await updateQuery.select('id');
    if (error || (data?.length ?? 0) === 0) return false;
    const requestId = c.get('proxyRequestId');
    console.log(
        `[${requestId}] Reserved API key: ${candidate.id}` +
            (candidate.selectedApiKey.name ? ` (${candidate.selectedApiKey.name})` : ''),
    );
    return true;
}

async function addPinnedCandidate(
    candidates: ReservationCandidate[],
    supabase: SupabaseClient,
    input: ProjectPoolReservationInput,
    nowIso: string,
): Promise<ReservationCandidate[]> {
    const pinnedKeyId = input.requiredKeyId ?? input.preferKeyId;
    if (!pinnedKeyId || candidates.some((candidate) => candidate.id === pinnedKeyId)) {
        return candidates;
    }
    const pinnedCandidate = await fetchCandidateById(supabase, input, pinnedKeyId, nowIso);
    return pinnedCandidate ? [pinnedCandidate, ...candidates] : candidates;
}

export class ProjectPoolScheduler {
    /** Select and atomically reserve the next eligible Gemini API key. */
    static async reserveNext(
        c: Context<HonoApp>,
        input: ProjectPoolReservationInput,
    ): Promise<SelectedApiKey | null> {
        const supabase = getSupabaseClient(c);
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const fetchedCandidates = await fetchCandidates(supabase, input, nowIso);
        const candidates = await addPinnedCandidate(fetchedCandidates, supabase, input, nowIso);
        const excludedPoolIds = new Set(input.excludePoolIds ?? []);
        const eligibleCandidates = candidates.filter(
            (candidate) =>
                candidate.projectPoolId === null || !excludedPoolIds.has(candidate.projectPoolId),
        );
        const pools = await fetchPoolWindowStates(
            supabase,
            collectDistinctPoolIds(eligibleCandidates),
            nowMs,
        );
        const attemptedKeyIds = new Set(input.excludeKeyIds ?? []);
        while (true) {
            const selection = selectPoolAndKey({
                candidates: eligibleCandidates,
                pools,
                nowMs,
                excludeKeyIds: [...attemptedKeyIds],
                preferKeyId: input.preferKeyId ?? null,
                requiredPoolId: input.requiredPoolId ?? null,
                requiredKeyId: input.requiredKeyId ?? null,
            });
            if (!selection) return null;
            const candidate = eligibleCandidates.find(
                (currentCandidate) => currentCandidate.id === selection.keyId,
            );
            if (!candidate) return null;
            if (await tryReserve(c, supabase, candidate)) {
                if (candidate.projectPoolId !== null) {
                    await incrementPoolMinuteWindow(supabase, candidate.projectPoolId, nowMs);
                }
                return candidate.selectedApiKey;
            }
            attemptedKeyIds.add(candidate.id);
        }
    }
}
