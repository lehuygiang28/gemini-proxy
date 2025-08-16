import type { Context } from 'hono';
import parseJson, { JSONError } from 'parse-json';

// Type definitions for body types
export type BodyType =
    | 'json'
    | 'form'
    | 'urlencoded'
    | 'text'
    | 'binary'
    | 'stream'
    | 'blob'
    | 'arraybuffer'
    | 'null'
    | 'undefined'
    | 'unknown'
    | 'error';

// Interface for body detection result
export interface BodyDetectionResult {
    type: BodyType;
    confidence: 'high' | 'medium' | 'low';
    contentType?: string;
    constructorName?: string;
    rawType?: string;
    isStream: boolean;
    canParse: boolean;
    suggestedParser: 'json' | 'formData' | 'text' | 'arrayBuffer' | 'raw';
}

// Interface for parsed body result
export interface ParsedBodyResult<T = any> {
    success: boolean;
    data?: T;
    type: BodyType;
    error?: string;
    originalType: BodyType;
}

/**
 * Sanitizes and validates JSON string before parsing
 */
function sanitizeJsonString(text: string): string {
    // Remove any leading/trailing whitespace
    let sanitized = text.trim();

    // If it's already a valid JSON object/array, return as is
    if (
        (sanitized.startsWith('{') && sanitized.endsWith('}')) ||
        (sanitized.startsWith('[') && sanitized.endsWith(']'))
    ) {
        return sanitized;
    }

    // Try to extract JSON from common patterns
    // Handle cases where JSON might be wrapped in other content
    const jsonMatch = sanitized.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
        return jsonMatch[0];
    }

    return sanitized;
}

/**
 * Attempts to fix common JSON formatting issues
 */
function fixCommonJsonIssues(text: string): string {
    let fixed = text;

    // Fix single quotes to double quotes for property names
    fixed = fixed.replace(/(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*):/g, '$1"$2"$3:');

    // Fix single quotes around string values
    fixed = fixed.replace(/:\s*'([^']*)'/g, ': "$1"');

    // Fix unquoted string values (basic fix) - but be more careful
    fixed = fixed.replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*[,}])/g, ': "$1"$2');

    // Remove trailing commas before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    return fixed;
}

/**
 * Safely parses JSON with multiple fallback strategies
 */
function safeJsonParse(text: string): { success: boolean; data?: any; error?: string } {
    if (!text || typeof text !== 'string') {
        return { success: false, error: 'Invalid input: not a string' };
    }

    // Strategy 1: Try parsing as-is
    try {
        const data = parseJson(text);
        return { success: true, data };
    } catch (error) {
        // Continue to next strategy
    }

    // Strategy 2: Try sanitizing the JSON
    try {
        const sanitized = sanitizeJsonString(text);
        const data = parseJson(sanitized);
        return { success: true, data };
    } catch (error) {
        // Continue to next strategy
    }

    // Strategy 3: Try fixing common issues
    try {
        const fixed = fixCommonJsonIssues(text);
        const data = parseJson(fixed);
        return { success: true, data };
    } catch (error) {
        // Continue to next strategy
    }

    // Strategy 4: Try native JSON.parse as last resort
    try {
        const data = JSON.parse(text);
        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown JSON parsing error',
        };
    }
}

/**
 * Creates a cloned request to avoid body consumption issues
 * This ensures the original request can still be used by other parts of the application
 */
function createClonedRequest(c: Context): Request {
    return c.req.raw.clone();
}

/**
 * Detects the actual body type using multiple methods for accuracy
 * Uses a cloned request to avoid consuming the original request body
 */
