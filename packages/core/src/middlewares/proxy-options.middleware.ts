import { Context, Next } from 'hono';
import type { LoadBalanceStrategy, ProxyRequestOptions } from '../types';

const parseBoolean = (value: string | null | undefined): boolean | undefined => {
    if (value == null) return undefined;
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'y') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'n') return false;
    return undefined;
};

const parseNumber = (value: string | null | undefined): number | undefined => {
    if (value == null) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
};

const parseLoadBalanceStrategy = (
    value: string | null | undefined,
): LoadBalanceStrategy | undefined => {
    if (!value) return undefined;
    const v = value.trim().toLowerCase();
    if (v === 'sticky_until_error') return 'sticky_until_error';
    if (v === 'round_robin') return 'round_robin';
    return undefined;
};

export const proxyOptionsMiddleware = async (c: Context, next: Next) => {
    const h = c.req.header.bind(c.req);

    const maxRetries = parseNumber(h('x-gproxy-retry-max'));
    const retryOnZeroCompletionTokens = parseBoolean(h('x-gproxy-retry-on-zero-completion-tokens'));

    const prioritizeNewer = parseBoolean(h('x-gproxy-prioritize-newer'));
    const prioritizeLeastErrors = parseBoolean(h('x-gproxy-prioritize-least-errors'));
    const prioritizeLeastRecentlyUsed = parseBoolean(h('x-gproxy-prioritize-least-recently-used'));

    const loadbalanceStrategy = parseLoadBalanceStrategy(h('x-gproxy-loadbalance'));

    const options: ProxyRequestOptions = {};

    if (maxRetries !== undefined || retryOnZeroCompletionTokens !== undefined) {
        options.retry = {
            ...(maxRetries !== undefined ? { maxRetries } : {}),
            ...(retryOnZeroCompletionTokens !== undefined
                ? { onZeroCompletionTokens: retryOnZeroCompletionTokens }
                : {}),
        };
    }

    if (
        prioritizeNewer !== undefined ||
        prioritizeLeastErrors !== undefined ||
        prioritizeLeastRecentlyUsed !== undefined
    ) {
        options.apiKeySelection = {
            ...(prioritizeNewer !== undefined ? { prioritizeNewer } : {}),
            ...(prioritizeLeastErrors !== undefined ? { prioritizeLeastErrors } : {}),
            ...(prioritizeLeastRecentlyUsed !== undefined ? { prioritizeLeastRecentlyUsed } : {}),
        };
    }

    if (loadbalanceStrategy) {
        options.loadbalance = { strategy: loadbalanceStrategy };
    }

    if (options.retry || options.apiKeySelection || options.loadbalance) {
        c.set('proxyRequestOptions', options);
    }

    await next();
};
