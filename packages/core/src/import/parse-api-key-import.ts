import { detectImportFormat } from './detect-import-format';
import { parseLegacyArrayImport } from './parse-legacy-array-import';
import { parseNativeImport } from './parse-native-import';
import { parseNineRouterImport } from './parse-9router-import';
import type { ImportParseResult } from './types';

function ensureKeysFound(result: ImportParseResult): ImportParseResult {
    if (result.keys.length === 0) throw new Error('No keys found in import file');
    return result;
}

export function parseApiKeyImport(raw: string): ImportParseResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error('Invalid JSON import file');
    }
    const format = detectImportFormat(parsed);
    switch (format) {
        case '9router':
            return parseNineRouterImport(parsed);
        case 'native':
            return ensureKeysFound(parseNativeImport(parsed));
        case 'legacy-array':
            return ensureKeysFound(parseLegacyArrayImport(parsed));
        default:
            throw new Error('Unsupported import file format');
    }
}
