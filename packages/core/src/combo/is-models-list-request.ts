import type { ProxyApiFormat } from '../types';

export function isModelsListRequest(input: {
    readonly method: string;
    readonly apiFormat: ProxyApiFormat;
    readonly urlToProxy: string;
}): boolean {
    if (input.method.toUpperCase() !== 'GET') {
        return false;
    }
    let pathname: string;
    try {
        pathname = new URL(input.urlToProxy).pathname.replace(/\/+$/, '');
    } catch {
        return false;
    }
    if (pathname.includes(':')) {
        return false;
    }
    if (input.apiFormat === 'openai') {
        return pathname === '/models' || pathname.endsWith('/models');
    }
    return (
        pathname === '/models' ||
        pathname.endsWith('/v1beta/models') ||
        pathname.endsWith('/v1/models') ||
        pathname.endsWith('/models')
    );
}