export function detectBodyType(c: Context): BodyDetectionResult {
    const clonedReq = createClonedRequest(c);
    const contentType =
        clonedReq.headers.get('Content-Type') || clonedReq.headers.get('content-type');
    const body = clonedReq.body;

    // Method 1: Runtime constructor detection (most accurate)
    const constructorName = body?.constructor?.name?.toLowerCase();
    const rawType = typeof body;

    let detectedType: BodyType = 'unknown';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let isStream = false;
    let canParse = false;
    let suggestedParser: 'json' | 'formData' | 'text' | 'arrayBuffer' | 'raw' = 'raw';

    // Check for null/undefined first
    if (body === null) {
        detectedType = 'null';
        confidence = 'high';
        canParse = false;
    } else if (body === undefined) {
        detectedType = 'undefined';
        confidence = 'high';
        canParse = false;
    } else {
        // Runtime type detection
        if (constructorName?.includes('readablestream')) {
            detectedType = 'stream';
            confidence = 'high';
            isStream = true;
            canParse = true;

            // For streams, use Content-Type to suggest parser
            if (contentType?.includes('application/json')) {
                suggestedParser = 'json';
            } else if (
                contentType?.includes('multipart/form-data') ||
                contentType?.includes('application/x-www-form-urlencoded')
            ) {
                suggestedParser = 'formData';
            } else if (contentType?.includes('text/')) {
                suggestedParser = 'text';
            } else {
                suggestedParser = 'arrayBuffer';
            }
        } else if (constructorName?.includes('formdata')) {
            detectedType = 'form';
            confidence = 'high';
            canParse = true;
            suggestedParser = 'formData';
        } else if (constructorName?.includes('urlsearchparams')) {
            detectedType = 'urlencoded';
            confidence = 'high';
            canParse = true;
            suggestedParser = 'formData';
        } else if (constructorName?.includes('blob')) {
            detectedType = 'blob';
            confidence = 'high';
            canParse = true;
            suggestedParser = 'arrayBuffer';
        } else if (constructorName?.includes('arraybuffer')) {
            detectedType = 'arraybuffer';
            confidence = 'high';
            canParse = true;
            suggestedParser = 'arrayBuffer';
        } else if (rawType === 'string') {
            detectedType = 'text';
            confidence = 'high';
            canParse = true;
            suggestedParser = 'text';
        } else if (rawType === 'object') {
            detectedType = 'json';
            confidence = 'medium';
            canParse = true;
            suggestedParser = 'json';
        } else {
            detectedType = 'unknown';
            confidence = 'low';
            canParse = false;
        }
    }

    return {
        type: detectedType,
        confidence,
        contentType: contentType || undefined,
        constructorName,
        rawType,
        isStream,
        canParse,
        suggestedParser,
    };
}

/**
 * Safely parses the body based on detected type
 * Uses cloned requests to avoid consuming the original request body
 */
export async function parseBody<T = any>(c: Context): Promise<ParsedBodyResult<T>> {
    const detection = detectBodyType(c);

    try {
        let data: T | undefined;

        // Create a fresh clone for parsing to avoid body consumption issues
        const parseReq = createClonedRequest(c);

        switch (detection.suggestedParser) {
            case 'json':
                data = (await parseReq.json()) as T;
                break;
            case 'formData':
                data = (await parseReq.formData()) as T;
                break;
            case 'text':
                data = (await parseReq.text()) as T;
                break;
            case 'arrayBuffer':
                data = (await parseReq.arrayBuffer()) as T;
                break;
            case 'raw':
            default:
                data = parseReq.body as T;
                break;
        }

        return {
            success: true,
            data,
            type: detection.type,
            originalType: detection.type,
        };
    } catch (error) {
        // Try to parse as text with improved JSON handling
        // Create another fresh clone for fallback parsing
        try {
            const fallbackReq = createClonedRequest(c);
            const text = await fallbackReq.text();

            // Use the safe JSON parser with multiple fallback strategies
            const jsonResult = safeJsonParse(text);

            if (jsonResult.success) {
                return {
                    success: true,
                    data: jsonResult.data as T,
                    type: 'json',
                    originalType: 'text',
                };
            } else {
                // If JSON parsing fails, return as plain text
                return {
                    success: true,
                    data: text as T,
                    type: 'text',
                    originalType: 'text',
                };
            }
        } catch (fallbackError) {
            // Log the original error for debugging
            if (error instanceof JSONError) {
                console.error('JSON parsing error:', error.message);
            }

            // Log the fallback error if different
            if (
                fallbackError instanceof Error &&
                error instanceof Error &&
                fallbackError.message !== error.message
            ) {
                console.error('Fallback parsing error:', fallbackError.message);
            }

            return {
                success: false,
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown parsing error',
                originalType: detection.type,
            };
        }
    }
}

/**
 * Type-safe body parser with specific type expectations
 * Uses cloned requests to avoid consuming the original request body
 */
export async function parseBodyAs<T>(
    c: Context,
    expectedType: 'json' | 'form' | 'text' | 'binary',
): Promise<ParsedBodyResult<T>> {
    const detection = detectBodyType(c);

    // Check if the detected type matches expected type
    if (detection.type !== expectedType && detection.type !== 'stream') {
        return {
            success: false,
            type: detection.type,
            error: `Expected ${expectedType} but got ${detection.type}`,
            originalType: detection.type,
        };
    }

    return parseBody<T>(c);
}

/**
 * Utility to get detailed body information for debugging
 * Uses cloned requests to avoid consuming the original request body
 */
