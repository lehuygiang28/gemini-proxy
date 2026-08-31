import { describe, expect, it } from 'vitest';
import { UPSTREAM_FAILURE_CLASS } from './types';
import { computeCooldownUntil } from './compute-cooldown';

const NOW_MS = 1_700_000_000_000;
const RANDOM_HALF = (): number => 0.5;

describe('computeCooldownUntil', () => {
    it('returns null for client_invalid', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.client_invalid,
            retryAfterSeconds: null,
            consecutiveFailures: 0,
            nowMs: NOW_MS,
            random: RANDOM_HALF,
        });
        expect(actual).toBeNull();
    });

    it('returns null for key_invalid', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.key_invalid,
            retryAfterSeconds: null,
            consecutiveFailures: 0,
            nowMs: NOW_MS,
            random: RANDOM_HALF,
        });
        expect(actual).toBeNull();
    });

    it('returns null for unknown', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.unknown,
            retryAfterSeconds: null,
            consecutiveFailures: 0,
            nowMs: NOW_MS,
            random: RANDOM_HALF,
        });
        expect(actual).toBeNull();
    });

    it('returns now + 15 minutes for key_permission', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.key_permission,
            retryAfterSeconds: null,
            consecutiveFailures: 0,
            nowMs: NOW_MS,
            random: RANDOM_HALF,
        });
        expect(actual).toEqual(new Date(NOW_MS + 900_000));
    });

    it('uses retryAfterSeconds for rate_limit when provided', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.rate_limit,
            retryAfterSeconds: 120,
            consecutiveFailures: 0,
            nowMs: NOW_MS,
            random: RANDOM_HALF,
        });
        expect(actual).toEqual(new Date(NOW_MS + 120_000));
    });

    it('defaults rate_limit cooldown to 60 seconds when retryAfterSeconds is null', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.rate_limit,
            retryAfterSeconds: null,
            consecutiveFailures: 0,
            nowMs: NOW_MS,
            random: RANDOM_HALF,
        });
        expect(actual).toEqual(new Date(NOW_MS + 60_000));
    });

    it('returns now + 1 hour for spend_limit', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.spend_limit,
            retryAfterSeconds: null,
            consecutiveFailures: 0,
            nowMs: NOW_MS,
            random: RANDOM_HALF,
        });
        expect(actual).toEqual(new Date(NOW_MS + 3_600_000));
    });

    it.each([
        { consecutiveFailures: 0, expectedMs: 500 },
        { consecutiveFailures: 1, expectedMs: 1_000 },
        { consecutiveFailures: 8, expectedMs: 128_000 },
        { consecutiveFailures: 9, expectedMs: 150_000 },
    ])(
        'computes transient cooldown with full jitter at consecutiveFailures=$consecutiveFailures',
        ({ consecutiveFailures, expectedMs }) => {
            const actual = computeCooldownUntil({
                failureClass: UPSTREAM_FAILURE_CLASS.transient,
                retryAfterSeconds: null,
                consecutiveFailures,
                nowMs: NOW_MS,
                random: RANDOM_HALF,
            });
            expect(actual).toEqual(new Date(NOW_MS + expectedMs));
        },
    );
});
