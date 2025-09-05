import { Context } from 'hono';
import type { HonoApp } from '../types';

/**
 * Safely extract body text for metadata parsing only
 * This should NOT consume the original request body to maintain pure proxy behavior
 */
export async function safelyExtractBodyText(c: Context<HonoApp>): Promise<string | null> {
    try {
        // Only extract for JSON content types that need metadata parsing
        const contentType = c.req.header('content-type');
        if (!contentType?.includes('application/json')) {
            return null;
        }

        // Check if request has a body
        const contentLength = c.req.header('content-length');
        if (!contentLength || contentLength === '0') {
            return null;
        }

        // Check if method supports body
        const method = c.req.method.toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
            return null;
        }

        // Try to clone safely - if it fails, don't extract (pure proxy approach)
        try {
            const clonedReq = c.req.raw.clone();
            const bodyText = await clonedReq.text();
            return bodyText || null;
        } catch (error) {
            // If cloning fails, don't extract - let the original request handle it
            console.warn('Cannot safely clone request body for metadata extraction, skipping');
            return null;
        }
    } catch (error) {
        console.warn('Failed to extract body text for metadata:', error);
        return null;
    }
}

/**
 * Check if a request has a body that can be consumed
 */
export function hasConsumableBody(request: Request): boolean {
    try {
        // Try to clone to check if body is available
        request.clone();
        return true;
    } catch {
        return false;
    }
}
