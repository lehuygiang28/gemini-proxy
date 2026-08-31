import { describe, expect, it } from 'vitest';
import type { NormalizedImportKey } from '@gemini-proxy/core';
import { findExistingKey, mergeImportMetadata } from '@gemini-proxy/core';

const incomingKey: NormalizedImportKey = {
    name: 'imported-key',
    api_key_value: 'AIzaSyTESTKEY000000000000000000000',
    provider: 'googleaistudio',
    is_active: true,
    metadata: {
        source: '9router',
        connection_id: 'connection-1',
        imported_at: '2026-08-30T00:00:00.000Z',
    },
};

describe('api-key-import-helpers', () => {
    it('findExistingKey prefers a matching API key value', () => {
        const existingKeys = [
            {
                id: 'connection-match',
                api_key_value: 'AIzaSyROTATED000000000000000000000',
                metadata: { connection_id: 'connection-1' },
            },
            {
                id: 'value-match',
                api_key_value: incomingKey.api_key_value,
                metadata: { connection_id: 'another-connection' },
            },
        ];
        const actual = findExistingKey(existingKeys, incomingKey);
        expect(actual?.id).toBe('value-match');
    });

    it('findExistingKey falls back to matching connection ID', () => {
        const existingKeys = [
            {
                id: 'connection-match',
                api_key_value: 'AIzaSyROTATED000000000000000000000',
                metadata: { connection_id: 'connection-1' },
            },
        ];
        const actual = findExistingKey(existingKeys, incomingKey);
        expect(actual?.id).toBe('connection-match');
    });

    it('mergeMetadata retains existing values and applies imported values', () => {
        const actual = mergeImportMetadata(
            { note: 'keep-me', connection_id: 'old-connection' },
            incomingKey.metadata,
        );
        expect(actual).toEqual({
            note: 'keep-me',
            source: '9router',
            connection_id: 'connection-1',
            imported_at: '2026-08-30T00:00:00.000Z',
        });
    });

    it('mergeMetadata ignores undefined incoming fields', () => {
        const actual = mergeImportMetadata(
            { connection_id: 'keep-me', priority: 5 },
            {
                source: '9router',
                connection_id: undefined,
                priority: undefined,
                imported_at: '2026-08-30T00:00:00.000Z',
            },
        );
        expect(actual).toEqual({
            connection_id: 'keep-me',
            priority: 5,
            source: '9router',
            imported_at: '2026-08-30T00:00:00.000Z',
        });
    });

    it('findExistingKey detects duplicate values staged in the same import batch', () => {
        const workingKeys = [
            {
                id: '__pending_0',
                api_key_value: incomingKey.api_key_value,
                metadata: { connection_id: 'connection-1' },
            },
        ];
        const duplicate = findExistingKey(workingKeys, {
            ...incomingKey,
            name: 'duplicate-name',
        });
        expect(duplicate?.id).toBe('__pending_0');
    });
});
