import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
    return c.text('Hello Hono!');
});

// Get port from environment variables with fallbacks
const port =
    process.env.PORT ||
    process.env.API_PORT ||
    (process.env.NODE_ENV === 'production' ? 9091 : 9090);

serve(
    {
        fetch: app.fetch,
        port: Number(port),
    },
    (info) => {
        console.log(`🚀 API Server is running on http://localhost:${info.port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    },
);
