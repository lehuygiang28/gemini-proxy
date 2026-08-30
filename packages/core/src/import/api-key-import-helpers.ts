import type { NormalizedImportKey } from './types';

export type ExistingImportKey = {
    id: string;
    name: string;
    api_key_value: string;
    metadata?: Record<string, unknown> | null;
};

export function findExistingKey<T extends Pick<ExistingImportKey, 'api_key_value' | 'metadata'>>(
    existing: readonly T[],
    incoming: NormalizedImportKey,
): (T & { id?: string }) | undefined {
    const byValue = existing.find((key) => key.api_key_value === incoming.api_key_value);
    if (byValue) return byValue;
    if (!incoming.metadata.connection_id) return undefined;
    return existing.find(
        (key) =>
            (key.metadata as { connection_id?: string } | null | undefined)?.connection_id
                === incoming.metadata.connection_id,
    );
}

export function mergeImportMetadata(
    existing: Record<string, unknown> | null | undefined,
    incoming: NormalizedImportKey['metadata'],
): NormalizedImportKey['metadata'] {
    const base =
        existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
    const definedIncoming = Object.fromEntries(
        Object.entries(incoming).filter(([, value]) => value !== undefined),
    );
    return { ...base, ...definedIncoming } as NormalizedImportKey['metadata'];
}

export type ApiKeyImportUpdate = {
    id: string;
    updates: {
        name: string;
        api_key_value: string;
        provider: NormalizedImportKey['provider'];
        is_active: boolean;
        metadata: NormalizedImportKey['metadata'];
    };
};

export type ApiKeyImportPlanOptions = {
    /** Rotate stored secret when incoming value differs (CLI --overwrite) */
    overwriteSecrets?: boolean;
    /** Skip rows that collide by name only (CLI --skip-duplicates) */
    skipDuplicates?: boolean;
    /** Update existing row on name collision instead of creating (Web import default) */
    updateOnNameCollision?: boolean;
};

export type ApiKeyImportPlanResult = {
    creates: NormalizedImportKey[];
    updates: ApiKeyImportUpdate[];
    skipped: number;
    created: number;
    updated: number;
    warnings: string[];
};

const PENDING_PREFIX = '__pending_';

function isPendingImportKey(id: string): boolean {
    return id.startsWith(PENDING_PREFIX);
}

export function planApiKeyImport(
    existingKeys: readonly ExistingImportKey[],
    incomingKeys: readonly NormalizedImportKey[],
    options: ApiKeyImportPlanOptions = {},
): ApiKeyImportPlanResult {
    const workingKeys: ExistingImportKey[] = [...existingKeys];
    const creates: NormalizedImportKey[] = [];
    const updates: ApiKeyImportUpdate[] = [];
    const warnings: string[] = [];
    let skipped = 0;
    let created = 0;
    let updated = 0;

    for (const importKey of incomingKeys) {
        const matchedKey = findExistingKey(workingKeys, importKey);

        if (matchedKey?.id && isPendingImportKey(matchedKey.id)) {
            skipped += 1;
            warnings.push(`Skipped duplicate key in import batch: "${importKey.name}"`);
            continue;
        }

        if (matchedKey?.id) {
            if (matchedKey.api_key_value !== importKey.api_key_value && !options.overwriteSecrets) {
                warnings.push(
                    `Key "${importKey.name}": stored secret was not rotated`,
                );
            }

            const nextValue =
                options.overwriteSecrets && matchedKey.api_key_value !== importKey.api_key_value
                    ? importKey.api_key_value
                    : matchedKey.api_key_value;
            const mergedMetadata = mergeImportMetadata(matchedKey.metadata, importKey.metadata);

            updates.push({
                id: matchedKey.id,
                updates: {
                    name: importKey.name,
                    api_key_value: nextValue,
                    provider: importKey.provider,
                    is_active: importKey.is_active,
                    metadata: mergedMetadata,
                },
            });

            const workingIndex = workingKeys.findIndex((key) => key.id === matchedKey.id);
            if (workingIndex >= 0) {
                workingKeys[workingIndex] = {
                    ...workingKeys[workingIndex],
                    name: importKey.name,
                    api_key_value: nextValue,
                    metadata: mergedMetadata,
                };
            }

            updated += 1;
            continue;
        }

        const nameCollision = workingKeys.find((key) => key.name === importKey.name);

        if (nameCollision) {
            if (nameCollision.id && isPendingImportKey(nameCollision.id)) {
                skipped += 1;
                warnings.push(`Skipped duplicate key in import batch: "${importKey.name}"`);
                continue;
            }

            if (options.skipDuplicates) {
                skipped += 1;
                continue;
            }

            if (options.updateOnNameCollision || options.overwriteSecrets) {
                if (!nameCollision.id) {
                    skipped += 1;
                    continue;
                }

                updates.push({
                    id: nameCollision.id,
                    updates: {
                        name: importKey.name,
                        api_key_value: importKey.api_key_value,
                        provider: importKey.provider,
                        is_active: importKey.is_active,
                        metadata: mergeImportMetadata(nameCollision.metadata, importKey.metadata),
                    },
                });
                updated += 1;

                const workingIndex = workingKeys.findIndex((key) => key.id === nameCollision.id);
                if (workingIndex >= 0) {
                    workingKeys[workingIndex] = {
                        ...workingKeys[workingIndex],
                        name: importKey.name,
                        api_key_value: importKey.api_key_value,
                        metadata: mergeImportMetadata(nameCollision.metadata, importKey.metadata),
                    };
                }
                continue;
            }

            skipped += 1;
            continue;
        }

        creates.push(importKey);
        created += 1;
        workingKeys.push({
            id: `${PENDING_PREFIX}${workingKeys.length}`,
            name: importKey.name,
            api_key_value: importKey.api_key_value,
            metadata: importKey.metadata,
        });
    }

    return { creates, updates, skipped, created, updated, warnings };
}
