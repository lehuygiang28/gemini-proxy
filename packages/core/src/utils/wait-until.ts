import { Context } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import { BatchLoggerService } from '../services/batch-logger.service';

export async function flushAllLogBatches(c: Context) {
    try {
        // Try to use Hono's execution context first
        if (c?.executionCtx?.waitUntil) {
            c.executionCtx.waitUntil(BatchLoggerService.flushAllBatches());
            return;
        }
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
        // Try Vercel's waitUntil as fallback
        const { waitUntil } = await import('@vercel/functions');
        waitUntil(BatchLoggerService.flushAllBatches());
        return;
    } catch (err) {
        console.warn('Failed to use Vercel waitUntil:', err);
        await BatchLoggerService.flushAllBatches();
    }
}
