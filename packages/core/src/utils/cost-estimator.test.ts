import { describe, expect, it } from 'vitest';
import { GEMINI_PRICING } from '../constants/gemini-pricing';
import { estimateGeminiCostUsd, partitionBillableTokens } from './cost-estimator';

describe('partitionBillableTokens', () => {
    it('does not double-count cache or add cache on top of prompt', () => {
        const parts = partitionBillableTokens({
            model: 'gemini-2.5-pro',
            promptTokens: 11500,
            cacheTokens: 10000,
            completionTokens: 1000,
            thoughtsTokens: 10000,
            toolUsePromptTokens: 0,
            totalTokens: 22500,
        });
        expect(parts.uncachedPromptTokens).toBe(1500);
        expect(parts.cacheTokens).toBe(10000);
        expect(parts.outputBillableTokens).toBe(11000);
    });

    it('does not add reasoning tokens that already sit inside completion', () => {
        const parts = partitionBillableTokens({
            model: 'openai-style',
            promptTokens: 1486,
            cacheTokens: 1408,
            completionTokens: 651,
            thoughtsTokens: 512,
            toolUsePromptTokens: 0,
            totalTokens: 2137,
        });
        expect(parts.uncachedPromptTokens).toBe(78);
        expect(parts.outputBillableTokens).toBe(651);
    });

    it('adds remainder thoughts when OpenAI-compat completion excludes thinking', () => {
        const parts = partitionBillableTokens({
            model: 'gemini-2.5-flash',
            promptTokens: 758,
            cacheTokens: 0,
            completionTokens: 102,
            thoughtsTokens: 0,
            toolUsePromptTokens: 0,
            totalTokens: 1725,
        });
        expect(parts.outputBillableTokens).toBe(967);
    });
});

describe('estimateGeminiCostUsd', () => {
    it('matches the Google cache-billing example formula on 2.5 Pro current rates', () => {
        const estimate = estimateGeminiCostUsd({
            model: 'models/gemini-2.5-pro',
            promptTokens: 11500,
            cacheTokens: 10000,
            completionTokens: 1000,
            thoughtsTokens: 10000,
            toolUsePromptTokens: 0,
            totalTokens: 22500,
        });
        expect(estimate).not.toBeNull();
        expect(estimate?.pricingVersion).toBe(GEMINI_PRICING.asOf);
        expect(estimate?.matchedModel).toBe('gemini-2.5-pro');
        const expected = (1500 * 1.25 + 10000 * 0.125 + 11000 * 10) / 1_000_000;
        expect(estimate?.usd).toBeCloseTo(expected, 10);
    });

    it('uses long-context Pro rates when prompt exceeds 200k', () => {
        const estimate = estimateGeminiCostUsd({
            model: 'gemini-2.5-pro',
            promptTokens: 200_001,
            cacheTokens: 0,
            completionTokens: 10,
            thoughtsTokens: 0,
            toolUsePromptTokens: 0,
            totalTokens: 200_011,
        });
        expect(estimate?.usd).toBeCloseTo((200_001 * 2.5 + 10 * 15) / 1_000_000, 10);
    });

    it('resolves preview aliases to the stable Flash rates', () => {
        const estimate = estimateGeminiCostUsd({
            model: 'gemini-2.5-flash-preview-05-20',
            promptTokens: 1_000_000,
            cacheTokens: 0,
            completionTokens: 0,
            thoughtsTokens: 0,
            toolUsePromptTokens: 0,
            totalTokens: 1_000_000,
        });
        expect(estimate?.matchedModel).toBe('gemini-2.5-flash');
        expect(estimate?.usd).toBeCloseTo(0.3, 10);
    });

    it('returns null for unknown models', () => {
        expect(
            estimateGeminiCostUsd({
                model: 'gpt-4o',
                promptTokens: 10,
                cacheTokens: 0,
                completionTokens: 10,
                thoughtsTokens: 0,
                toolUsePromptTokens: 0,
                totalTokens: 20,
            }),
        ).toBeNull();
    });

    it('does not bill tool-use tokens', () => {
        const withTool = estimateGeminiCostUsd({
            model: 'gemini-2.5-flash',
            promptTokens: 100,
            cacheTokens: 0,
            completionTokens: 10,
            thoughtsTokens: 0,
            toolUsePromptTokens: 5000,
            totalTokens: 5110,
        });
        const withoutTool = estimateGeminiCostUsd({
            model: 'gemini-2.5-flash',
            promptTokens: 100,
            cacheTokens: 0,
            completionTokens: 10,
            thoughtsTokens: 0,
            toolUsePromptTokens: 0,
            totalTokens: 110,
        });
        expect(withTool?.usd).toBe(withoutTool?.usd);
    });
});
