import { describe, expect, it } from 'vitest';
import {
    formatRelativeTime,
    isSameCivilDay,
    parseDatetimeFormatMode,
    resolveDatetimePresentation,
} from './datetime-format';

describe('parseDatetimeFormatMode', () => {
    it('accepts relative, exact, and auto', () => {
        expect(parseDatetimeFormatMode('relative')).toBe('relative');
        expect(parseDatetimeFormatMode('exact')).toBe('exact');
        expect(parseDatetimeFormatMode('auto')).toBe('auto');
    });

    it('defaults unknown or empty values to auto', () => {
        expect(parseDatetimeFormatMode(undefined)).toBe('auto');
        expect(parseDatetimeFormatMode('bogus')).toBe('auto');
        expect(parseDatetimeFormatMode('')).toBe('auto');
    });
});

describe('isSameCivilDay', () => {
    const now = new Date('2026-09-02T03:00:00.000Z');

    it('uses the quota timezone civil day, not UTC', () => {
        expect(isSameCivilDay('2026-09-01T17:00:00.000Z', 'Asia/Ho_Chi_Minh', now)).toBe(true);
        expect(isSameCivilDay('2026-09-01T16:59:00.000Z', 'Asia/Ho_Chi_Minh', now)).toBe(false);
    });
});

describe('resolveDatetimePresentation', () => {
    const now = new Date('2026-09-02T03:00:00.000Z');
    const sameDay = '2026-09-01T17:00:00.000Z';
    const otherDay = '2026-09-01T16:59:00.000Z';

    it('always uses relative or exact when those modes are set', () => {
        expect(
            resolveDatetimePresentation({
                iso: otherDay,
                mode: 'relative',
                timeZone: 'Asia/Ho_Chi_Minh',
                now,
            }),
        ).toEqual({ kind: 'relative' });
        expect(
            resolveDatetimePresentation({
                iso: sameDay,
                mode: 'exact',
                timeZone: 'Asia/Ho_Chi_Minh',
                now,
            }),
        ).toEqual({ kind: 'exact' });
    });

    it('uses relative for auto on the same civil day and exact otherwise', () => {
        expect(
            resolveDatetimePresentation({
                iso: sameDay,
                mode: 'auto',
                timeZone: 'Asia/Ho_Chi_Minh',
                now,
            }),
        ).toEqual({ kind: 'relative' });
        expect(
            resolveDatetimePresentation({
                iso: otherDay,
                mode: 'auto',
                timeZone: 'Asia/Ho_Chi_Minh',
                now,
            }),
        ).toEqual({ kind: 'exact' });
    });

    it('falls back to exact when the timezone is invalid', () => {
        expect(
            resolveDatetimePresentation({
                iso: sameDay,
                mode: 'auto',
                timeZone: 'Not/A_Zone',
                now,
            }),
        ).toEqual({ kind: 'exact' });
    });
});

describe('formatRelativeTime', () => {
    const now = new Date('2026-09-02T12:00:00.000Z');

    it('formats seconds and hours in the active locale', () => {
        expect(formatRelativeTime('2026-09-02T11:59:30.000Z', 'en', now)).toBe('30 seconds ago');
        expect(formatRelativeTime('2026-09-02T09:00:00.000Z', 'en', now)).toBe('3 hours ago');
        expect(formatRelativeTime('2026-09-02T11:59:30.000Z', 'vi', now)).toBe('30 giây trước');
    });

    it('formats future timestamps and returns empty for invalid dates', () => {
        expect(formatRelativeTime('2026-09-03T12:00:00.000Z', 'en', now)).toBe('tomorrow');
        expect(formatRelativeTime('not-a-date', 'en', now)).toBe('');
    });
});
