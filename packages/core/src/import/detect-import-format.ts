import type { ImportFormat } from './types';

export function detectImportFormat(input: unknown): ImportFormat {
    if (Array.isArray(input)) return 'legacy-array';
    if (!input || typeof input !== 'object') return 'unknown';
    const record = input as Record<string, unknown>;
    if (Array.isArray(record.providerConnections)) return '9router';
    if (Array.isArray(record.api_keys)) return 'native';
    return 'unknown';
}
