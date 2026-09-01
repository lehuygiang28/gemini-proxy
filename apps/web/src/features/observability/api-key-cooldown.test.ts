import { describe, expect, it } from 'vitest';
import { isCooldownActive, resolveKeyBadgeState } from './api-key-cooldown';

describe('isCooldownActive', () => {
    const nowMs = Date.parse('2026-08-31T12:00:00.000Z');

    it('returns false when cooldown_until is null or undefined', () => {
        expect(isCooldownActive(null, nowMs)).toBe(false);
        expect(isCooldownActive(undefined, nowMs)).toBe(false);
    });

    it('returns true when cooldown_until is in the future', () => {
        expect(isCooldownActive('2026-08-31T12:00:01.000Z', nowMs)).toBe(true);
    });

    it('returns false when cooldown_until is in the past or now', () => {
        expect(isCooldownActive('2026-08-31T11:59:59.000Z', nowMs)).toBe(false);
        expect(isCooldownActive('2026-08-31T12:00:00.000Z', nowMs)).toBe(false);
    });
});

describe('resolveKeyBadgeState', () => {
    const nowMs = Date.parse('2026-08-31T12:00:00.000Z');

    it('returns cooldown when cooldown_until is in the future', () => {
        expect(
            resolveKeyBadgeState({
                isActive: true,
                successRate: 100,
                failureCount: 0,
                cooldownUntil: '2026-08-31T13:00:00.000Z',
                nowMs,
            }),
        ).toBe('cooldown');
    });

    it('returns disabled when inactive and not in cooldown', () => {
        expect(
            resolveKeyBadgeState({
                isActive: false,
                successRate: 50,
                failureCount: 5,
                cooldownUntil: null,
                nowMs,
            }),
        ).toBe('disabled');
    });

    it('returns degraded when active with low success rate and failures', () => {
        expect(
            resolveKeyBadgeState({
                isActive: true,
                successRate: 80,
                failureCount: 2,
                cooldownUntil: null,
                nowMs,
            }),
        ).toBe('degraded');
    });

    it('returns active when healthy and not in cooldown', () => {
        expect(
            resolveKeyBadgeState({
                isActive: true,
                successRate: 99,
                failureCount: 1,
                cooldownUntil: null,
                nowMs,
            }),
        ).toBe('active');
    });
});
