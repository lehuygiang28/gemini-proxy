import { describe, expect, it } from 'vitest';
import {
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
