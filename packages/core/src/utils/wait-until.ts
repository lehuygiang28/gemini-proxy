import { Context } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import { computeRetryDelayMs } from '../retry/retry-delay';

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

const FINALIZE_ATTEMPTS = 3;
const FINALIZE_RETRY_CAP_MS = 2_000;

function finalizeRetryDelayMs(attempt: number): number {
    if (process.env.VITEST) {
        return 0;
    }
    return Math.floor(
        computeRetryDelayMs({
            attempt,
            baseDelayMs: 200,
            maxDelayMs: FINALIZE_RETRY_CAP_MS,
            random: Math.random,
        }),
    );
}

export async function persistWithRetry(operation: () => Promise<void>): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < FINALIZE_ATTEMPTS; attempt++) {
        try {
            await operation();
            return;
        } catch (error) {
            lastError = error;
            if (attempt < FINALIZE_ATTEMPTS - 1) {
                const delayMs = finalizeRetryDelayMs(attempt);
                if (delayMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }
    }
    console.error('Persist failed after retries:', lastError);
    throw lastError;
}