export function getBodyInfo(c: Context) {
    const clonedReq = createClonedRequest(c);
    const detection = detectBodyType(c);
    const contentType =
        clonedReq.headers.get('Content-Type') || clonedReq.headers.get('content-type');
    const contentLength =
        clonedReq.headers.get('Content-Length') || clonedReq.headers.get('content-length');
    const body = clonedReq.body;

    return {
        detection,
        headers: {
            contentType,
            contentLength,
            userAgent: c.req.header('User-Agent'),
            accept: c.req.header('Accept'),
        },
        body: {
            exists: body !== null && body !== undefined,
            constructor: body?.constructor?.name,
            rawType: typeof body,
            isStream: detection.isStream,
            canParse: detection.canParse,
        },
        suggestedAction: detection.suggestedParser,
    };
}

/**
 * Type guard to check if body is a specific type
 */
export function isBodyType(c: Context, type: BodyType): boolean {
    return detectBodyType(c).type === type;
}

/**
 * Type guard to check if body can be parsed
 */
export function canParseBody(c: Context): boolean {
    return detectBodyType(c).canParse;
}

/**
 * Type guard to check if body is a stream
 */
export function isStreamBody(c: Context): boolean {
    return detectBodyType(c).isStream;
}

/**
 * Creates a reusable request that can be safely passed to other proxies or services
 * This function ensures the original request body is not consumed and creates a fresh clone
 * that can be used multiple times without body consumption issues
 */
export function createReusableRequest(c: Context): Request {
    return createClonedRequest(c);
}

/**
 * Creates multiple reusable requests for different purposes
 * Useful when you need to parse the body multiple times or pass to different services
 */
export function createMultipleReusableRequests(c: Context, count: number = 2): Request[] {
    return Array.from({ length: count }, () => createClonedRequest(c));
}

/**
 * Safely forwards a request to another service while preserving the original
 * This ensures the original request can still be used by other parts of the application
 */
export async function forwardRequestSafely(
    c: Context,
    targetUrl: string,
    options?: RequestInit,
): Promise<Response> {
    const clonedReq = createClonedRequest(c);

    // Create a new request with the same body and headers
    const forwardReq = new Request(targetUrl, {
        method: clonedReq.method,
        headers: clonedReq.headers,
        body: clonedReq.body,
        ...options,
    });

    return fetch(forwardReq);
}

/**
 * Utility function to debug JSON parsing issues
 * Returns detailed information about the JSON string and any parsing errors
 */
export function debugJsonParsing(text: string): {
    isValid: boolean;
    error?: string;
    position?: number;
    line?: number;
    column?: number;
    preview?: string;
    suggestions?: string[];
} {
    if (!text || typeof text !== 'string') {
        return {
            isValid: false,
            error: 'Input is not a string',
            suggestions: ['Ensure the input is a valid string'],
        };
    }

    try {
        // Try parsing with parse-json first for detailed error info
        parseJson(text);
        return { isValid: true };
    } catch (error) {
        if (error instanceof JSONError) {
            // Extract position from error message if available
            const positionMatch = error.message.match(/position (\d+)/);
            const position = positionMatch ? parseInt(positionMatch[1], 10) : 0;

            const lines = text.split('\n');
            let line = 1;
            let column = position + 1;
            let currentPos = 0;

            // Calculate line and column
            for (let i = 0; i < lines.length; i++) {
                if (currentPos + lines[i].length >= position) {
                    line = i + 1;
                    column = position - currentPos + 1;
                    break;
                }
                currentPos += lines[i].length + 1; // +1 for newline
            }

            const preview = text.substring(Math.max(0, position - 20), position + 20);
            const suggestions = [];

            // Provide specific suggestions based on error type
            if (error.message.includes('double-quoted property name')) {
                suggestions.push('Ensure all property names are enclosed in double quotes');
                suggestions.push('Check for single quotes around property names');
                suggestions.push('Verify there are no unquoted identifiers');
            } else if (error.message.includes('Unexpected token')) {
                suggestions.push('Check for missing commas between properties');
                suggestions.push('Verify all brackets and braces are properly closed');
                suggestions.push('Look for trailing commas before closing brackets');
            } else if (error.message.includes('Unexpected end')) {
                suggestions.push('Check for incomplete JSON structure');
                suggestions.push('Verify all opening brackets have matching closing brackets');
            }

            return {
                isValid: false,
                error: error.message,
                position,
                line,
                column,
                preview,
                suggestions,
            };
        }

        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Unknown parsing error',
            suggestions: ['Try validating the JSON with a JSON validator'],
        };
    }
}
