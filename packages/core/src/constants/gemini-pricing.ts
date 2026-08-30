/**
 * Standard paid Gemini Developer API rates (USD per 1M tokens).
 * Source: https://ai.google.dev/gemini-api/docs/pricing (copied 2026-08-30).
 * Snapshot `estimated_cost_usd` at persist — do not reprice historical logs.
 *
 * v1 bills text/image/video *input* + text/thinking *output* only.
 * Not billed here: audio surcharge, image-out, TTS, Live, Veo, Lyria,
 * embeddings, grounding query fees, cache storage $/hour, Batch/Flex/Priority.
 */

export type GeminiTokenRates = {
    readonly inputPerMillion: number;
    readonly outputPerMillion: number;
    readonly cachedInputPerMillion: number;
    readonly longContextAfter?: number;
    readonly longContextInputPerMillion?: number;
    readonly longContextOutputPerMillion?: number;
    readonly longContextCachedInputPerMillion?: number;
};

export type GeminiModelRates = GeminiTokenRates & {
    /** Inclusive YYYY-MM-DD. Dates after this use `after`. */
    readonly introThrough?: string;
    readonly after?: GeminiTokenRates;
};

export type GeminiPricingTable = {
    readonly asOf: string;
    readonly models: Readonly<Record<string, GeminiModelRates>>;
};

/** 3.6 Flash + 3.7 Flash introductory window on the Developer API. */
const FLASH_36_37_INTRO_THROUGH = '2026-12-31';
const FLASH_36_37_INTRO: GeminiTokenRates = {
    inputPerMillion: 0.75,
    outputPerMillion: 3.75,
    cachedInputPerMillion: 0.075,
};
const FLASH_36_37_STANDARD: GeminiTokenRates = {
    inputPerMillion: 1.5,
    outputPerMillion: 7.5,
    cachedInputPerMillion: 0.15,
};

