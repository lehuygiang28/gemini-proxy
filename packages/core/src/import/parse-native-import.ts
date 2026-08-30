import { isMaskedApiKey } from './is-masked-api-key';
import type { ImportParseResult, NormalizedImportKey } from './types';

const MIN_KEY_LENGTH = 10;

type NativeApiKey = {
    name?: string;
    api_key_value?: string;
    provider?: string;
    is_active?: boolean;
    metadata?: Record<string, unknown>;
};

export function parseNativeImport(
    input: unknown,
    importedAt: string = new Date().toISOString(),
): ImportParseResult {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {
            format: 'native',
            keys: [],
            stats: {},
            warnings: ['Invalid native export: expected a JSON object'],
        };
    }

    const record = input as Record<string, unknown>;
    const rawApiKeys = record.api_keys;
    if (!Array.isArray(rawApiKeys)) {
        return {
            format: 'native',
            keys: [],
            stats: {},
            warnings: ['Invalid native export: api_keys must be an array'],
        };
    }

    const apiKeys = rawApiKeys;
    const warnings: string[] = [];
    const keys: NormalizedImportKey[] = [];
    let skippedInvalid = 0;
    let skippedMasked = 0;
    apiKeys.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            skippedInvalid += 1;
            warnings.push(`Skipped native key ${index + 1}: invalid entry`);
            return;
        }

        const nativeEntry = entry as NativeApiKey;
        const apiKeyValue =
            typeof nativeEntry.api_key_value === 'string' ? nativeEntry.api_key_value.trim() : '';
        if (apiKeyValue.length === 0) {
            skippedInvalid += 1;
            warnings.push(`Skipped native key ${index + 1}: missing api_key_value`);
            return;
        }
        if (isMaskedApiKey(apiKeyValue)) {
            skippedMasked += 1;
            warnings.push(`Skipped native key ${index + 1}: masked api_key_value`);
            return;
        }
        if (apiKeyValue.length < MIN_KEY_LENGTH) {
            skippedInvalid += 1;
            warnings.push(`Skipped native key ${index + 1}: api_key_value too short`);
            return;
        }
        const existingMetadata =
            nativeEntry.metadata && typeof nativeEntry.metadata === 'object'
                ? nativeEntry.metadata
                : {};
        keys.push({
            name: nativeEntry.name?.trim() || `native-import-${index + 1}`,
            api_key_value: apiKeyValue,
            provider: 'googleaistudio',
            is_active: nativeEntry.is_active !== false,
            metadata: {
                ...existingMetadata,
                source: 'native',
                imported_at: importedAt,
            },
        });
    });
    return {
        format: 'native',
        keys,
        stats: {
            skipped_invalid: skippedInvalid,
            skipped_masked: skippedMasked,
        },
        warnings,
    };
}
