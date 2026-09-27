import { describe, expect, it, vi } from 'vitest';
import {
    GEMINI_MODEL_PROBE_MESSAGE,
    probeGeminiModel,
} from './probe-gemini-model';

describe('probeGeminiModel', () => {
    it('posts a minimal generateContent request with "hi"', async () => {
        const fetchImpl = vi.fn(async (request: Request) => {
            expect(request.method).toBe('POST');
            expect(request.url).toBe(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
            );
            const body = JSON.parse(await request.text()) as {
                contents: Array<{ parts: Array<{ text: string }> }>;
            };
            expect(body.contents[0]?.parts[0]?.text).toBe(GEMINI_MODEL_PROBE_MESSAGE);
            expect(request.headers.get('x-goog-api-key')).toBe('AIzaSyTEST');
            return new Response(JSON.stringify({ candidates: [] }), { status: 200 });
        });
        const actual = await probeGeminiModel({
            apiKeyValue: 'AIzaSyTEST',
            modelId: 'models/gemini-2.0-flash',
            fetchImpl,
        });
        expect(actual).toEqual({ ok: true });
        expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it('returns upstream error details when generateContent fails', async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        error: { message: 'Model not found' },
                    }),
                    { status: 404 },
                ),
        );
        const actual = await probeGeminiModel({
            apiKeyValue: 'AIzaSyTEST',
            modelId: 'gemini-missing',
            fetchImpl,
        });
        expect(actual).toEqual({
            ok: false,
            status: 404,
            message: 'Model not found',
        });
    });

    it('rejects non-https gemini base urls', async () => {
        const actual = await probeGeminiModel({
            apiKeyValue: 'AIzaSyTEST',
            modelId: 'gemini-2.0-flash',
            geminiBaseUrl: 'http://evil.test/',
        });
        expect(actual).toEqual({ ok: false, message: 'invalid_gemini_base_url' });
    });
});
