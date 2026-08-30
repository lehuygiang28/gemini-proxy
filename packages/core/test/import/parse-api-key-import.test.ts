import { describe, expect, it } from 'vitest';
import { parseApiKeyImport } from '../../src/import/parse-api-key-import';

const VALID_KEY = 'AIzaSyTESTKEY000000000000000000000';
const VALID_KEY_2 = 'AIzaSyTESTKEY000000000000000000001';
const AUTH_KEY = 'AQ.TESTAUTHKEY0000000000000000000000';

describe('parseApiKeyImport', () => {
    it('parses native export with api_keys array', () => {
        const raw = JSON.stringify({
            version: '1.0.0',
            exported_at: '2026-08-30T00:00:00.000Z',
            api_keys: [
                {
                    name: 'native-key',
                    api_key_value: VALID_KEY,
                    provider: 'googleaistudio',
                    is_active: true,
                    metadata: { note: 'existing' },
                },
            ],
        });
        const result = parseApiKeyImport(raw);
        expect(result.format).toBe('native');
        expect(result.keys).toHaveLength(1);
        expect(result.keys[0]?.name).toBe('native-key');
        expect(result.keys[0]?.api_key_value).toBe(VALID_KEY);
        expect(result.keys[0]?.provider).toBe('googleaistudio');
        expect(result.keys[0]?.is_active).toBe(true);
        expect(result.keys[0]?.metadata.source).toBe('native');
        expect(result.keys[0]?.metadata.imported_at).toBeDefined();
    });

    it('parses legacy array with object key field', () => {
        const raw = JSON.stringify([{ key: VALID_KEY, name: 'legacy-key' }]);
        const result = parseApiKeyImport(raw);
        expect(result.format).toBe('legacy-array');
        expect(result.keys).toHaveLength(1);
        expect(result.keys[0]?.name).toBe('legacy-key');
        expect(result.keys[0]?.api_key_value).toBe(VALID_KEY);
        expect(result.keys[0]?.metadata.source).toBe('legacy');
    });

    it('parses legacy array with string entries', () => {
        const raw = JSON.stringify([VALID_KEY, VALID_KEY_2]);
        const result = parseApiKeyImport(raw);
        expect(result.format).toBe('legacy-array');
        expect(result.keys).toHaveLength(2);
        expect(result.keys[0]?.api_key_value).toBe(VALID_KEY);
        expect(result.keys[1]?.api_key_value).toBe(VALID_KEY_2);
        expect(result.keys[0]?.name).toBe('legacy-import-1');
    });

    it('parses legacy array with apiKey and api_key_value fields', () => {
        const raw = JSON.stringify([
            { apiKey: VALID_KEY, title: 'from-apiKey' },
            { api_key_value: VALID_KEY_2, label: 'from-api_key_value' },
        ]);
        const result = parseApiKeyImport(raw);
        expect(result.format).toBe('legacy-array');
        expect(result.keys).toHaveLength(2);
        expect(result.keys[0]?.name).toBe('from-apiKey');
        expect(result.keys[0]?.api_key_value).toBe(VALID_KEY);
        expect(result.keys[1]?.name).toBe('from-api_key_value');
        expect(result.keys[1]?.api_key_value).toBe(VALID_KEY_2);
    });

    it('parses legacy array with value field', () => {
        const raw = JSON.stringify([{ value: VALID_KEY, name: 'value-key' }]);
        const result = parseApiKeyImport(raw);
        expect(result.keys).toHaveLength(1);
        expect(result.keys[0]?.name).toBe('value-key');
        expect(result.keys[0]?.api_key_value).toBe(VALID_KEY);
    });

    it('parses new Google AQ. auth API keys', () => {
        const raw = JSON.stringify([{ name: 'auth-key', api_key_value: AUTH_KEY }]);
        const result = parseApiKeyImport(raw);
        expect(result.format).toBe('legacy-array');
        expect(result.keys).toHaveLength(1);
        expect(result.keys[0]?.api_key_value).toBe(AUTH_KEY);
    });

    it('throws when a native export contains no importable keys', () => {
        const raw = JSON.stringify({ api_keys: [] });
        expect(() => parseApiKeyImport(raw)).toThrow('No keys found in import file');
    });

    it('throws when a legacy array contains no importable keys', () => {
        const raw = JSON.stringify([]);
        expect(() => parseApiKeyImport(raw)).toThrow('No keys found in import file');
    });

    it('throws on invalid JSON', () => {
        expect(() => parseApiKeyImport('not json')).toThrow('Invalid JSON import file');
    });

    it('throws on unknown object format', () => {
        const raw = JSON.stringify({ foo: 'bar' });
        expect(() => parseApiKeyImport(raw)).toThrow('Unsupported import file format');
    });

    it('routes 9router export through orchestrator', () => {
        const raw = JSON.stringify({
            providerConnections: [
                {
                    id: 'conn-1',
                    provider: 'gemini',
                    authType: 'apikey',
                    name: 'orchestrator-key',
                    apiKey: VALID_KEY,
                    isActive: true,
                },
            ],
        });
        const result = parseApiKeyImport(raw);
        expect(result.format).toBe('9router');
        expect(result.keys).toHaveLength(1);
        expect(result.keys[0]?.name).toBe('orchestrator-key');
    });
});
