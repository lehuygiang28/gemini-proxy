import type { ProxyApiFormat } from '../types';

export async function rewriteUpstreamModel(input: {
    readonly request: Request;
    readonly urlToProxy: string;
    readonly apiFormat: ProxyApiFormat;
    readonly fromModel: string;
    readonly toModel: string;
}): Promise<{ request: Request; urlToProxy: string }> {
    if (input.fromModel === input.toModel) {
        return { request: input.request, urlToProxy: input.urlToProxy };
    }
    if (input.apiFormat === 'gemini') {
        const urlToProxy = replaceModelInUrl(input.urlToProxy, input.fromModel, input.toModel);
        const requestUrl = replaceModelInUrl(input.request.url, input.fromModel, input.toModel);
        return {
            urlToProxy,
            request: cloneRequest(input.request, requestUrl, input.request.body),
        };
    }
    const rewrittenBody = await rewriteOpenAiBody(input.request, input.toModel);
    return {
        urlToProxy: input.urlToProxy,
        request: cloneRequest(input.request, input.request.url, rewrittenBody),
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
    const parsed: unknown = raw === '' ? {} : JSON.parse(raw);
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
