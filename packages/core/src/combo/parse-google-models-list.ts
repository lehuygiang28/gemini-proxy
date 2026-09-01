import { normalizeGeminiModelId } from '../constants/gemini-pricing';

export type ParsedGoogleModel = {
    readonly modelId: string;
    readonly displayName: string | null;
    readonly supportsGenerate: boolean;
};

export function parseGoogleModelsList(body: unknown): ParsedGoogleModel[] | null {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const models = (body as { models?: unknown }).models;
    if (!Array.isArray(models)) {
        return null;
    }
    const parsed: ParsedGoogleModel[] = [];
    const seen = new Set<string>();
    for (const row of models) {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) {
            continue;
        }
        const name = 'name' in row ? (row as { name: unknown }).name : undefined;
        if (typeof name !== 'string' || name.length === 0) {
            continue;
        }
        const modelId = normalizeGeminiModelId(name);
        if (!modelId || seen.has(modelId)) {
            continue;
        }
        seen.add(modelId);
        const displayName =
            'displayName' in row &&
            typeof (row as { displayName?: unknown }).displayName === 'string'
                ? (row as { displayName: string }).displayName
                : null;
        const methods = Array.isArray(
            (row as { supportedGenerationMethods?: unknown }).supportedGenerationMethods,
        )
            ? (row as { supportedGenerationMethods: unknown[] }).supportedGenerationMethods
            : [];
        const hasGenerate = methods.some((method) => method === 'generateContent');
        const familyGenerate = modelId.startsWith('gemini-') || modelId.startsWith('gemma-');
        parsed.push({
            modelId,
            displayName,
            supportsGenerate: hasGenerate || familyGenerate,
        });
    }
    return parsed;
}
