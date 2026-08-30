import { isMaskedApiKey } from './is-masked-api-key';
import type { ImportParseResult, NormalizedImportKey } from './types';

const MIN_KEY_LENGTH = 10;

type LegacyKeyObject = {
    key?: string;
    apiKey?: string;
    api_key_value?: string;
    name?: string;
    title?: string;
    label?: string;
};

function extractLegacyEntry(
    item: unknown,
    index: number,
): { apiKeyValue: string; name: string } {
    const defaultName = `legacy-import-${index + 1}`;
    if (typeof item === 'string') {
        return { apiKeyValue: item.trim(), name: defaultName };
    }
    if (typeof item === 'object' && item !== null) {
        const record = item as LegacyKeyObject;
        const apiKeyValue = (record.api_key_value || record.apiKey || record.key || '').trim();
        const name = record.name || record.title || record.label || defaultName;
        return { apiKeyValue, name };
    }
    return { apiKeyValue: '', name: defaultName };
}

export function parseLegacyArrayImport(
    input: unknown,
    importedAt: string = new Date().toISOString(),
): ImportParseResult {
    const items = Array.isArray(input) ? input : [];
    const warnings: string[] = [];
    const keys: NormalizedImportKey[] = [];
    let skippedInvalid = 0;
    let skippedMasked = 0;
    items.forEach((item, index) => {
        const { apiKeyValue, name } = extractLegacyEntry(item, index);
        if (apiKeyValue.length < MIN_KEY_LENGTH) {
            skippedInvalid += 1;
            warnings.push(`Skipped legacy entry ${index + 1}: missing key`);
            return;
        }
        if (isMaskedApiKey(apiKeyValue)) {
            skippedMasked += 1;
            warnings.push(`Skipped legacy entry ${index + 1}: masked key`);
            return;
        }
        keys.push({
            name,
            api_key_value: apiKeyValue,
            provider: 'googleaistudio',
            is_active: true,
            metadata: {
                source: 'legacy',
                imported_at: importedAt,
            },
        });
    });
    return {
        format: 'legacy-array',
        keys,
        stats: {
            skipped_invalid: skippedInvalid,
            skipped_masked: skippedMasked,
        },
        warnings,
    };
}
