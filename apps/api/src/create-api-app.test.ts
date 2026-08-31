import { describe, expect, it } from 'vitest';
import { createApiApp } from './create-api-app';

describe('createApiApp', () => {
    it('returns a Hono app mounted at /api/gproxy and /', () => {
        const actual = createApiApp();
        expect(actual).toBeDefined();
        expect(typeof actual.fetch).toBe('function');
        expect(actual.routes.some((route) => route.path.includes('/api/gproxy'))).toBe(true);
        expect(actual.routes.some((route) => route.path === '/*' || route.path === '/')).toBe(true);
    });
});
