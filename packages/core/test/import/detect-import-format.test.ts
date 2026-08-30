import { describe, expect, it } from 'vitest';
import { detectImportFormat } from '../../src/import/detect-import-format';
import { isMaskedApiKey } from '../../src/import/is-masked-api-key';

describe('detectImportFormat', () => {
    it('detects 9router export', () => {
        expect(detectImportFormat({ providerConnections: [] })).toBe('9router');
    });
    it('detects native export', () => {
        expect(detectImportFormat({ api_keys: [] })).toBe('native');
    });
    it('detects legacy array', () => {
        expect(detectImportFormat([{ key: 'x' }])).toBe('legacy-array');
    });
    it('returns unknown for invalid input', () => {
        expect(detectImportFormat('bad')).toBe('unknown');
    });
    it('prefers 9router when both providerConnections and api_keys exist', () => {
        expect(
            detectImportFormat({ providerConnections: [], api_keys: [{ name: 'x', api_key_value: 'y' }] }),
        ).toBe('9router');
    });
});

describe('isMaskedApiKey', () => {
    it('detects asterisk masking', () => {
        expect(isMaskedApiKey('AIzaSy****abcd')).toBe(true);
    });
    it('detects partial asterisk masking', () => {
        expect(isMaskedApiKey('AIzaSy**abcdefghijklmnop')).toBe(true);
    });
    it('detects bullet masking when most characters are hidden', () => {
        expect(isMaskedApiKey('AIzaSyTEST•••••••••••••••••••••••••')).toBe(true);
    });
    it('allows unmasked keys', () => {
        expect(isMaskedApiKey('AIzaSyTESTKEY000000000000000000000')).toBe(false);
    });
});
