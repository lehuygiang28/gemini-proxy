import { Context, Next } from 'hono';
import { env } from 'hono/adapter';

import type { ProxyRequestDataParsed } from '../types';
import { parseBody } from '../utils/body-detector';
import { resolveUrl } from '../utils/url';

export const extractProxyDataMiddleware = async (c: Context, next: Next) => {
    let model: string | undefined;
    const apiFormat = c.req.path.includes('/gemini/') ? 'gemini' : 'openai-compatible';
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

    const bodyData = await parseBody(c);
    const envVariables = env(c);

    if (apiFormat === 'gemini') {
        model = c.req.path?.split('/')?.pop()?.split(':')?.[0];
        if (!model) {
            model = bodyData.data?.model;
        }

        stream =
            c.req.path.includes(':streamGenerateContent') ||
            c.req.path.includes(':stream') ||
            c.req.path.includes('?alt=sse');

        urlToProxy = `${resolveUrl(
            envVariables?.GOOGLE_GEMINI_API_BASE_URL,
            allPathParts.slice(proxyIndex + 1).join('/'),
        )}${queryParams ? `?${new URLSearchParams(queryParams).toString()}` : ''}`;
    } else {
        model = bodyData.data?.model;
        stream = bodyData.data?.stream;

        urlToProxy = `${resolveUrl(
            envVariables?.GOOGLE_OPENAI_API_BASE_URL,
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
