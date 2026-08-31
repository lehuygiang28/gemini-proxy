import { beforeAll, describe, expect, it } from 'vitest';

describe('vercel route handlers', () => {
    let GET: unknown;
    let POST: unknown;

    beforeAll(async () => {
        process.env.SUPABASE_URL = 'https://example.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        const routeModule = await import('./route');
        GET = routeModule.GET;
        POST = routeModule.POST;
    });

    it('exports GET and POST functions', () => {
        expect(typeof GET).toBe('function');
        expect(typeof POST).toBe('function');
    });
});
