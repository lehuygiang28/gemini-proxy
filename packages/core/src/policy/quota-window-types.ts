export const PROXY_QUOTA_WINDOW_TYPES = ['minute', 'day', 'month'] as const;

export type ProxyQuotaWindowType = (typeof PROXY_QUOTA_WINDOW_TYPES)[number];

export function isProxyQuotaWindowType(value: string): value is ProxyQuotaWindowType {
    return (PROXY_QUOTA_WINDOW_TYPES as readonly string[]).includes(value);
}

export function selectedQuotaWindowTypes(selected: {
    readonly minute: boolean;
    readonly day: boolean;
    readonly month: boolean;
}): ProxyQuotaWindowType[] {
    return PROXY_QUOTA_WINDOW_TYPES.filter((windowType) => selected[windowType]);
}
