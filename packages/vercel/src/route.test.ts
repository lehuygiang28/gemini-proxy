import { beforeAll, describe, expect, it } from 'vitest';

describe('vercel route handlers', () => {
    let GET: unknown;
    let POST: unknown;
    let PUT: unknown;
    let v1PUT: unknown;

    beforeAll(async () => {
        process.env.SUPABASE_URL = 'https://example.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        const routeModule = await import('./route');
        GET = routeModule.GET;
        POST = routeModule.POST;
        PUT = routeModule.PUT;
        v1PUT = routeModule.v1PUT;
    });

    it('exports GET and POST functions', () => {
        expect(typeof GET).toBe('function');
        expect(typeof POST).toBe('function');
    });

    it('exports PUT and v1PUT for canonical passthrough', () => {
        expect(typeof PUT).toBe('function');
        expect(typeof v1PUT).toBe('function');
    });
});
