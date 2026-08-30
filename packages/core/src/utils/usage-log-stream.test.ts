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
        const logged = attachUsageLogging({
            response: new Response(body, { status: 200 }),
            headers: new Headers({ 'content-type': 'application/json' }),
            apiFormat: 'gemini',
            onComplete,
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
    });

    it('persists usage when the downstream reader cancels before EOF', async () => {
        const onComplete = vi.fn(async () => undefined);
        const logged = attachUsageLogging({
            response: new Response(
                new ReadableStream<Uint8Array>({
                    start(controller) {
                        controller.enqueue(
                            new TextEncoder().encode(
                                'data: {"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":1,"totalTokenCount":4}}\n',
                            ),
                        );
                    },
                }),
                { status: 200 },
            ),
            headers: new Headers({ 'content-type': 'text/event-stream' }),
            apiFormat: 'gemini',
            onComplete,
        });
        const reader = logged.body!.getReader();
        await reader.read();
        await reader.cancel();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onComplete).toHaveBeenCalledOnce();
        expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
            promptTokens: 3,
            completionTokens: 1,
            totalTokens: 4,
        });
    });

    it('registers background work for empty-body responses', async () => {
        const onComplete = vi.fn(async () => undefined);
        const registerBackground = vi.fn();
        attachUsageLogging({
            response: new Response(null, { status: 204 }),
            headers: new Headers(),
            apiFormat: 'gemini',
            onComplete,
            registerBackground,
        });
        expect(registerBackground).toHaveBeenCalledOnce();
        await registerBackground.mock.calls[0]?.[0];
        expect(onComplete).toHaveBeenCalledWith(null, null);
    });
});
