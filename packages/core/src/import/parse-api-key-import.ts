import { detectImportFormat } from './detect-import-format';
import { parseLegacyArrayImport } from './parse-legacy-array-import';
import { parseNativeImport } from './parse-native-import';
import { parseNineRouterImport } from './parse-9router-import';
import type { ImportParseResult } from './types';

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
            return parseNativeImport(parsed);
        case 'legacy-array':
            return parseLegacyArrayImport(parsed);
        default:
            throw new Error('Unsupported import file format');
    }
}
