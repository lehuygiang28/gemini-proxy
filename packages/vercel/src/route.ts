import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { coreApp, type HonoApp } from '@gemini-proxy/core';

/**
 * Set supabase url from NEXT_PUBLIC_SUPABASE_URL if not set
 * If using FE, can set NEXT_PUBLIC_SUPABASE_URL to using it for both client and server side
 * We re-set it to use in server side, make sure compatible with core app
 * All others env will remain same
 */
if (!process.env.SUPABASE_URL) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set');
    }
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}

const vercelApp = new Hono<HonoApp>().basePath('/api/gproxy').route('/*', coreApp);

export const GET = handle(vercelApp);
export const POST = handle(vercelApp);
export const DELETE = handle(vercelApp);
export const PATCH = handle(vercelApp);
export const OPTIONS = handle(vercelApp);
export const HEAD = handle(vercelApp);
