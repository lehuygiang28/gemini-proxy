import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';
import { getRuntimeKey } from 'hono/adapter';

import type { HonoApp } from './types';

export const coreApp = new Hono<HonoApp>()
    .use(logger())
    .use(timing())
    .use(secureHeaders())
    .use(
        cors({
            origin: ['http://localhost:3000', 'https://your-domain.com'],
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
            credentials: true,
        }),
    )
    .get('/', (c) =>
        c.json({
            message: 'Gemini Proxy API',
            version: '0.0.1',
            platform: getRuntimeKey(),
            status: 'running',
            endpoints: {
                health: '/health',
                keys: '/api/keys',
                proxyKeys: '/api/proxy-keys',
                logs: '/api/logs',
                gemini: '/v1beta/*',
                openai: '/v1/*',
            },
        }),
    )
    .notFound((c) =>
        c.json(
            {
                error: 'Not Found',
                message: 'The requested endpoint does not exist',
                availableEndpoints: [
                    'GET /',
                    'GET /health',
                    'GET /api/keys',
                    'POST /api/keys',
                    'GET /api/proxy-keys',
                    'POST /api/proxy-keys',
                    'GET /api/logs',
                    'ALL /v1beta/*',
                    'ALL /v1/*',
                ],
            },
            404,
        ),
    )
    .use('/api/gproxy/*', async (c) => {
        const { apiKey } = c.req.header();
        const { byteLength } = await c.req.raw.clone().arrayBuffer();

        return c.json({
            message: 'Hello World',
            apiKey,
            byteLength,
        });
    });
