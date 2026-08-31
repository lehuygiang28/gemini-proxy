export function isSupportedIanaTimeZone(value: string): boolean {
    if (value === 'UTC' || value === 'Etc/UTC') {
        return true;
    }
    if (value.length === 0) {
        return false;
    }
    if (typeof Intl.supportedValuesOf === 'function') {
        return Intl.supportedValuesOf('timeZone').includes(value);
    }
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
        return value.includes('/');
    } catch {
        return false;
    }
}
