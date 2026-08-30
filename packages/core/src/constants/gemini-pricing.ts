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
    },
};

/** Pointer aliases → canonical table keys (exact match only). */
export const GEMINI_MODEL_ALIASES: Readonly<Record<string, string>> = {
    'gemini-flash-latest': 'gemini-3.7-flash',
    'gemini-flash-lite-latest': 'gemini-3.5-flash-lite',
    'gemini-pro-latest': 'gemini-3.1-pro-preview',
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

export function resolveGeminiPricing(
    model: string,
    at: Date = new Date(),
): { modelId: string; rates: GeminiTokenRates } | null {
    const normalized = normalizeGeminiModelId(model);
    if (!normalized || isNonTextUsdModel(normalized)) {
        return null;
    }
    const aliased = GEMINI_MODEL_ALIASES[normalized] ?? normalized;
    const exact = GEMINI_PRICING.models[aliased];
    if (exact) {
        return { modelId: aliased, rates: effectiveTokenRates(exact, at) };
    }
    const keys = Object.keys(GEMINI_PRICING.models).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (normalized === key || normalized.startsWith(`${key}-`)) {
            const row = GEMINI_PRICING.models[key];
            return { modelId: key, rates: effectiveTokenRates(row, at) };
        }
    }
    return null;
}
