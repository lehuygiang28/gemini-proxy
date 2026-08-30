import { isMaskedApiKey } from './is-masked-api-key';
import type { ImportParseResult, NineRouterConnection, NormalizedImportKey } from './types';

const GEMINI_PROVIDER = 'gemini';
const MIN_KEY_LENGTH = 10;

function isNineRouterConnection(value: unknown): value is NineRouterConnection {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseNineRouterImport(
    input: unknown,
    importedAt: string = new Date().toISOString(),
): ImportParseResult {
    const warnings: string[] = [];
    const keys: NormalizedImportKey[] = [];
    let geminiConnections = 0;
    let skippedUnsupported = 0;
    let skippedMasked = 0;
    let skippedInvalid = 0;

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        warnings.push('Invalid 9router export: expected a JSON object');
        return {
            format: '9router',
            keys,
            stats: {},
            warnings,
        };
    }

    const record = input as Record<string, unknown>;
    const rawConnections = record.providerConnections;
    if (!Array.isArray(rawConnections)) {
        warnings.push('Invalid 9router export: providerConnections must be an array');
        return {
            format: '9router',
            keys,
            stats: {},
            warnings,
        };
    }

    rawConnections.forEach((entry, index) => {
        if (!isNineRouterConnection(entry)) {
            skippedInvalid += 1;
            warnings.push(`Skipped connection ${index}: invalid entry`);
            return;
        }

        const connection = entry;
        if (connection.provider !== GEMINI_PROVIDER || connection.authType !== 'apikey') {
            skippedUnsupported += 1;
            return;
        }
        geminiConnections += 1;
        const rawKey = typeof connection.apiKey === 'string' ? connection.apiKey : '';
        const apiKeyValue = rawKey.trim();
        if (apiKeyValue.length === 0) {
            skippedInvalid += 1;
            warnings.push(`Skipped gemini connection ${connection.id ?? index}: missing apiKey`);
            return;
        }
        if (isMaskedApiKey(apiKeyValue)) {
            skippedMasked += 1;
            warnings.push(`Skipped gemini connection ${connection.id ?? index}: masked apiKey`);
            return;
        }
        if (apiKeyValue.length < MIN_KEY_LENGTH) {
            skippedInvalid += 1;
            warnings.push(`Skipped gemini connection ${connection.id ?? index}: apiKey too short`);
            return;
        }
        keys.push({
            name: connection.name?.trim() || `gemini-import-${index + 1}`,
            api_key_value: apiKeyValue,
            provider: 'googleaistudio',
            is_active: connection.isActive !== false,
            metadata: {
                source: '9router',
                connection_id: connection.id,
                priority: connection.priority,
                test_status: connection.testStatus,
                imported_at: importedAt,
            },
        });
    });
    if (keys.length === 0) {
        warnings.push('No importable Gemini API keys found in 9router export');
    }
    return {
        format: '9router',
        keys,
        stats: {
            total_connections: rawConnections.length,
            gemini_connections: geminiConnections,
            imported_keys: keys.length,
            skipped_unsupported: skippedUnsupported,
            skipped_masked: skippedMasked,
            skipped_invalid: skippedInvalid,
        },
        warnings,
    };
}
