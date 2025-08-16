import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getRuntimeKey } from 'hono/adapter';

import { coreApp } from '@gemini-proxy/core';

// Create the main API app
const app = new Hono()
    .get('/', (c) =>
        c.json({
            message: 'Gemini Proxy API',
            version: '0.0.1',
            platform: getRuntimeKey(),
            status: 'running',
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
