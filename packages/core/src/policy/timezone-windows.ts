import { isSupportedIanaTimeZone } from './iana-timezone';

type ZonedParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

function assertTimeZone(timeZone: string): void {
    if (!isSupportedIanaTimeZone(timeZone)) {
        throw new Error(`Invalid timezone: ${timeZone}`);
    }
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes): number => {
        const value = parts.find((part) => part.type === type)?.value;
        return Number(value);
    };
    return {
        year: read('year'),
        month: read('month'),
        day: read('day'),
        hour: read('hour'),
        minute: read('minute'),
        second: read('second'),
    };
}

/** Milliseconds to add to UTC to obtain the wall clock in `timeZone`. */
function offsetMs(date: Date, timeZone: string): number {
    const parts = zonedParts(date, timeZone);
    const asUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );
    return asUtc - date.getTime();
}

function zonedCivilStartUtc(now: Date, timeZone: string, unit: 'day' | 'month'): Date {
    assertTimeZone(timeZone);
    const parts = zonedParts(now, timeZone);
    const wallAsUtcMs =
        unit === 'month'
            ? Date.UTC(parts.year, parts.month - 1, 1, 0, 0, 0)
            : Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);
    const firstGuess = new Date(wallAsUtcMs - offsetMs(now, timeZone));
    return new Date(wallAsUtcMs - offsetMs(firstGuess, timeZone));
}

export function civilDayStartUtc(now: Date, timeZone: string): Date {
    return zonedCivilStartUtc(now, timeZone, 'day');
}

export function civilMonthStartUtc(now: Date, timeZone: string): Date {
    return zonedCivilStartUtc(now, timeZone, 'month');
}
