import { isSupportedIanaTimeZone } from '@gemini-proxy/core';

export function normalizeTimezone(value: unknown): string {
    if (typeof value !== 'string' || !isSupportedIanaTimeZone(value)) {
        throw new Error('Invalid timezone');
    }
    return value;
}
