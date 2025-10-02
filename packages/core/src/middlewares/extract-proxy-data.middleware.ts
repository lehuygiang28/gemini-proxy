import { Context, Next } from 'hono';
import { env } from 'hono/adapter';

import type { ProxyRequestDataParsed } from '../types';
import { resolveUrl } from '../utils/url';
import { safelyExtractBodyText } from '../utils/body-handler';

export const extractProxyDataMiddleware = async (c: Context, next: Next) => {
    const apiFormat = c.req.path.includes('/gemini/') ? 'gemini' : 'openai';

    let model: string | undefined;
    let stream = false;
    const queryParams = c.req.query();
    let urlToProxy = '';

    const allPathParts = c.req.path.split('/');
    const proxyIndex = allPathParts.findIndex(
        (part) => part === (apiFormat === 'gemini' ? 'gemini' : 'openai'),
    );
    if (proxyIndex === -1) {
        return c.json(
            {
                error: 'Invalid Request Path',
                message:
                    'Seem your request path is not correct, please check it and try again. It should be like /api/gproxy/{format}/{actual-path}',
            },
            400,
        );
    }

    const envVariables = env(c);
    let rawBodyText: string | null = null;

    // For Gemini, we can often determine model and stream from the URL path
    if (apiFormat === 'gemini') {
        model = c.req.path?.split('/')?.pop()?.split(':')?.[0];
        stream =
            c.req.path.includes(':streamGenerateContent') ||
            c.req.path.includes(':stream') ||
            c.req.path.includes('?alt=sse');

        // Only parse body if we couldn't determine model from URL and it's JSON
        if (!model && c.req.header('content-type')?.includes('application/json')) {
            try {
                // Try to extract body text for metadata parsing (won't consume original)
                rawBodyText = await safelyExtractBodyText(c);
                if (rawBodyText) {
                    const parsedBody = JSON.parse(rawBodyText);
                    model = parsedBody?.model;
                }
            } catch (error) {
                console.warn('Failed to parse JSON body for model extraction:', error);
            }
        }

        urlToProxy = `${resolveUrl(
            envVariables?.GOOGLE_GEMINI_API_BASE_URL ??
                'https://generativelanguage.googleapis.com/',
            allPathParts.slice(proxyIndex + 1).join('/'),
        )}${queryParams ? `?${new URLSearchParams(queryParams).toString()}` : ''}`;
    } else {
        // For OpenAI-compatible APIs, we need to parse the body to get model and stream
        if (c.req.header('content-type')?.includes('application/json')) {
            try {
                // Try to extract body text for metadata parsing (won't consume original)
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

        urlToProxy = `${resolveUrl(
            envVariables?.GOOGLE_OPENAI_API_BASE_URL ??
                'https://generativelanguage.googleapis.com/v1beta/openai/',
            allPathParts.slice(proxyIndex + 1).join('/'),
        )}${queryParams ? `?${new URLSearchParams(queryParams).toString()}` : ''}`;
    }

    c.set('proxyRequestDataParsed', {
        model,
        apiFormat,
        stream,
        urlToProxy,
    } satisfies ProxyRequestDataParsed);

    await next();
};
