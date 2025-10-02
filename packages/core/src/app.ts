import { Hono } from 'hono';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';

import type { HonoApp } from './types';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { validateProxyApiKeyMiddleware } from './middlewares/proxy-api-key.middleware';
import { httpLoggerMiddleware } from './middlewares/http-logger.middleware';
import { extractProxyDataMiddleware } from './middlewares/extract-proxy-data.middleware';
import { proxyOptionsMiddleware } from './middlewares/proxy-options.middleware';
import { ProxyService } from './services/proxy.service';
import { BackgroundService } from './services/background.service';
import { executeWithWaitUntil } from './utils/wait-until';

export const coreApp = new Hono<HonoApp>()
    .use(timing())
    .use(secureHeaders())
    .use(requestIdMiddleware)
    // Must to use after requestIdMiddleware to make sure the requestId is set
    .use(httpLoggerMiddleware)
    .notFound((c) =>
        c.json(
            {
                error: 'Not Found',
                message: 'The requested endpoint does not exist',
            },
            404,
        ),
    )
    .use('/*', validateProxyApiKeyMiddleware)
    .use('/*', proxyOptionsMiddleware)
    .use('/*', extractProxyDataMiddleware)
    // Main handler route for all requests
    .use('/*', async (c) => {
        // Get response immediately - background operations are collected
        const response = await ProxyService.makeApiRequest({ c });

        // Execute all collected background operations with wait-until
        // This ensures operations complete before serverless function shutdown
        const requestId = c.get('proxyRequestId');
        executeWithWaitUntil(c, BackgroundService.executeAllOperations(c, requestId));

        return response;
    });
