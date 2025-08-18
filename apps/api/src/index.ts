import { Hono } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { coreApp } from '@gemini-proxy/core';

// Create the main API app
const app = new Hono()
    .use(
        cors({
            origin: ['http://localhost:3000', 'https://your-domain.com'],
            allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
            credentials: true,
        }),
    )
    .route('/api/gproxy/*', coreApp);

// Start server
const port = process.env.API_PORT || 9090;
console.log(`🚀 Gemini Proxy API Server starting on port ${port}`);
console.log(`🌍 Platform: ${getRuntimeKey()}`);

serve({
    fetch: app.fetch,
    port: parseInt(port.toString()),
});

export default app;
