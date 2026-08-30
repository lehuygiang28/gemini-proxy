import { DataSanitizer } from './sanitizer';
import { UsageStreamParser, type ParsedUsageMetadata } from './usage-metadata-parser';
import type { ProxyApiFormat } from '../types';

export type UsageLogComplete = (
    usage: ParsedUsageMetadata | null,
    responseText: string | null,
) => Promise<void>;

/**
 * Forward the provider body to the client immediately while parsing usage
 * incrementally. Persist runs in flush() / cancel() so the isolate stays alive
 * for the stream itself; callers should register only DB work with waitUntil.
 */
export function attachUsageLogging(params: {
    response: Response;
    headers: Headers;
    apiFormat: ProxyApiFormat;
    onComplete: UsageLogComplete;
    /** Register background persist work (e.g. waitUntil) for empty-body responses. */
    registerBackground?: (work: Promise<void>) => void;
}): Response {
    const { response, headers, apiFormat, onComplete, registerBackground } = params;
    const body = response.body;
    if (!body) {
        const work = Promise.resolve(onComplete(null, null));
        if (registerBackground) {
            registerBackground(work);
        } else {
            void work;
        }
        return new Response(null, { status: response.status, headers });
    }
    const parser = new UsageStreamParser(apiFormat);
    const decoder = new TextDecoder();
    let responseText = '';
    let settled = false;
    const settle = async (): Promise<void> => {
        if (settled) {
            return;
        }
        settled = true;
        await onComplete(parser.finish(), responseText || null);
    };
    const transform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
            controller.enqueue(chunk);
            parser.push(chunk);
            if (responseText.length >= DataSanitizer.PAYLOAD_BODY_MAX_CHARS) {
                return;
            }
            responseText += decoder.decode(chunk, { stream: true });
            if (responseText.length > DataSanitizer.PAYLOAD_BODY_MAX_CHARS) {
                responseText = responseText.slice(0, DataSanitizer.PAYLOAD_BODY_MAX_CHARS);
            }
        },
        async flush() {
            await settle();
        },
    });
    const upstream = body.pipeThrough(transform);
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const loggedBody = new ReadableStream<Uint8Array>({
        async start(controller) {
            reader = upstream.getReader();
            try {
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        return;
                    }
                    controller.enqueue(value);
                }
            } catch (error) {
                await settle();
                controller.error(error);
            }
        },
        async cancel() {
            await settle();
            if (reader) {
                await reader.cancel();
                reader = null;
            }
        },
    });
    return new Response(loggedBody, {
        status: response.status,
        headers,
    });
}
