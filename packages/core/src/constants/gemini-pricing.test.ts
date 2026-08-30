import { describe, expect, it } from 'vitest';
import {
    GEMINI_PRICING,
    effectiveTokenRates,
    listBuiltinGemmaPricingRows,
    listBuiltinModelPricingRows,
    resolveGeminiPricing,
} from './gemini-pricing';
import { estimateGeminiCostUsd } from '../utils/cost-estimator';

const INTRO_DAY = new Date('2026-08-30T12:00:00.000Z');
const LAST_INTRO_DAY = new Date('2026-12-31T23:00:00.000Z');
const FIRST_STANDARD_DAY = new Date('2027-01-01T00:00:00.000Z');

describe('resolveGeminiPricing', () => {
    it('prices gemini-3.7-flash at the published intro rates through 2026-12-31', () => {
        const intro = resolveGeminiPricing('models/gemini-3.7-flash', INTRO_DAY);
        expect(intro).toMatchObject({
            modelId: 'gemini-3.7-flash',
            rates: { inputPerMillion: 0.75, outputPerMillion: 3.75, cachedInputPerMillion: 0.075 },
        });
        expect(
            resolveGeminiPricing('gemini-3.7-flash', LAST_INTRO_DAY)?.rates.inputPerMillion,
        ).toBe(0.75);
    });

    it('switches 3.6 and 3.7 Flash to $1.50/$7.50 on 2027-01-01', () => {
        for (const model of ['gemini-3.7-flash', 'gemini-3.6-flash'] as const) {
            const next = resolveGeminiPricing(model, FIRST_STANDARD_DAY);
            expect(next?.rates).toMatchObject({
                inputPerMillion: 1.5,
                outputPerMillion: 7.5,
                cachedInputPerMillion: 0.15,
            });
        }
    });

    it('does not leave 3.6 Flash on the old $1.50 list price during the intro window', () => {
        const rates = resolveGeminiPricing('gemini-3.6-flash', INTRO_DAY)?.rates;
        expect(rates?.inputPerMillion).toBe(0.75);
        expect(rates?.outputPerMillion).toBe(3.75);
    });

    it('maps pointer aliases to the current Flash/Pro rows', () => {
        expect(resolveGeminiPricing('gemini-flash-latest', INTRO_DAY)?.modelId).toBe(
            'gemini-3.7-flash',
        );
        expect(resolveGeminiPricing('gemini-flash-lite-latest')?.modelId).toBe(
            'gemini-3.5-flash-lite',
        );
        expect(resolveGeminiPricing('gemini-pro-latest')?.modelId).toBe('gemini-3.1-pro-preview');
    });

    it('matches dated computer-use and robotics IDs without stealing Flash rates', () => {
        expect(resolveGeminiPricing('gemini-2.5-computer-use-preview-10-2025')?.modelId).toBe(
            'gemini-2.5-computer-use',
        );
        expect(resolveGeminiPricing('gemini-robotics-er-2-preview')?.modelId).toBe(
            'gemini-robotics-er-2',
        );
        expect(resolveGeminiPricing('gemini-robotics-er-2-streaming-preview')?.modelId).toBe(
            'gemini-robotics-er-2',
        );
        expect(resolveGeminiPricing('gemini-robotics-er-1.6-preview')?.rates.inputPerMillion).toBe(
            1,
        );
    });

    it('returns null for Live, TTS, image-out, Omni, and embeddings instead of stealing a text row', () => {
        const skipped = [
            'gemini-3.5-live-translate-preview',
            'gemini-3.5-transcribe-live',
            'gemini-3.5-transcribe',
            'gemini-omni-1.1-flash',
            'gemini-omni-flash-preview',
            'gemini-3.1-flash-image',
            'gemini-3.1-flash-lite-image',
            'gemini-3.1-flash-tts-preview',
            'gemini-3.1-flash-live-preview',
            'gemini-3-pro-image',
            'gemini-2.5-flash-image',
            'gemini-2.5-flash-preview-tts',
            'gemini-2.5-pro-preview-tts',
            'gemini-2.5-flash-native-audio-preview-12-2025',
            'gemini-embedding-2',
            'gemini-embedding-001',
            'veo-3.1-generate-preview',
        ];
        for (const model of skipped) {
            expect(resolveGeminiPricing(model, INTRO_DAY), model).toBeNull();
        }
    });

    it('still matches 3.1 Pro custom-tools and 2.5 Flash dated previews', () => {
        expect(resolveGeminiPricing('gemini-3.1-pro-preview-customtools')?.modelId).toBe(
            'gemini-3.1-pro-preview',
        );
        expect(resolveGeminiPricing('gemini-2.5-flash-lite-preview-09-2025')?.modelId).toBe(
            'gemini-2.5-flash-lite',
        );
        expect(resolveGeminiPricing('gemini-3.5-flash')?.rates.outputPerMillion).toBe(9);
    });

    it('prices Gemma 4 models on the Gemini API', () => {
        expect(resolveGeminiPricing('gemma-4-26b-a4b-it')?.rates).toMatchObject({
            inputPerMillion: 0.042,
            outputPerMillion: 0.22,
            cachedInputPerMillion: 0.05,
        });
        expect(resolveGeminiPricing('gemma-4-31b-it')?.rates.inputPerMillion).toBe(0.09);
        expect(resolveGeminiPricing('gemma-4-31b-it')?.rates.outputPerMillion).toBe(0.34);
    });

    it('prices Gemma 3 and Gemma 2 families', () => {
        expect(resolveGeminiPricing('gemma-3-4b-it')?.modelId).toBe('gemma-3-4b-it');
        expect(resolveGeminiPricing('gemma-3-27b-it')?.rates.outputPerMillion).toBe(0.45);
        expect(resolveGeminiPricing('gemma-2-27b-it')?.rates.inputPerMillion).toBe(0.65);
        expect(resolveGeminiPricing('gemma-3n-e4b-it')?.rates.inputPerMillion).toBe(0.05);
    });

    it('maps gemma aliases without -it suffix', () => {
        expect(resolveGeminiPricing('gemma-3-4b')?.modelId).toBe('gemma-3-4b-it');
        expect(resolveGeminiPricing('gemma-4-26b-a4b')?.modelId).toBe('gemma-4-26b-a4b-it');
    });

    it('returns null for unknown gemini and gemma preview ids', () => {
        expect(resolveGeminiPricing('gemma-5-99b-it-preview')).toBeNull();
        expect(resolveGeminiPricing('gemini-9.9-ultra-preview-01-2099')).toBeNull();
    });

    it('lists all built-in Gemini and Gemma rows for dashboard', () => {
        const rows = listBuiltinModelPricingRows();
        const geminiRows = rows.filter((r) => r.family === 'gemini');
        const gemmaRows = rows.filter((r) => r.family === 'gemma');
        expect(geminiRows.length).toBeGreaterThanOrEqual(15);
        expect(gemmaRows.length).toBeGreaterThanOrEqual(12);
        expect(rows.map((r) => r.modelId)).toContain('gemini-3.7-flash');
        expect(rows.map((r) => r.modelId)).toContain('gemma-3-4b-it');
        expect(rows.map((r) => r.modelId)).toContain('gemma-4-26b-a4b-it');
    });

    it('keeps listBuiltinGemmaPricingRows as a gemma-only filter', () => {
        const all = listBuiltinModelPricingRows();
        const gemmaOnly = listBuiltinGemmaPricingRows();
        expect(gemmaOnly.length).toBe(all.filter((r) => r.family === 'gemma').length);
        expect(gemmaOnly.every((r) => r.family === 'gemma')).toBe(true);
    });

    it('prefers user overrides over built-in rates', () => {
        const resolved = resolveGeminiPricing('gemma-4-31b-it', INTRO_DAY, {
            'gemma-4-31b-it': { inputPerMillion: 0.5, outputPerMillion: 2.0 },
        });
        expect(resolved?.source).toBe('custom');
        expect(resolved?.rates.inputPerMillion).toBe(0.5);
    });
});

describe('effectiveTokenRates', () => {
    it('keeps intro rates on the inclusive through date', () => {
        const row = GEMINI_PRICING.models['gemini-3.7-flash'];
        expect(effectiveTokenRates(row, LAST_INTRO_DAY).inputPerMillion).toBe(0.75);
        expect(effectiveTokenRates(row, FIRST_STANDARD_DAY).inputPerMillion).toBe(1.5);
    });
});

describe('estimateGeminiCostUsd intro Flash', () => {
    it('estimates 3.7 Flash with intro cache partition', () => {
        const estimate = estimateGeminiCostUsd({
            model: 'gemini-3.7-flash',
            promptTokens: 10_000,
            cacheTokens: 8_000,
            completionTokens: 500,
            thoughtsTokens: 1_500,
            toolUsePromptTokens: 0,
            totalTokens: 12_000,
            at: INTRO_DAY,
        });
        expect(estimate?.matchedModel).toBe('gemini-3.7-flash');
        const expected = (2_000 * 0.75 + 8_000 * 0.075 + 2_000 * 3.75) / 1_000_000;
        expect(estimate?.usd).toBeCloseTo(expected, 10);
    });
});
