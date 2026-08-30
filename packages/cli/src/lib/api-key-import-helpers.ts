import type { NormalizedImportKey } from '@gemini-proxy/core';
import type { ApiKey } from './database';

type ExistingApiKey = Pick<ApiKey, 'api_key_value' | 'metadata'>;

export function findExistingKey<T extends ExistingApiKey>(
    existing: readonly T[],
    incoming: NormalizedImportKey,
): T | undefined {
    const byValue = existing.find((key) => key.api_key_value === incoming.api_key_value);
    if (byValue) return byValue;
    if (!incoming.metadata.connection_id) return undefined;
    return existing.find(
        (key) =>
            (key.metadata as { connection_id?: string } | null)?.connection_id
                === incoming.metadata.connection_id,
    );
}

export function mergeMetadata(
    existing: ApiKey['metadata'],
    incoming: NormalizedImportKey['metadata'],
): NormalizedImportKey['metadata'] {
    const base =
        existing && typeof existing === 'object' && !Array.isArray(existing)
            ? (existing as Record<string, unknown>)
            : {};
    const definedIncoming = Object.fromEntries(
        Object.entries(incoming).filter(([, value]) => value !== undefined),
    );
    return { ...base, ...definedIncoming } as NormalizedImportKey['metadata'];
}
