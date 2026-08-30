import { describe, expect, it } from 'vitest';
import { generateProxyApiKeyValue } from './generate-proxy-api-key';

describe('generateProxyApiKeyValue', () => {
    it('generates a unique proxy key that meets length and charset rules', () => {
        const first = generateProxyApiKeyValue();
        const second = generateProxyApiKeyValue();

        expect(first).not.toBe(second);
        expect(first.length).toBeGreaterThanOrEqual(10);
        expect(first.length).toBeLessThanOrEqual(128);
        expect(first).toMatch(/^[A-Za-z0-9._-]+$/);
        expect(second).toMatch(/^[A-Za-z0-9._-]+$/);
    });
});
