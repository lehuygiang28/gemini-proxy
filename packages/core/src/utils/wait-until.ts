import { Context } from 'hono';
import { BatchLoggerService } from '../services/batch-logger.service';

export async function flushAllLogBatches(c: Context) {
    try {
        // Ensure batched logs have a chance to complete in serverless
        c?.executionCtx?.waitUntil(BatchLoggerService.flushAllBatches());
    } catch (exCtxError) {
        try {
            const { waitUntil } = await import('@vercel/functions');
            waitUntil(BatchLoggerService.flushAllBatches());
        } catch (err) {
            console.warn(`
                Err when tried to waitUntil with execution context - ${exCtxError}`);
            console.warn(`Err when tried to waitUntil with vercel functions helper - ${err}`);
        }
    }
}
