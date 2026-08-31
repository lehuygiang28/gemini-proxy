import { describe, expect, it } from 'vitest';
import { DataSanitizer } from './sanitizer';

describe('DataSanitizer JSON field redaction', () => {
    it('redacts api_key_value and keeps the field name', () => {
        const actual = DataSanitizer.sanitizePayloadBody(
            JSON.stringify({ api_key_value: 'AIzaSyXXXX' }),
        );
        expect(actual.body).toEqual({ api_key_value: '[REDACTED]' });
    });

    it('redacts nested authorization values without renaming keys', () => {
        const actual = DataSanitizer.sanitizePayloadBody(
            JSON.stringify({ headers: { authorization: 'Bearer abc' } }),
        );
        expect(actual.body).toEqual({ headers: { authorization: '[REDACTED]' } });
    });

    it('redacts Google AI Studio AQ. keys in leftover strings', () => {
        const actual = DataSanitizer.sanitizePayloadBody('token=AQ.abcdefghijklmnop and more text');
        expect(String(actual.body)).toContain('[REDACTED]');
        expect(String(actual.body)).not.toContain('AQ.abcdefghijklmnop');
    });

    it('keeps sensitive header names when redacting values', () => {
        const actual = DataSanitizer.sanitizeHeaders({
            Authorization: 'Bearer secret-token-value',
            'x-goog-api-key': 'AIzaSyTESTGEMINIKEY00000000001',
        });
        expect(actual).toEqual({
            Authorization: '[REDACTED]',
            'x-goog-api-key': '[REDACTED]',
        });
    });

    it('redacts extraFieldNames such as foo_secret', () => {
        const actual = DataSanitizer.sanitizePayloadBody(
            JSON.stringify({ foo_secret: 'should-hide', visible: 'ok' }),
            DataSanitizer.PAYLOAD_BODY_MAX_CHARS,
            { extraFieldNames: ['foo_secret'] },
        );
        expect(actual.body).toEqual({ foo_secret: '[REDACTED]', visible: 'ok' });
    });
});
