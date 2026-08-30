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
});

describe('isMaskedApiKey', () => {
    it('detects asterisk masking', () => {
        expect(isMaskedApiKey('AIzaSy****abcd')).toBe(true);
    });
    it('allows real keys', () => {
        expect(isMaskedApiKey('AIzaSyBINy01yAT3py7ZGOsIC2iE9NXf2EgJMmg')).toBe(false);
    });
});
