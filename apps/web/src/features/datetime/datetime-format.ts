import {
    DATETIME_FORMAT_MODES,
    type DatetimeFormatMode,
} from '@/constants/datetime-format.constant';

export function parseDatetimeFormatMode(value: string | undefined): DatetimeFormatMode {
    if (value && (DATETIME_FORMAT_MODES as readonly string[]).includes(value)) {
        return value as DatetimeFormatMode;
    }
    return 'auto';
}

function civilDayKey(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

export function isSameCivilDay(iso: string, timeZone: string, now: Date = new Date()): boolean {
    return civilDayKey(new Date(iso), timeZone) === civilDayKey(now, timeZone);
}

export function resolveDatetimePresentation(input: {
    iso: string;
    mode: DatetimeFormatMode;
    timeZone: string;
    now?: Date;
}): { kind: 'relative' | 'exact' } {
    if (input.mode === 'relative') {
        return { kind: 'relative' };
    }
    if (input.mode === 'exact') {
        return { kind: 'exact' };
    }
    try {
        const now = input.now ?? new Date();
        if (isSameCivilDay(input.iso, input.timeZone, now)) {
            return { kind: 'relative' };
        }
        return { kind: 'exact' };
    } catch {
        return { kind: 'exact' };
    }
}
