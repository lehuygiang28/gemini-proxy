import { DataSanitizer } from './sanitizer';
import { UsageStreamParser, type ParsedUsageMetadata } from './usage-metadata-parser';
import type { ProxyApiFormat } from '../types';

export type UsageLogComplete = (
    usage: ParsedUsageMetadata | null,
    responseText: string | null,
) => Promise<void>;

/**
 * Forward the provider body to the client immediately while parsing usage
 * incrementally. Persist runs in flush() so the isolate stays alive for the
 * stream itself; waitUntil only covers the DB write.
 */
export function attachUsageLogging(params: {
    response: Response;
    headers: Headers;
    apiFormat: ProxyApiFormat;
    onComplete: UsageLogComplete;
    waitUntil: (operation: Promise<void>) => void;
}): Response {
    const { response, headers, apiFormat, onComplete, waitUntil } = params;
    const body = response.body;
    if (!body) {
        const persist = onComplete(null, null);
        waitUntil(persist);
        return new Response(null, { status: response.status, headers });
    }
    const parser = new UsageStreamParser(apiFormat);
    const decoder = new TextDecoder();
    let responseText = '';
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
            const persist = onComplete(parser.finish(), responseText || null);
            waitUntil(persist);
            await persist;
        },
    });
    return new Response(body.pipeThrough(transform), {
        status: response.status,
        headers,
    });
}
