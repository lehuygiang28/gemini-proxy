import { UPSTREAM_FAILURE_CLASS } from './types';

const KEY_PERMISSION_COOLDOWN_MS = 900_000;
const RATE_LIMIT_DEFAULT_COOLDOWN_MS = 60_000;
const SPEND_LIMIT_COOLDOWN_MS = 3_600_000;
const TRANSIENT_BASE_DELAY_MS = 1_000;
const TRANSIENT_MAX_DELAY_MS = 300_000;

function computeTransientCooldownMs(consecutiveFailures: number, random: () => number): number {
    const exponent = Math.min(
        TRANSIENT_MAX_DELAY_MS,
        TRANSIENT_BASE_DELAY_MS * 2 ** consecutiveFailures,
    );
    return random() * exponent;
}

export function computeCooldownUntil(input: {
    readonly failureClass: (typeof UPSTREAM_FAILURE_CLASS)[keyof typeof UPSTREAM_FAILURE_CLASS];
    readonly retryAfterSeconds: number | null;
    readonly consecutiveFailures: number;
    readonly nowMs: number;
    readonly random: () => number;
}): Date | null {
    const { failureClass, retryAfterSeconds, consecutiveFailures, nowMs, random } = input;
    switch (failureClass) {
        case UPSTREAM_FAILURE_CLASS.client_invalid:
        case UPSTREAM_FAILURE_CLASS.key_invalid:
        case UPSTREAM_FAILURE_CLASS.unknown:
            return null;
        case UPSTREAM_FAILURE_CLASS.key_permission:
            return new Date(nowMs + KEY_PERMISSION_COOLDOWN_MS);
        case UPSTREAM_FAILURE_CLASS.rate_limit: {
            const cooldownMs =
                retryAfterSeconds != null
                    ? retryAfterSeconds * 1000
                    : RATE_LIMIT_DEFAULT_COOLDOWN_MS;
            return new Date(nowMs + cooldownMs);
        }
        case UPSTREAM_FAILURE_CLASS.spend_limit:
            return new Date(nowMs + SPEND_LIMIT_COOLDOWN_MS);
        case UPSTREAM_FAILURE_CLASS.transient:
            return new Date(nowMs + computeTransientCooldownMs(consecutiveFailures, random));
        default:
            return null;
    }
}
