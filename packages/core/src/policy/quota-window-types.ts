export const PROXY_QUOTA_WINDOW_TYPES = ['minute', 'day', 'month'] as const;

export type ProxyQuotaWindowType = (typeof PROXY_QUOTA_WINDOW_TYPES)[number];

export function isProxyQuotaWindowType(value: string): value is ProxyQuotaWindowType {
    return (PROXY_QUOTA_WINDOW_TYPES as readonly string[]).includes(value);
}

export function isValidProxyQuotaWindowTypes(value: unknown): value is ProxyQuotaWindowType[] {
    if (!Array.isArray(value) || value.length === 0) {
        return false;
    }
    const seen = new Set<string>();
    for (const item of value) {
        if (typeof item !== 'string' || !isProxyQuotaWindowType(item) || seen.has(item)) {
            return false;
        }
        seen.add(item);
    }
    return true;
}

export function selectedQuotaWindowTypes(selected: {
    readonly minute: boolean;
    readonly day: boolean;
    readonly month: boolean;
}): ProxyQuotaWindowType[] {
    return PROXY_QUOTA_WINDOW_TYPES.filter((windowType) => selected[windowType]);
}
