import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { coreApp } from '@gemini-proxy/core';

export function createApiApp(): Hono {
    return new Hono()
        .use(
            cors({
                origin: ['http://localhost:3000', 'https://your-domain.com'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: ['Content-Type', 'Authorization', 'X-Goog-Api-Key'],
                credentials: true,
            }),
        )
        .route('/api/gproxy', coreApp)
        .route('/', coreApp);
}
