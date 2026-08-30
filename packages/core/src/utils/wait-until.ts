import { Context } from 'hono';
import { getRuntimeKey } from 'hono/adapter';

/**
 * Keep a background promise alive on Cloudflare / Vercel after the handler returns.
 * Falls back to awaiting the promise on long-lived Node servers.
 */
export async function executeWithWaitUntil(c: Context, operation: Promise<void>): Promise<void> {
    try {
        c.executionCtx.waitUntil(operation);
        return;
    } catch (exCtxError) {
        if (
            exCtxError instanceof Error &&
            exCtxError.message.includes('This context has no ExecutionContext')
        ) {
            console.warn(
                `This context has no ExecutionContext - '${getRuntimeKey()}', trying '@vercel/functions' instead`,
            );
        } else {
            console.warn('Failed to use Hono execution context:', exCtxError);
        }
    }

    try {
        const { waitUntil } = await import('@vercel/functions');
        waitUntil(operation);
        return;
    } catch (vercelError) {
        console.warn('Failed to use Vercel waitUntil:', vercelError);
    }

    try {
        await operation;
    } catch (error) {
        console.error('Operation execution failed:', error);
    }
}

const RETRY_DELAYS_MS = [200, 800] as const;

export async function persistWithRetry(operation: () => Promise<void>): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
        try {
            await operation();
            return;
        } catch (error) {
            lastError = error;
            const delay = RETRY_DELAYS_MS[attempt];
            if (delay != null) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    console.error('Persist failed after retries:', lastError);
    throw lastError;
}
