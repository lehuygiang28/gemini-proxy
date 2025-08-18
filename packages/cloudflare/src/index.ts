import { Hono } from 'hono';
import { coreApp, type HonoApp } from '@gemini-proxy/core';

const cloudflareWorkerApp = new Hono<HonoApp>().basePath('/api/gproxy').route('/*', coreApp);

export default cloudflareWorkerApp;
