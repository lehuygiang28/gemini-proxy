import type { ProxyApiFormat } from '../types';
import { normalizeGeminiModelId } from '../constants/gemini-pricing';

export async function rewriteUpstreamModel(input: {
    readonly request: Request;
    readonly urlToProxy: string;
    readonly apiFormat: ProxyApiFormat;
    readonly fromModel: string;
    readonly toModel: string;
}): Promise<{ request: Request; urlToProxy: string }> {
    const source = input.request.clone();
    const fromModel = normalizeGeminiModelId(input.fromModel);
    const toModel = normalizeGeminiModelId(input.toModel);
    if (fromModel === toModel) {
        return { request: source, urlToProxy: input.urlToProxy };
    }
    if (input.apiFormat === 'gemini') {
        const urlToProxy = replaceModelInUrl(input.urlToProxy, fromModel, toModel);
        const requestUrl = replaceModelInUrl(source.url, fromModel, toModel);
        return {
            urlToProxy,
            request: cloneRequest(source, requestUrl, source.body),
        };
    }
    const rewrittenBody = await rewriteOpenAiBody(source, toModel);
    return {
        urlToProxy: input.urlToProxy,
        request: cloneRequest(source, source.url, rewrittenBody),
    };
}

function replaceModelInUrl(url: string, fromModel: string, toModel: string): string {
    const parsed = new URL(url);
    const escapedFrom = fromModel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    parsed.pathname = parsed.pathname.replace(
        new RegExp(`/models/${escapedFrom}(?=:|/|$)`, 'i'),
        `/models/${toModel}`,
    );
    return parsed.toString();
}

async function rewriteOpenAiBody(request: Request, toModel: string): Promise<string> {
    const raw = await request.clone().text();
    if (raw === '') {
        return JSON.stringify({ model: toModel });
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return raw;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return raw;
    }
    return JSON.stringify({ ...parsed, model: toModel });
}

function cloneRequest(request: Request, url: string, body: BodyInit | null): Request {
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    return new Request(url, {
        method: request.method,
        headers,
        body,
        signal: request.signal,
        duplex: body ? 'half' : undefined,
    } as RequestInit);
}
