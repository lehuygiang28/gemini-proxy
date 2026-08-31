import { describe, expect, it } from 'vitest';
import { UPSTREAM_FAILURE_CLASS } from './types';
import { computeCooldownUntil } from './compute-cooldown';

const NOW_MS = 1_700_000_000_000;

describe('computeCooldownUntil', () => {
    it('returns null for client_invalid', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.client_invalid,
            retryAfterSeconds: null,
            nowMs: NOW_MS,
            keyWide: false,
        });
        expect(actual).toBeNull();
    });

    it('returns null for key_invalid', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.key_invalid,
            retryAfterSeconds: null,
            nowMs: NOW_MS,
            keyWide: false,
        });
        expect(actual).toBeNull();
    });

    it('returns null for unknown', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.unknown,
            retryAfterSeconds: null,
            nowMs: NOW_MS,
            keyWide: false,
        });
        expect(actual).toBeNull();
    });

    it('returns null for transient instead of a hard lock', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.transient,
            retryAfterSeconds: 30,
            nowMs: NOW_MS,
            keyWide: false,
        });
        expect(actual).toBeNull();
    });

    it('returns key_model scope and 15 minutes for key_permission by default', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.key_permission,
            retryAfterSeconds: null,
            nowMs: NOW_MS,
            keyWide: false,
        });
        expect(actual).toEqual({
            until: new Date(NOW_MS + 900_000),
            scope: 'key_model',
        });
    });

    it('returns key scope for key_permission when structured details are key-wide', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.key_permission,
            retryAfterSeconds: null,
            nowMs: NOW_MS,
            keyWide: true,
        });
        expect(actual).toEqual({
            until: new Date(NOW_MS + 900_000),
            scope: 'key',
        });
    });

    it('uses retryAfterSeconds for rate_limit when provided', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.rate_limit,
            retryAfterSeconds: 120,
            nowMs: NOW_MS,
            keyWide: false,
        });
        expect(actual).toEqual({
            until: new Date(NOW_MS + 120_000),
            scope: 'key_model',
        });
    });

    it('defaults rate_limit cooldown to 60 seconds when retryAfterSeconds is null', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.rate_limit,
            retryAfterSeconds: null,
            nowMs: NOW_MS,
            keyWide: false,
        });
        expect(actual).toEqual({
            until: new Date(NOW_MS + 60_000),
            scope: 'key_model',
        });
    });

    it('returns key scope for rate_limit when structured details are project-wide', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.rate_limit,
            retryAfterSeconds: 60,
            nowMs: NOW_MS,
            keyWide: true,
        });
        expect(actual).toEqual({
            until: new Date(NOW_MS + 60_000),
            scope: 'key',
        });
    });

    it('returns key scope and 1 hour for spend_limit', () => {
        const actual = computeCooldownUntil({
            failureClass: UPSTREAM_FAILURE_CLASS.spend_limit,
            retryAfterSeconds: null,
            nowMs: NOW_MS,
            keyWide: true,
        });
        expect(actual).toEqual({
            until: new Date(NOW_MS + 3_600_000),
            scope: 'key',
        });
    });
});
