import {
    GEMINI_PRICING,
    type CustomModelPricingMap,
    resolveGeminiPricing,
} from '../constants/gemini-pricing';
import type { ParsedUsageMetadata } from './usage-metadata-parser';

export type GeminiCostEstimate = {
    usd: number;
    pricingVersion: string;
    matchedModel: string;
    uncachedPromptTokens: number;
    cacheTokens: number;
    outputBillableTokens: number;
};

export type EstimateGeminiCostInput = {
    model: string;
    promptTokens: number;
    cacheTokens: number;
    completionTokens: number;
    thoughtsTokens: number;
    toolUsePromptTokens: number;
    totalTokens: number;
    /** UTC calendar day for intro vs post-intro rates. Defaults to now. */
    at?: Date;
    /** Per-user overrides from user_settings.custom_model_pricing */
    pricingOverrides?: CustomModelPricingMap;
};

function toNonNegativeInt(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }
    return Math.floor(value);
}

/**
 * Partition tokens into disjoint billing buckets.
 * Gemini native: thoughts are outside candidates.
 * OpenAI o-style: reasoning may already sit inside completion.
 */
export function partitionBillableTokens(input: EstimateGeminiCostInput): {
    uncachedPromptTokens: number;
    cacheTokens: number;
    outputBillableTokens: number;
} {
    const promptTokens = toNonNegativeInt(input.promptTokens);
    const cacheTokens = Math.min(toNonNegativeInt(input.cacheTokens), promptTokens);
    const uncachedPromptTokens = promptTokens - cacheTokens;
    const visible = toNonNegativeInt(input.completionTokens);
    const toolUse = toNonNegativeInt(input.toolUsePromptTokens);
    const totalTokens = toNonNegativeInt(input.totalTokens);
    const remainder = Math.max(totalTokens - promptTokens - visible - toolUse, 0);
    const explicitThoughts = toNonNegativeInt(input.thoughtsTokens);
    const thoughts = explicitThoughts > 0 ? explicitThoughts : remainder;
    const thoughtsInsideCompletion =
        visible >= thoughts && promptTokens + visible + toolUse >= Math.max(totalTokens - 1, 0);
    const outputBillableTokens = thoughtsInsideCompletion ? visible : visible + thoughts;
    return { uncachedPromptTokens, cacheTokens, outputBillableTokens };
}

/** Visible completion only — excludes thoughts when they are folded into completion. */
export function visibleCompletionTokensForKeys(input: {
    promptTokens: number;
    completionTokens: number;
    thoughtsTokens: number;
    toolUsePromptTokens: number;
    totalTokens: number;
}): number {
    const visible = toNonNegativeInt(input.completionTokens);
    const toolUse = toNonNegativeInt(input.toolUsePromptTokens);
    const totalTokens = toNonNegativeInt(input.totalTokens);
    const promptTokens = toNonNegativeInt(input.promptTokens);
    const remainder = Math.max(totalTokens - promptTokens - visible - toolUse, 0);
    const explicitThoughts = toNonNegativeInt(input.thoughtsTokens);
    const thoughts = explicitThoughts > 0 ? explicitThoughts : remainder;
    const thoughtsInsideCompletion =
        visible >= thoughts && promptTokens + visible + toolUse >= Math.max(totalTokens - 1, 0);
    if (thoughtsInsideCompletion && thoughts > 0) {
        return Math.max(visible - thoughts, 0);
    }
    return visible;
}

export function estimateGeminiCostUsd(input: EstimateGeminiCostInput): GeminiCostEstimate | null {
    const resolved = resolveGeminiPricing(input.model, input.at, input.pricingOverrides);
    if (!resolved) {
        return null;
    }
    const partitioned = partitionBillableTokens(input);
    const useLongContext =
        resolved.rates.longContextAfter != null &&
        toNonNegativeInt(input.promptTokens) > resolved.rates.longContextAfter;
    const inputRate = useLongContext
        ? (resolved.rates.longContextInputPerMillion ?? resolved.rates.inputPerMillion)
        : resolved.rates.inputPerMillion;
    const outputRate = useLongContext
        ? (resolved.rates.longContextOutputPerMillion ?? resolved.rates.outputPerMillion)
        : resolved.rates.outputPerMillion;
    const cacheRate = useLongContext
        ? (resolved.rates.longContextCachedInputPerMillion ?? resolved.rates.cachedInputPerMillion)
        : resolved.rates.cachedInputPerMillion;
    const usd =
        (partitioned.uncachedPromptTokens * inputRate +
            partitioned.cacheTokens * cacheRate +
            partitioned.outputBillableTokens * outputRate) /
        1_000_000;
    return {
        usd,
        pricingVersion:
            resolved.source === 'custom' ? `${GEMINI_PRICING.asOf}+custom` : GEMINI_PRICING.asOf,
        matchedModel: resolved.modelId,
        uncachedPromptTokens: partitioned.uncachedPromptTokens,
        cacheTokens: partitioned.cacheTokens,
        outputBillableTokens: partitioned.outputBillableTokens,
    };
}

export function estimateCostFromParsedUsage(
    parsed: ParsedUsageMetadata,
    fallbackModel: string,
    pricingOverrides?: CustomModelPricingMap,
): GeminiCostEstimate | null {
    return estimateGeminiCostUsd({
        model: parsed.model || fallbackModel,
        promptTokens: parsed.promptTokens,
        cacheTokens: parsed.cacheTokens,
        completionTokens: parsed.completionTokens,
        thoughtsTokens: parsed.thoughtsTokens,
        toolUsePromptTokens: parsed.toolUsePromptTokens,
        totalTokens: parsed.totalTokens,
        pricingOverrides,
    });
}
