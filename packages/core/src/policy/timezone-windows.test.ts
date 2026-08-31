import { describe, expect, it } from 'vitest';
import { civilDayStartUtc, civilMonthStartUtc } from './timezone-windows';

describe('civilDayStartUtc', () => {
    it('uses 17:00 UTC the previous calendar day for Asia/Bangkok during ICT', () => {
        const now = new Date('2026-08-31T10:00:00.000Z');
        expect(civilDayStartUtc(now, 'Asia/Bangkok').toISOString()).toBe(
            '2026-08-30T17:00:00.000Z',
        );
    });

    it('uses midnight UTC for UTC', () => {
        const now = new Date('2026-08-31T10:00:00.000Z');
        expect(civilDayStartUtc(now, 'UTC').toISOString()).toBe('2026-08-31T00:00:00.000Z');
    });

    it('does not reset the active day when the clock is still in that civil day', () => {
        const justBeforeNextBangkokDay = new Date('2026-08-31T16:59:59.000Z');
        expect(civilDayStartUtc(justBeforeNextBangkokDay, 'Asia/Bangkok').toISOString()).toBe(
            '2026-08-30T17:00:00.000Z',
        );
        const atNextBangkokDay = new Date('2026-08-31T17:00:00.000Z');
        expect(civilDayStartUtc(atNextBangkokDay, 'Asia/Bangkok').toISOString()).toBe(
            '2026-08-31T17:00:00.000Z',
        );
    });

    it('rejects an invalid timezone', () => {
        expect(() => civilDayStartUtc(new Date('2026-08-31T10:00:00.000Z'), 'Not/A_Zone')).toThrow(
            /invalid timezone/i,
        );
    });
});

describe('civilMonthStartUtc', () => {
    it('uses the civil month start in Asia/Bangkok converted to UTC', () => {
        const now = new Date('2026-08-31T10:00:00.000Z');
        expect(civilMonthStartUtc(now, 'Asia/Bangkok').toISOString()).toBe(
            '2026-07-31T17:00:00.000Z',
        );
    });

    it('rejects an invalid timezone', () => {
        expect(() =>
            civilMonthStartUtc(new Date('2026-08-31T10:00:00.000Z'), 'Not/A_Zone'),
        ).toThrow(/invalid timezone/i);
    });
});
