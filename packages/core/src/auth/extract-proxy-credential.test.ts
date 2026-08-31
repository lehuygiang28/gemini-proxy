import { describe, expect, it } from 'vitest';
import { extractProxyCredential } from './extract-proxy-credential';

const VALID_KEY = 'AIzaGPROXY_abcdefghijklmnopqr';

describe('extractProxyCredential', () => {
    it('prefers x-goog-api-key over Bearer and query', () => {
        const actual = extractProxyCredential({
            path: '/openai/chat/completions',
            header: (name) => {
                if (name.toLowerCase() === 'x-goog-api-key') return VALID_KEY;
                if (name.toLowerCase() === 'authorization') return 'Bearer other_proxy_key_value';
                return undefined;
            },
            queryKey: 'query_proxy_key_value',
        });
        expect(actual).toEqual({ value: VALID_KEY, source: 'x-goog-api-key' });
    });

    it('uses Bearer when goog header is missing', () => {
        const actual = extractProxyCredential({
            path: '/gemini/v1beta/models/gemini-flash:generateContent',
            header: (name) =>
                name.toLowerCase() === 'authorization' ? `Bearer ${VALID_KEY}` : undefined,
            queryKey: 'query_proxy_key_value',
        });
        expect(actual).toEqual({ value: VALID_KEY, source: 'authorization' });
    });

    it('uses query key when both headers are missing', () => {
        const actual = extractProxyCredential({
            path: '/gemini/v1beta/models/gemini-flash:generateContent',
            header: () => undefined,
            queryKey: VALID_KEY,
        });
        expect(actual).toEqual({ value: VALID_KEY, source: 'query-key' });
    });

    it('returns null when the value fails isValidProxyApiKeyValue', () => {
        const actual = extractProxyCredential({
            path: '/gemini/v1beta/models/gemini-flash:generateContent',
            header: (name) => (name.toLowerCase() === 'x-goog-api-key' ? 'short' : undefined),
            queryKey: undefined,
        });
        expect(actual).toBeNull();
    });

    it('returns null for empty Bearer', () => {
        const actual = extractProxyCredential({
            path: '/openai/chat/completions',
            header: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer' : undefined),
            queryKey: undefined,
        });
        expect(actual).toBeNull();
    });
});
