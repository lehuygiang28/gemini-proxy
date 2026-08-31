import { Context, Next } from 'hono';
import { env } from 'hono/adapter';

import type { ProxyRequestDataParsed } from '../types';
import { safelyExtractBodyText } from '../utils/body-handler';
import { buildOriginUrl } from '../routing/build-origin-url';
import { detectApiFormat } from '../routing/detect-api-format';
import { isManagedOperation } from '../routing/is-managed-operation';
import { normalizeV1Path } from '../routing/normalize-v1-path';
import { stripAdapterPrefix } from '../routing/strip-adapter-prefix';

function isKnownProxyPath(path: string): boolean {
    return (
        path === '/v1' ||
        path.startsWith('/v1/') ||
        path === '/v1beta' ||
        path.startsWith('/v1beta/') ||
        path === '/gemini' ||
        path.startsWith('/gemini/') ||
        path === '/openai' ||
        path.startsWith('/openai/')
    );
}

export const extractProxyDataMiddleware = async (c: Context, next: Next) => {
    const requestPath = stripAdapterPrefix(c.req.path);
    const detected = detectApiFormat({
        path: requestPath,
        header: (name) => c.req.header(name),
    });
    if ('error' in detected) {
        if (detected.error === 'conflicting_credentials') {
            return c.json({ error: 'conflicting_credentials' }, 400);
        }
        return c.json(
            {
                error: 'authentication_error',
                message: 'API key is required',
            },
            401,
        );
    }
    if (!isKnownProxyPath(requestPath)) {
        return c.json(
            {
                error: 'Invalid Request Path',
                message:
                    'Seem your request path is not correct, please check it and try again. Use /v1/{actual-path}.',
            },
            400,
        );
    }

    const apiFormat = detected.apiFormat;
    const envVariables = {
        ...env(c),
        ...(c.env as Record<string, string> | undefined),
    };
    const rawSearch = new URL(c.req.url).search;
    let model: string | undefined;
    let stream = false;
    let rawBodyText: string | null = null;
    const normalizedPath = normalizeV1Path(requestPath);

    if (apiFormat === 'gemini') {
        const pathParts = normalizedPath.split('/');
        const lastPart = pathParts.pop();
        model = lastPart?.split(':')?.[0];
        console.log(`Model extraction: path=${requestPath}, lastPart=${lastPart}, model=${model}`);
        stream =
            normalizedPath.includes(':streamGenerateContent') ||
            normalizedPath.includes(':stream') ||
            rawSearch.includes('alt=sse');

        if (!model && c.req.header('content-type')?.includes('application/json')) {
            try {
                rawBodyText = await safelyExtractBodyText(c);
                if (rawBodyText) {
                    const parsedBody = JSON.parse(rawBodyText);
                    model = parsedBody?.model;
                }
            } catch (error) {
                console.warn('Failed to parse JSON body for model extraction:', error);
            }
        }
    } else if (c.req.header('content-type')?.includes('application/json')) {
        try {
            rawBodyText = await safelyExtractBodyText(c);
            if (rawBodyText) {
                const parsedBody = JSON.parse(rawBodyText);
                model = parsedBody?.model;
                stream = Boolean(parsedBody?.stream);
            }
        } catch (error) {
            console.warn('Failed to parse JSON body for OpenAI format:', error);
        }
    }

    const urlToProxy = buildOriginUrl({
        apiFormat,
        path: requestPath,
        rawSearch,
        geminiBaseUrl:
            envVariables?.GOOGLE_GEMINI_API_BASE_URL ??
            'https://generativelanguage.googleapis.com/',
        openaiBaseUrl:
            envVariables?.GOOGLE_OPENAI_API_BASE_URL ??
            'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    c.set('proxyRequestDataParsed', {
        model,
        apiFormat,
        stream,
        urlToProxy,
        managed: isManagedOperation({ apiFormat, path: normalizedPath }),
    } satisfies ProxyRequestDataParsed);

    await next();
};
