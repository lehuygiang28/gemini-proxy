import { Context } from 'hono';
import { getRuntimeKey } from 'hono/adapter';
import { waitUntil as vercelWaitUntil } from '@vercel/functions';

/**
 * Execute operation with proper wait-until fallback handling
 * This ensures operations complete before serverless function shutdown
 */
export async function executeWithWaitUntil(c: Context, operation: Promise<void>): Promise<void> {
    try {
        // Try Hono's execution context first
        const { waitUntil } = c.executionCtx || {};
        if (waitUntil) {
            waitUntil(operation);
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
        vercelWaitUntil(operation);
        return;
    } catch (vercelError) {
        console.warn('Failed to use Vercel waitUntil:', vercelError);
    }

    // Final fallback: execute immediately
    try {
        await operation;
    } catch (error) {
        console.error('Operation execution failed:', error);
    }
}
