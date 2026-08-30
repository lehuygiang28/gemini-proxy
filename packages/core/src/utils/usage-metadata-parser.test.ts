import { describe, expect, it } from 'vitest';
import { UsageMetadataParser, UsageStreamParser } from './usage-metadata-parser';

const encoder = new TextEncoder();

describe('UsageMetadataParser Gemini native', () => {
    it('maps cache as a subset of prompt and keeps thoughts outside candidates', () => {
        const body = JSON.stringify({
            modelVersion: 'gemini-2.5-pro',
            responseId: 'resp-1',
            usageMetadata: {
                promptTokenCount: 11500,
                cachedContentTokenCount: 10000,
                candidatesTokenCount: 1000,
                thoughtsTokenCount: 10000,
                totalTokenCount: 22500,
            },
        });
        const parsed = UsageMetadataParser.parseFromResponseBody(body, 'gemini');
        expect(parsed).toMatchObject({
            promptTokens: 11500,
            cacheTokens: 10000,
            completionTokens: 1000,
            thoughtsTokens: 10000,
            toolUsePromptTokens: 0,
            totalTokens: 22500,
            model: 'gemini-2.5-pro',
            responseId: 'resp-1',
            parseError: false,
        });
        expect(parsed?.raw).toMatchObject({ thoughtsTokenCount: 10000 });
    });

    it('uses the last stream chunk including MAX_TOKENS finishReason', () => {
        const body = [
            'data: {"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":1,"totalTokenCount":11}}',
            'data: {"candidates":[{"finishReason":"MAX_TOKENS"}],"modelVersion":"gemini-2.5-flash","usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":40,"thoughtsTokenCount":20,"totalTokenCount":70}}',
            '',
        ].join('\n');
        const parsed = UsageMetadataParser.parseFromResponseBody(body, 'gemini');
        expect(parsed).toMatchObject({
            promptTokens: 10,
            completionTokens: 40,
            thoughtsTokens: 20,
            totalTokens: 70,
            model: 'gemini-2.5-flash',
        });
    });

    it('falls back to responseTokenCount when candidatesTokenCount is missing', () => {
        const body = JSON.stringify({
            usageMetadata: {
                promptTokenCount: 8,
                responseTokenCount: 3,
                totalTokenCount: 11,
            },
        });
        const parsed = UsageMetadataParser.parseFromResponseBody(body, 'gemini');
        expect(parsed?.completionTokens).toBe(3);
    });

    it('parses SSE JSON split across TCP chunks', () => {
        const parser = new UsageStreamParser('gemini');
        parser.push(encoder.encode('data: {"usageMetadata":{"promptTokenCount":4,"candi'));
        expect(parser.snapshot()).toBeNull();
        parser.push(
            encoder.encode(
                'datesTokenCount":2,"thoughtsTokenCount":5,"totalTokenCount":11}}\n',
            ),
        );
        const parsed = parser.finish();
        expect(parsed).toMatchObject({
            promptTokens: 4,
            completionTokens: 2,
            thoughtsTokens: 5,
            totalTokens: 11,
        });
    });
});

describe('UsageMetadataParser OpenAI-compat', () => {
    it('reads usage from a trailing empty-choices chunk', () => {
        const body = [
            'data: {"id":"chatcmpl-1","model":"gemini-2.5-flash","choices":[{"delta":{"content":"hi"},"finish_reason":"stop"}]}',
            'data: {"id":"chatcmpl-1","model":"gemini-2.5-flash","choices":[],"usage":{"prompt_tokens":758,"completion_tokens":102,"total_tokens":1725,"completion_tokens_details":{"reasoning_tokens":865}}}',
            'data: [DONE]',
            '',
        ].join('\n');
        const parsed = UsageMetadataParser.parseFromResponseBody(body, 'openai');
        expect(parsed).toMatchObject({
            promptTokens: 758,
            completionTokens: 102,
            thoughtsTokens: 865,
            totalTokens: 1725,
            model: 'gemini-2.5-flash',
            responseId: 'chatcmpl-1',
        });
    });

    it('reads cached_tokens as a subset of prompt_tokens', () => {
        const body = JSON.stringify({
            model: 'gemini-2.5-flash',
            usage: {
                prompt_tokens: 100,
                completion_tokens: 10,
                total_tokens: 110,
                prompt_tokens_details: { cached_tokens: 40 },
            },
        });
        const parsed = UsageMetadataParser.parseFromResponseBody(body, 'openai');
        expect(parsed?.cacheTokens).toBe(40);
        expect(parsed?.promptTokens).toBe(100);
    });
});
