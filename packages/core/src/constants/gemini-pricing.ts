/**
 * Standard paid Gemini Developer API rates (USD per 1M tokens).
 * Source: https://ai.google.dev/gemini-api/docs/pricing
 * Snapshot only — do not reprice historical logs when this table changes.
 */
export type GeminiModelRates = {
    readonly inputPerMillion: number;
    readonly outputPerMillion: number;
    readonly cachedInputPerMillion: number;
    readonly longContextAfter?: number;
    readonly longContextInputPerMillion?: number;
    readonly longContextOutputPerMillion?: number;
    readonly longContextCachedInputPerMillion?: number;
};

export type GeminiPricingTable = {
    readonly asOf: string;
    readonly models: Readonly<Record<string, GeminiModelRates>>;
};

export const GEMINI_PRICING: GeminiPricingTable = {
    asOf: '2026-08-30',
    models: {
        'gemini-3.6-flash': {
            inputPerMillion: 1.5,
            outputPerMillion: 7.5,
            cachedInputPerMillion: 0.15,
        },
        'gemini-3.5-flash': {
            inputPerMillion: 1.5,
            outputPerMillion: 9.0,
            cachedInputPerMillion: 0.15,
        },
        'gemini-3.5-flash-lite': {
            inputPerMillion: 0.3,
            outputPerMillion: 2.5,
            cachedInputPerMillion: 0.03,
        },
        'gemini-3.1-flash-lite': {
            inputPerMillion: 0.25,
            outputPerMillion: 1.5,
            cachedInputPerMillion: 0.025,
        },
        'gemini-3.1-pro-preview': {
            inputPerMillion: 2.0,
            outputPerMillion: 12.0,
            cachedInputPerMillion: 0.2,
            longContextAfter: 200_000,
            longContextInputPerMillion: 4.0,
            longContextOutputPerMillion: 18.0,
            longContextCachedInputPerMillion: 0.4,
        },
        'gemini-3-flash-preview': {
            inputPerMillion: 0.5,
            outputPerMillion: 3.0,
            cachedInputPerMillion: 0.05,
        },
        'gemini-2.5-pro': {
            inputPerMillion: 1.25,
            outputPerMillion: 10.0,
            cachedInputPerMillion: 0.125,
            longContextAfter: 200_000,
            longContextInputPerMillion: 2.5,
            longContextOutputPerMillion: 15.0,
            longContextCachedInputPerMillion: 0.25,
        },
        'gemini-2.5-flash': {
            inputPerMillion: 0.3,
            outputPerMillion: 2.5,
            cachedInputPerMillion: 0.03,
        },
        'gemini-2.5-flash-lite': {
            inputPerMillion: 0.1,
            outputPerMillion: 0.4,
            cachedInputPerMillion: 0.01,
        },
        'gemini-2.0-flash': {
            inputPerMillion: 0.1,
            outputPerMillion: 0.4,
            cachedInputPerMillion: 0.025,
        },
        'gemini-2.0-flash-lite': {
            inputPerMillion: 0.075,
            outputPerMillion: 0.3,
            cachedInputPerMillion: 0,
        },
    },
};

const MODEL_PREFIX = 'models/';

export function normalizeGeminiModelId(model: string): string {
    const trimmed = model.trim().toLowerCase();
    if (trimmed.startsWith(MODEL_PREFIX)) {
        return trimmed.slice(MODEL_PREFIX.length);
    }
    return trimmed;
}

export function resolveGeminiPricing(
    model: string,
): { modelId: string; rates: GeminiModelRates } | null {
    const normalized = normalizeGeminiModelId(model);
    if (!normalized) {
        return null;
    }
    const exact = GEMINI_PRICING.models[normalized];
    if (exact) {
        return { modelId: normalized, rates: exact };
    }
    const keys = Object.keys(GEMINI_PRICING.models).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (normalized === key || normalized.startsWith(`${key}-`)) {
            return { modelId: key, rates: GEMINI_PRICING.models[key] };
        }
    }
    return null;
}
