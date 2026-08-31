import { getRuntimeKey } from 'hono/adapter';
import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';

import { createApiApp } from './create-api-app';

export { createApiApp };

const app = createApiApp();

function isDirectRun(): boolean {
    if (process.env.API_LISTEN === '0') {
        return false;
    }
    const entry = process.argv[1];
    if (!entry) {
        return false;
    }
    const self = fileURLToPath(import.meta.url);
    return (
        self === entry ||
        entry.endsWith('apps/api/src/index.ts') ||
        entry.endsWith('apps/api/dist/index.js')
    );
}

if (isDirectRun()) {
    const port = process.env.API_PORT || 9090;
    console.log(`🚀 Gemini Proxy API Server starting on port ${port}`);
    console.log(`🌍 Platform: ${getRuntimeKey()}`);
    serve({
        fetch: app.fetch,
        port: parseInt(port.toString(), 10),
    });
}

export default app;
