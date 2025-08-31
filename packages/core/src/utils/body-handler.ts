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
 * Create a request for retries - pure proxy approach
 * Always try to clone the original request, fallback to stored text only if absolutely necessary
 */
export function createRetryRequest(
    originalRequest: Request,
    storedBodyText?: string | null,
): Request {
    try {
        // Always try to clone the original request first (pure proxy)
        return originalRequest.clone();
    } catch (error) {
        // If cloning fails, check if we need a body
        const contentLength = originalRequest.headers.get('content-length');
        const method = originalRequest.method.toUpperCase();

        // If no body needed, create without body
        if (
            !contentLength ||
            contentLength === '0' ||
            method === 'GET' ||
            method === 'HEAD' ||
            method === 'OPTIONS'
        ) {
            return new Request(originalRequest.url, {
                method: originalRequest.method,
                headers: originalRequest.headers,
            });
        }

        // If we have stored body text, use it as fallback
        if (storedBodyText) {
            console.warn(
                'Using stored body text as fallback for retry (original body unavailable)',
            );
            return new Request(originalRequest.url, {
                method: originalRequest.method,
                headers: originalRequest.headers,
                body: storedBodyText,
            });
        }

        // Last resort: create without body
        console.warn('Creating retry request without body (original unavailable, no stored text)');
        return new Request(originalRequest.url, {
            method: originalRequest.method,
            headers: originalRequest.headers,
        });
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
