import { describe, expect, it } from 'vitest';
import { extractProxyCredential } from './extract-proxy-credential';

const VALID_KEY = 'AIzaGPROXY_abcdefghijklmnopqr';
const OTHER_VALID_KEY = 'AIzaGPROXY_otherkeyvalue0001';

describe('extractProxyCredential', () => {
    it('uses x-goog-api-key when Bearer is missing', () => {
        const actual = extractProxyCredential({
            header: (name) => (name.toLowerCase() === 'x-goog-api-key' ? VALID_KEY : undefined),
        });
        expect(actual).toEqual({ value: VALID_KEY, source: 'x-goog-api-key' });
    });

    it('uses Bearer when goog header is missing', () => {
        const actual = extractProxyCredential({
            header: (name) =>
                name.toLowerCase() === 'authorization' ? `Bearer ${VALID_KEY}` : undefined,
        });
        expect(actual).toEqual({ value: VALID_KEY, source: 'authorization' });
    });

    it('returns conflicting_credentials when both goog and Bearer are present', () => {
        const actual = extractProxyCredential({
            header: (name) => {
                if (name.toLowerCase() === 'x-goog-api-key') return VALID_KEY;
                if (name.toLowerCase() === 'authorization') return `Bearer ${OTHER_VALID_KEY}`;
                return undefined;
            },
        });
        expect(actual).toEqual({ error: 'conflicting_credentials' });
    });

    it('returns conflicting_credentials when goog is valid and Bearer is present but invalid', () => {
        const actual = extractProxyCredential({
            header: (name) => {
                if (name.toLowerCase() === 'x-goog-api-key') return VALID_KEY;
                if (name.toLowerCase() === 'authorization') return 'Bearer short';
                return undefined;
            },
        });
        expect(actual).toEqual({ error: 'conflicting_credentials' });
    });

    it('ignores x-api-key when goog is present', () => {
        const actual = extractProxyCredential({
            header: (name) => {
                if (name.toLowerCase() === 'x-goog-api-key') return VALID_KEY;
                if (name.toLowerCase() === 'x-api-key') return OTHER_VALID_KEY;
                return undefined;
            },
        });
        expect(actual).toEqual({ value: VALID_KEY, source: 'x-goog-api-key' });
    });

    it('ignores query key when headers are missing', () => {
        const actual = extractProxyCredential({
            header: () => undefined,
        });
        expect(actual).toBeNull();
    });

    it('returns null when the value fails isValidProxyApiKeyValue', () => {
        const actual = extractProxyCredential({
            header: (name) => (name.toLowerCase() === 'x-goog-api-key' ? 'short' : undefined),
        });
        expect(actual).toBeNull();
    });

    it('returns null for empty Bearer', () => {
        const actual = extractProxyCredential({
            header: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer' : undefined),
        });
        expect(actual).toBeNull();
    });
});
