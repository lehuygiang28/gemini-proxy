import { describe, expect, it } from 'vitest';
import { isValidProxyApiKeyValue } from './is-valid-proxy-api-key';

describe('isValidProxyApiKeyValue', () => {
    it('accepts generated-style proxy keys', () => {
        expect(isValidProxyApiKeyValue('AIzaGPROXY_abcdefghijklmnopqr')).toBe(true);
        expect(isValidProxyApiKeyValue('gproxy_abc123def456')).toBe(true);
    });

    it('accepts keys that include dots', () => {
        expect(isValidProxyApiKeyValue('AQ.proxy-key-value-example-01')).toBe(true);
    });

    it('rejects empty, short, long, and illegal characters', () => {
        expect(isValidProxyApiKeyValue('')).toBe(false);
        expect(isValidProxyApiKeyValue('short')).toBe(false);
        expect(isValidProxyApiKeyValue('has space_value12')).toBe(false);
        expect(isValidProxyApiKeyValue(`${'a'.repeat(129)}`)).toBe(false);
    });
});
