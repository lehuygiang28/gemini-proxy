import { isMaskedApiKey } from './is-masked-api-key';
import type { ImportParseResult, NineRouterConnection, NormalizedImportKey } from './types';

const GEMINI_PROVIDER = 'gemini';
const MIN_KEY_LENGTH = 10;

export function parseNineRouterImport(
    input: unknown,
    importedAt: string = new Date().toISOString(),
): ImportParseResult {
    const record = input as { providerConnections?: NineRouterConnection[] };
    const connections = record.providerConnections ?? [];
    const warnings: string[] = [];
    const keys: NormalizedImportKey[] = [];
    let skippedNonGemini = 0;
    let skippedMasked = 0;
    let skippedInvalid = 0;
    connections.forEach((connection, index) => {
        if (connection.provider !== GEMINI_PROVIDER || connection.authType !== 'apikey') {
            skippedNonGemini += 1;
            return;
        }
        const rawKey = typeof connection.apiKey === 'string' ? connection.apiKey : '';
        const apiKeyValue = rawKey.trim();
        if (apiKeyValue.length < MIN_KEY_LENGTH) {
            skippedInvalid += 1;
            warnings.push(`Skipped gemini connection ${connection.id ?? index}: missing apiKey`);
            return;
        }
        if (isMaskedApiKey(apiKeyValue)) {
            skippedMasked += 1;
            warnings.push(`Skipped gemini connection ${connection.id ?? index}: masked apiKey`);
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
    if (connections.some((c) => c.provider === GEMINI_PROVIDER) && keys.length === 0) {
        warnings.push('No importable Gemini API keys found in 9router export');
    }
    return {
        format: '9router',
        keys,
        stats: {
            total_connections: connections.length,
            gemini_connections: keys.length,
            skipped_non_gemini: skippedNonGemini,
            skipped_masked: skippedMasked,
            skipped_invalid: skippedInvalid,
        },
        warnings,
    };
}
