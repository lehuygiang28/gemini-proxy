import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseNineRouterImport } from '../../src/import/parse-9router-import';

const fixture = JSON.parse(
    readFileSync(resolve(__dirname, '../fixtures/9router-export.fixture.json'), 'utf-8'),
);

describe('parseNineRouterImport', () => {
    it('extracts only gemini apikey connections', () => {
        const result = parseNineRouterImport(fixture, '2026-08-30T00:00:00.000Z');
        expect(result.format).toBe('9router');
        expect(result.keys).toHaveLength(2);
        expect(result.stats.gemini_connections).toBe(3);
        expect(result.stats.imported_keys).toBe(2);
        expect(result.stats.skipped_unsupported).toBe(2);
        expect(result.stats.skipped_masked).toBe(1);
    });

    it('trims api key whitespace', () => {
        const result = parseNineRouterImport(fixture);
        const spaced = result.keys.find((k) => k.name === 'spaced-key');
        expect(spaced?.api_key_value).toBe('AIzaSyTESTKEY000000000000000000000');
    });

    it('preserves is_active false', () => {
        const result = parseNineRouterImport(fixture);
        const inactive = result.keys.find((k) => k.name === 'inactive-key');
        expect(inactive?.is_active).toBe(false);
    });

    it('stores connection_id in metadata', () => {
        const result = parseNineRouterImport(fixture);
        expect(result.keys[0]?.metadata.connection_id).toBeDefined();
        expect(result.keys[0]?.metadata.source).toBe('9router');
    });

    it('warns without throwing when no Gemini keys are importable', () => {
        const result = parseNineRouterImport({
            providerConnections: [
                { id: 'openai-connection', provider: 'openai', authType: 'apikey' },
            ],
        });
        expect(result.keys).toHaveLength(0);
        expect(result.warnings).toContain('No importable Gemini API keys found in 9router export');
    });
});