export const GEMINI_PRICING: GeminiPricingTable = {
    asOf: '2026-08-30',
    models: {
        'gemini-3.7-flash': {
            ...FLASH_36_37_INTRO,
            introThrough: FLASH_36_37_INTRO_THROUGH,
            after: FLASH_36_37_STANDARD,
        },
        'gemini-3.6-flash': {
            ...FLASH_36_37_INTRO,
            introThrough: FLASH_36_37_INTRO_THROUGH,
            after: FLASH_36_37_STANDARD,
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
        'gemini-2.5-computer-use': {
            inputPerMillion: 1.25,
            outputPerMillion: 10.0,
            cachedInputPerMillion: 0.125,
            longContextAfter: 200_000,
            longContextInputPerMillion: 2.5,
            longContextOutputPerMillion: 15.0,
            longContextCachedInputPerMillion: 0.25,
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
        'gemini-robotics-er-2': {
            inputPerMillion: 2.0,
            outputPerMillion: 10.0,
            cachedInputPerMillion: 0.2,
        },
        'gemini-robotics-er-1.6': {
            inputPerMillion: 1.0,
            outputPerMillion: 5.0,
            cachedInputPerMillion: 0,
        },
        /**
         * Gemma open models on the Gemini API.
         * Gemma 3/2 paid-tier rows are N/A on ai.google.dev (free tier); rates below
         * follow published hosted-inference list prices where available. Gemma 4 26B
         * matches Google Cloud list ($0.15 / $0.60 / $0.015 cache). Override per model
         * in Settings → Cost pricing when your contract differs.
         */
        'gemma-2-2b-it': {
            inputPerMillion: 0.05,
            outputPerMillion: 0.05,
            cachedInputPerMillion: 0,
        },
        'gemma-2-9b-it': {
            inputPerMillion: 0.2,
            outputPerMillion: 0.2,
            cachedInputPerMillion: 0,
        },
        'gemma-2-27b-it': {
            inputPerMillion: 0.65,
            outputPerMillion: 0.65,
            cachedInputPerMillion: 0,
        },
        'gemma-3-270m-it': {
            inputPerMillion: 0.02,
            outputPerMillion: 0.04,
            cachedInputPerMillion: 0.01,
        },
        'gemma-3-1b-it': {
            inputPerMillion: 0.02,
            outputPerMillion: 0.04,
            cachedInputPerMillion: 0.01,
        },
        'gemma-3-4b-it': {
            inputPerMillion: 0.05,
            outputPerMillion: 0.1,
            cachedInputPerMillion: 0.025,
        },
        'gemma-3-12b-it': {
            inputPerMillion: 0.05,
            outputPerMillion: 0.15,
            cachedInputPerMillion: 0.025,
        },
        'gemma-3-27b-it': {
            inputPerMillion: 0.08,
            outputPerMillion: 0.45,
            cachedInputPerMillion: 0.04,
        },
        'gemma-3n-e2b-it': {
            inputPerMillion: 0.04,
            outputPerMillion: 0.08,
            cachedInputPerMillion: 0.02,
        },
        'gemma-3n-e4b-it': {
            inputPerMillion: 0.05,
            outputPerMillion: 0.1,
            cachedInputPerMillion: 0.025,
        },
        'gemma-4-26b-a4b-it': {
            inputPerMillion: 0.15,
            outputPerMillion: 0.6,
            cachedInputPerMillion: 0.015,
        },
        'gemma-4-31b-it': {
            inputPerMillion: 0.09,
            outputPerMillion: 0.34,
            cachedInputPerMillion: 0.045,
        },
    },
};

/** Default when a gemma-* id is not in the table (e.g. future preview suffixes). */
const GEMMA_FALLBACK_RATES: GeminiTokenRates = {
    inputPerMillion: 0.05,
    outputPerMillion: 0.1,
    cachedInputPerMillion: 0.025,
};

/** Default when a gemini-* text id is not in the table (e.g. dated preview suffixes). */
const GEMINI_FALLBACK_RATES: GeminiTokenRates = {
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
    cachedInputPerMillion: 0.03,
};

export type ModelPricingOverride = {
    readonly inputPerMillion: number;
    readonly outputPerMillion: number;
    readonly cachedInputPerMillion?: number;
};

export type CustomModelPricingMap = Readonly<Record<string, ModelPricingOverride>>;

/** Pointer aliases → canonical table keys (exact match only). */
export const GEMINI_MODEL_ALIASES: Readonly<Record<string, string>> = {
    'gemini-flash-latest': 'gemini-3.7-flash',
    'gemini-flash-lite-latest': 'gemini-3.5-flash-lite',
    'gemini-pro-latest': 'gemini-3.1-pro-preview',
    'gemma-2-2b': 'gemma-2-2b-it',
    'gemma-2-9b': 'gemma-2-9b-it',
    'gemma-2-27b': 'gemma-2-27b-it',
    'gemma-3-270m': 'gemma-3-270m-it',
    'gemma-3-1b': 'gemma-3-1b-it',
    'gemma-3-4b': 'gemma-3-4b-it',
    'gemma-3-12b': 'gemma-3-12b-it',
    'gemma-3-27b': 'gemma-3-27b-it',
    'gemma-3n-e2b': 'gemma-3n-e2b-it',
    'gemma-3n-e4b': 'gemma-3n-e4b-it',
    'gemma-4-26b-a4b': 'gemma-4-26b-a4b-it',
    'gemma-4-31b': 'gemma-4-31b-it',
};

/**
 * Modalities billed outside v1 text USD. Prefix match would otherwise
 * map image/TTS/Live IDs onto a sibling Flash/Pro text row.
 */
const NON_TEXT_USD_PREFIXES = [
    'gemini-3.5-live-translate',
    'gemini-3.5-transcribe',
    'gemini-omni-',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-tts',
    'gemini-3.1-flash-live',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-pro-preview-tts',
    'gemini-2.5-flash-native-audio',
    'gemini-embedding',
    'veo-',
    'lyria-',
    'imagen-',
] as const;

const MODEL_PREFIX = 'models/';

export function normalizeGeminiModelId(model: string): string {
    const trimmed = model.trim().toLowerCase();
    if (trimmed.startsWith(MODEL_PREFIX)) {
        return trimmed.slice(MODEL_PREFIX.length);
    }
    return trimmed;
}

export function isNonTextUsdModel(model: string): boolean {
    const normalized = normalizeGeminiModelId(model);
    return NON_TEXT_USD_PREFIXES.some(
        (prefix) => normalized === prefix || normalized.startsWith(prefix),
    );
}

function utcDateYmd(at: Date): string {
    return at.toISOString().slice(0, 10);
}

/** Pick intro vs post-intro token rates for a calendar day (UTC). */
export function effectiveTokenRates(
    rates: GeminiModelRates,
    at: Date = new Date(),
): GeminiTokenRates {
    if (rates.introThrough && rates.after && utcDateYmd(at) > rates.introThrough) {
        return rates.after;
    }
    return {
        inputPerMillion: rates.inputPerMillion,
        outputPerMillion: rates.outputPerMillion,
        cachedInputPerMillion: rates.cachedInputPerMillion,
        longContextAfter: rates.longContextAfter,
        longContextInputPerMillion: rates.longContextInputPerMillion,
        longContextOutputPerMillion: rates.longContextOutputPerMillion,
        longContextCachedInputPerMillion: rates.longContextCachedInputPerMillion,
    };
}

function toOverrideRates(override: ModelPricingOverride): GeminiTokenRates {
    return {
        inputPerMillion: override.inputPerMillion,
        outputPerMillion: override.outputPerMillion,
        cachedInputPerMillion: override.cachedInputPerMillion ?? 0,
    };
}

function resolveUserPricingOverride(
    normalized: string,
    userOverrides?: CustomModelPricingMap,
): { modelId: string; rates: GeminiTokenRates } | null {
    if (!userOverrides) {
        return null;
    }
    const exact = userOverrides[normalized];
    if (exact) {
        return { modelId: normalized, rates: toOverrideRates(exact) };
    }
    const keys = Object.keys(userOverrides).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (normalized === key || normalized.startsWith(`${key}-`)) {
            return { modelId: key, rates: toOverrideRates(userOverrides[key]!) };
        }
    }
    return null;
}

export function resolveGeminiPricing(
    model: string,
    at: Date = new Date(),
    userOverrides?: CustomModelPricingMap,
): { modelId: string; rates: GeminiTokenRates; source: 'builtin' | 'custom' } | null {
    const normalized = normalizeGeminiModelId(model);
    if (!normalized || isNonTextUsdModel(normalized)) {
        return null;
    }
    const custom = resolveUserPricingOverride(normalized, userOverrides);
    if (custom) {
        return { ...custom, source: 'custom' };
    }
    const aliased = GEMINI_MODEL_ALIASES[normalized] ?? normalized;
    const exact = GEMINI_PRICING.models[aliased];
    if (exact) {
        return { modelId: aliased, rates: effectiveTokenRates(exact, at), source: 'builtin' };
    }
    const keys = Object.keys(GEMINI_PRICING.models).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (normalized === key || normalized.startsWith(`${key}-`)) {
            const row = GEMINI_PRICING.models[key];
            return { modelId: key, rates: effectiveTokenRates(row, at), source: 'builtin' };
        }
    }
    if (normalized.startsWith('gemma-')) {
        return { modelId: normalized, rates: GEMMA_FALLBACK_RATES, source: 'builtin' };
    }
    if (normalized.startsWith('gemini-')) {
        return { modelId: normalized, rates: GEMINI_FALLBACK_RATES, source: 'builtin' };
    }
    return null;
}

