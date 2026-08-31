import { Hono } from 'hono';
import { coreApp, type HonoApp } from '@gemini-proxy/core';

export const app = new Hono<HonoApp>().route('/api/gproxy', coreApp).route('/', coreApp);

export const fetch = (request: Request, env: Env, ctx: ExecutionContext) =>
    app.fetch(request, env as never, ctx as never);

export default app;
