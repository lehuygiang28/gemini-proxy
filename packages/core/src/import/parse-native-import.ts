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
    const record = input as { api_keys?: NativeApiKey[] };
    const apiKeys = record.api_keys ?? [];
    const warnings: string[] = [];
    const keys: NormalizedImportKey[] = [];
    let skippedInvalid = 0;
    let skippedMasked = 0;
    apiKeys.forEach((entry, index) => {
        const apiKeyValue = typeof entry.api_key_value === 'string' ? entry.api_key_value.trim() : '';
        if (apiKeyValue.length < MIN_KEY_LENGTH) {
            skippedInvalid += 1;
            warnings.push(`Skipped native key ${index + 1}: missing api_key_value`);
            return;
        }
        if (isMaskedApiKey(apiKeyValue)) {
            skippedMasked += 1;
            warnings.push(`Skipped native key ${index + 1}: masked api_key_value`);
            return;
        }
        const existingMetadata =
            entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
        keys.push({
            name: entry.name?.trim() || `native-import-${index + 1}`,
            api_key_value: apiKeyValue,
            provider: 'googleaistudio',
            is_active: entry.is_active !== false,
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
