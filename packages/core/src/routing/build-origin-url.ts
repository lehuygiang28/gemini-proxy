import { resolveUrl } from '../utils/url';
import { normalizeV1Path } from './normalize-v1-path';
import type { ProxyApiFormat } from '../types';

export function buildOriginUrl(input: {
    readonly apiFormat: ProxyApiFormat;
    readonly path: string;
    readonly rawSearch: string;
    readonly geminiBaseUrl: string;
    readonly openaiBaseUrl: string;
}): string {
    const querySuffix = forwardQuerySuffix(input.rawSearch);
    if (input.apiFormat === 'openai') {
        return `${resolveUrl(input.openaiBaseUrl, openaiRemainder(input.path))}${querySuffix}`;
    }
    return `${resolveUrl(input.geminiBaseUrl, geminiRemainder(input.path))}${querySuffix}`;
}

function geminiRemainder(path: string): string {
    const normalized = normalizeV1Path(path);
    const withoutGateway = stripGatewayPrefix(normalized);
    if (withoutGateway.startsWith('v1beta/') || withoutGateway.startsWith('v1/')) {
        return withoutGateway;
    }
    if (withoutGateway === 'models' || withoutGateway.startsWith('models/')) {
        return `v1beta/${withoutGateway}`;
    }
    return withoutGateway;
}

function openaiRemainder(path: string): string {
    const normalized = normalizeV1Path(path);
    if (normalized.startsWith('/openai/')) {
        return normalized.slice('/openai/'.length);
    }
    if (normalized.startsWith('/v1/')) {
        return normalized.slice('/v1/'.length);
    }
    return stripGatewayPrefix(normalized);
}

function stripGatewayPrefix(path: string): string {
    if (path.startsWith('/v1/')) {
        return path.slice('/v1/'.length);
    }
    if (path.startsWith('/v1beta/')) {
        return path.slice(1);
    }
    if (path.startsWith('/gemini/')) {
        return path.slice('/gemini/'.length);
    }
    return path.replace(/^\//, '');
}

function forwardQuerySuffix(rawSearch: string): string {
    const search = rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch;
    if (!search) {
        return '';
    }
    const params = new URLSearchParams(search);
    params.delete('key');
    params.delete('api_key');
    const forwarded = params.toString();
    return forwarded ? `?${forwarded}` : '';
}
