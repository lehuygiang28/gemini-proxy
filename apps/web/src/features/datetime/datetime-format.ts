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

const RELATIVE_DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

export function formatRelativeTime(iso: string, locale: string, now: Date = new Date()): string {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime()) || Number.isNaN(now.getTime())) {
        return '';
    }

    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    let duration = (then.getTime() - now.getTime()) / 1000;
    for (const division of RELATIVE_DIVISIONS) {
        if (Math.abs(duration) < division.amount) {
            return formatter.format(Math.round(duration), division.unit);
        }
        duration /= division.amount;
    }
    return formatter.format(Math.round(duration), 'year');
}

export type QuotaTimezoneState = {
    status: 'loading' | 'ready';
    timeZone: string;
};

export function resolveQuotaTimezoneState(input: {
    identityReady: boolean;
    settingsQueryEnabled: boolean;
    settingsFetched: boolean;
    timezone?: string | null;
}): QuotaTimezoneState {
    if (!input.identityReady || (input.settingsQueryEnabled && !input.settingsFetched)) {
        return { status: 'loading', timeZone: 'UTC' };
    }
    const timezone = input.timezone?.trim();
    if (!timezone) {
        return { status: 'ready', timeZone: 'UTC' };
    }
    return { status: 'ready', timeZone: timezone };
}