export type BuiltinModelPricingRow = {
    modelId: string;
    family: 'gemini' | 'gemma';
    inputPerMillion: number;
    outputPerMillion: number;
    cachedInputPerMillion: number;
};

function toBuiltinPricingRow(
    modelId: string,
    row: GeminiModelRates,
    at: Date,
): BuiltinModelPricingRow {
    const rates = effectiveTokenRates(row, at);
    return {
        modelId,
        family: modelId.startsWith('gemma-') ? 'gemma' : 'gemini',
        inputPerMillion: rates.inputPerMillion,
        outputPerMillion: rates.outputPerMillion,
        cachedInputPerMillion: rates.cachedInputPerMillion,
    };
}

/** Built-in Gemini + Gemma rows for dashboard display (sorted by model id). */
export function listBuiltinModelPricingRows(
    at: Date = new Date(),
): readonly BuiltinModelPricingRow[] {
    return Object.entries(GEMINI_PRICING.models)
        .map(([modelId, row]) => toBuiltinPricingRow(modelId, row, at))
        .sort((a, b) => a.modelId.localeCompare(b.modelId));
}

/** @deprecated Use {@link listBuiltinModelPricingRows} */
export function listBuiltinGemmaPricingRows(
    at: Date = new Date(),
): readonly BuiltinModelPricingRow[] {
    return listBuiltinModelPricingRows(at).filter((row) => row.family === 'gemma');
}
