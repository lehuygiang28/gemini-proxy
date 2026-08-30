import { describe, expect, it, vi } from 'vitest';
import { attachUsageLogging } from './usage-log-stream';

describe('attachUsageLogging', () => {
    it('forwards bytes immediately and reports usage after the stream ends', async () => {
        const payload = new TextEncoder().encode(
            JSON.stringify({
                usageMetadata: {
                    promptTokenCount: 4,
                    candidatesTokenCount: 2,
                    thoughtsTokenCount: 1,
                    totalTokenCount: 7,
                },
            }),
        );
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(payload);
                controller.close();
            },
        });
        const onComplete = vi.fn(async () => undefined);
        const waitUntil = vi.fn();
        const logged = attachUsageLogging({
            response: new Response(body, { status: 200 }),
            headers: new Headers({ 'content-type': 'application/json' }),
            apiFormat: 'gemini',
            onComplete,
            waitUntil,
        });
        const text = await logged.text();
        expect(JSON.parse(text).usageMetadata.promptTokenCount).toBe(4);
        expect(onComplete).toHaveBeenCalledOnce();
        const usage = onComplete.mock.calls[0]?.[0];
        expect(usage).toMatchObject({
            promptTokens: 4,
            completionTokens: 2,
            thoughtsTokens: 1,
            totalTokens: 7,
        });
        expect(waitUntil).toHaveBeenCalled();
    });
});
