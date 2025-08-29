import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { coreApp } from '@gemini-proxy/core';
import { AppwriteContext } from './types';
import { getRequest, getResponse } from './utils';

// Create the main Hono app
const app = new Hono();

// Health check endpoint
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the core proxy functionality under /api/gproxy
app.route('/api/gproxy/*', coreApp);

// Development server
if (process.env.NODE_ENV === 'development') {
    const port = parseInt(process.env.PORT || '3000', 10);
    console.log(`🚀 Development server is running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`🔗 Proxy endpoint: http://localhost:${port}/api/gproxy/*`);

    serve({
        fetch: app.fetch,
        port,
    });
}

// Appwrite function entry point
export default async function (context: AppwriteContext) {
    try {
        // Convert Appwrite context to Hono request
        const request = getRequest(context);

        // Process the request through the Hono app
        const response = await app.fetch(request);

        // Convert Hono response back to Appwrite response
        return await getResponse(context, response);
    } catch (error) {
        // Log the error
        context.error(
            `Appwrite function error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // Return error response
        return context.res.json(
            {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred',
                timestamp: new Date().toISOString(),
            },
            500,
        );
    }
}
