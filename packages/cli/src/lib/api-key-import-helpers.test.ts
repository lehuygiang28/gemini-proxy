import assert from 'node:assert/strict';
import test from 'node:test';
import type { NormalizedImportKey } from '@gemini-proxy/core';
import { findExistingKey, mergeMetadata } from './api-key-import-helpers';

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

test('findExistingKey prefers a matching API key value', () => {
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
    assert.equal(actual?.id, 'value-match');
});

test('findExistingKey falls back to matching connection ID', () => {
    const existingKeys = [
        {
            id: 'connection-match',
            api_key_value: 'AIzaSyROTATED000000000000000000000',
            metadata: { connection_id: 'connection-1' },
        },
    ];
    const actual = findExistingKey(existingKeys, incomingKey);
    assert.equal(actual?.id, 'connection-match');
});

test('mergeMetadata retains existing values and applies imported values', () => {
    const actual = mergeMetadata(
        { note: 'keep-me', connection_id: 'old-connection' },
        incomingKey.metadata,
    );
    assert.deepEqual(actual, {
        note: 'keep-me',
        source: '9router',
        connection_id: 'connection-1',
        imported_at: '2026-08-30T00:00:00.000Z',
    });
});

test('mergeMetadata ignores undefined incoming fields', () => {
    const actual = mergeMetadata(
        { connection_id: 'keep-me', priority: 5 },
        {
            source: '9router',
            connection_id: undefined,
            priority: undefined,
            imported_at: '2026-08-30T00:00:00.000Z',
        },
    );
    assert.deepEqual(actual, {
        connection_id: 'keep-me',
        priority: 5,
        source: '9router',
        imported_at: '2026-08-30T00:00:00.000Z',
    });
});

test('findExistingKey detects duplicate values staged in the same import batch', () => {
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
    assert.equal(duplicate?.id, '__pending_0');
});
