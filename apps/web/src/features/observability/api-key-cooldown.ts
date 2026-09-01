export type KeyBadgeState = 'active' | 'cooldown' | 'degraded' | 'disabled';

export function isCooldownActive(cooldownUntil: string | null | undefined, nowMs: number): boolean {
    if (!cooldownUntil) {
        return false;
    }
    return new Date(cooldownUntil).getTime() > nowMs;
}

export function resolveKeyBadgeState(params: {
    isActive: boolean;
    successRate: number;
    failureCount: number;
    cooldownUntil?: string | null;
    nowMs: number;
}): KeyBadgeState {
    if (isCooldownActive(params.cooldownUntil, params.nowMs)) {
        return 'cooldown';
    }
    if (!params.isActive) {
        return 'disabled';
    }
    if (params.failureCount > 0 && params.successRate < 90) {
        return 'degraded';
    }
    return 'active';
}

export type DisabledReason = 'invalid_key' | 'permission' | 'spend_limit' | 'manual';

export function isDisabledReason(value: string | null | undefined): value is DisabledReason {
    return (
        value === 'invalid_key' ||
        value === 'permission' ||
        value === 'spend_limit' ||
        value === 'manual'
    );
}
