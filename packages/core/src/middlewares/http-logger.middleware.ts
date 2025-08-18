import { Context, Next } from 'hono';
import { logger } from 'hono/logger';

/**
 * Middleware to log the HTTP request
 * @param c - The Hono context
 * @param next - The next middleware function
 * @returns The Hono context
 */
export function httpLoggerMiddleware(c: Context, next: Next) {
    const proxyRequestId = c.get('proxyRequestId');
    return logger((str) => console.log(`[${proxyRequestId}] ${str}`))(c, next);
}
