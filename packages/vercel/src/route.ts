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

export const honoCoreApp = coreApp;
export const honoVercelApp = new Hono<HonoApp>().basePath('/api/gproxy').route('/*', honoCoreApp);

export const GET = handle(honoVercelApp);
export const POST = handle(honoVercelApp);
export const DELETE = handle(honoVercelApp);
export const PATCH = handle(honoVercelApp);
export const OPTIONS = handle(honoVercelApp);
export const HEAD = handle(honoVercelApp);
