import { UPSTREAM_FAILURE_CLASS, type CooldownComputation } from './types';

const KEY_PERMISSION_COOLDOWN_MS = 900_000;
const RATE_LIMIT_DEFAULT_COOLDOWN_MS = 60_000;
const SPEND_LIMIT_COOLDOWN_MS = 3_600_000;

export function computeCooldownUntil(input: {
    readonly failureClass: (typeof UPSTREAM_FAILURE_CLASS)[keyof typeof UPSTREAM_FAILURE_CLASS];
    readonly retryAfterSeconds: number | null;
    readonly nowMs: number;
    readonly keyWide: boolean;
}): CooldownComputation | null {
    const { failureClass, retryAfterSeconds, nowMs, keyWide } = input;
    switch (failureClass) {
        case UPSTREAM_FAILURE_CLASS.key_permission:
            return {
                until: new Date(nowMs + KEY_PERMISSION_COOLDOWN_MS),
                scope: keyWide ? 'key' : 'key_model',
            };
        case UPSTREAM_FAILURE_CLASS.rate_limit: {
            const cooldownMs =
                retryAfterSeconds != null
                    ? retryAfterSeconds * 1000
                    : RATE_LIMIT_DEFAULT_COOLDOWN_MS;
            return {
                until: new Date(nowMs + cooldownMs),
                scope: keyWide ? 'key' : 'key_model',
            };
        }
        case UPSTREAM_FAILURE_CLASS.spend_limit:
            return {
                until: new Date(nowMs + SPEND_LIMIT_COOLDOWN_MS),
                scope: 'key',
            };
        default:
            return null;
    }
}
