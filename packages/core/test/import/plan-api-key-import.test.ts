import { describe, expect, it } from 'vitest';
import { planApiKeyImport } from '../../src/import/api-key-import-helpers';
import type { NormalizedImportKey } from '../../src/import/types';

const baseKey = (
    overrides: Partial<NormalizedImportKey> & Pick<NormalizedImportKey, 'name' | 'api_key_value'>,
): NormalizedImportKey => ({
    provider: 'googleaistudio',
    is_active: true,
    metadata: {
        source: '9router',
        imported_at: '2026-08-30T00:00:00.000Z',
    },
    ...overrides,
});

describe('planApiKeyImport', () => {
    it('updates an existing key matched by api_key_value', () => {
        const plan = planApiKeyImport(
            [
                {
                    id: 'existing-1',
                    name: 'old-name',
                    api_key_value: 'AIzaSyTESTKEY000000000000000000000',
                    metadata: { connection_id: 'conn-1' },
                },
            ],
            [
                baseKey({
                    name: 'new-name',
                    api_key_value: 'AIzaSyTESTKEY000000000000000000000',
                    metadata: {
                        source: '9router',
                        connection_id: 'conn-1',
                        imported_at: '2026-08-30T01:00:00.000Z',
                    },
                }),
            ],
            { updateOnNameCollision: true, overwriteSecrets: true },
        );

        expect(plan.created).toBe(0);
        expect(plan.updated).toBe(1);
        expect(plan.creates).toHaveLength(0);
        expect(plan.updates[0]?.updates.name).toBe('new-name');
    });

    it('updates on name collision when updateOnNameCollision is enabled', () => {
        const plan = planApiKeyImport(
            [
                {
                    id: 'existing-1',
                    name: 'gemini-prod',
                    api_key_value: 'AIzaSyROTATED000000000000000000000',
                    metadata: {},
                },
            ],
            [
                baseKey({
                    name: 'gemini-prod',
                    api_key_value: 'AIzaSyTESTKEY000000000000000000001',
                }),
            ],
            { updateOnNameCollision: true, overwriteSecrets: true },
        );

        expect(plan.updated).toBe(1);
        expect(plan.created).toBe(0);
        expect(plan.updates[0]?.updates.api_key_value).toBe(
            'AIzaSyTESTKEY000000000000000000001',
        );
    });

    it('skips duplicate values within the same import batch', () => {
        const incoming = baseKey({
            name: 'key-a',
            api_key_value: 'AIzaSyTESTKEY000000000000000000000',
        });

        const plan = planApiKeyImport([], [incoming, { ...incoming, name: 'key-b' }], {
            updateOnNameCollision: true,
        });

        expect(plan.created).toBe(1);
        expect(plan.skipped).toBe(1);
        expect(plan.warnings.some((warning) => warning.includes('import batch'))).toBe(true);
    });

    it('keeps stored secret when overwriteSecrets is false', () => {
        const plan = planApiKeyImport(
            [
                {
                    id: 'existing-1',
                    name: 'rotated',
                    api_key_value: 'AIzaSyROTATED000000000000000000000',
                    metadata: { connection_id: 'conn-1' },
                },
            ],
            [
                baseKey({
                    name: 'rotated',
                    api_key_value: 'AIzaSyTESTKEY000000000000000000000',
                    metadata: {
                        source: '9router',
                        connection_id: 'conn-1',
                        imported_at: '2026-08-30T00:00:00.000Z',
                    },
                }),
            ],
        );

        expect(plan.updated).toBe(1);
        expect(plan.updates[0]?.updates.api_key_value).toBe(
            'AIzaSyROTATED000000000000000000000',
        );
        expect(plan.warnings.some((warning) => warning.includes('not rotated'))).toBe(true);
    });
});
