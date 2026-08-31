/**
 * Sanitize sensitive data for logging purposes
 */

export interface SanitizeOptions {
    redactApiKeys?: boolean;
    redactTokens?: boolean;
    redactHeaders?: boolean;
    truncateLength?: number;
    redactUrls?: boolean;
    extraFieldNames?: string[];
}

export type SanitizedPayloadBody = {
    body: string | Record<string, unknown> | unknown[];
    body_truncated: boolean;
    body_chars: number;
};

export class DataSanitizer {
    /** Max chars for detailed request/response body capture (64 KiB). */
    static readonly PAYLOAD_BODY_MAX_CHARS = 64 * 1024;

    private static readonly SENSITIVE_HEADERS = [
        'authorization',
        'x-goog-api-key',
        'x-api-key',
        'api-key',
        'token',
        'cookie',
        'set-cookie',
        'x-auth-token',
        'x-access-token',
        'x-refresh-token',
    ];

    private static readonly SENSITIVE_JSON_FIELDS = [
        'authorization',
        'api_key',
        'apikey',
        'api_key_value',
        'proxy_key_value',
        'proxy_api_key',
        'x-goog-api-key',
        'x-api-key',
        'password',
        'secret',
        'token',
        'access_token',
        'refresh_token',
        'private_key',
        'cookie',
    ];

    private static readonly SECRET_STRING_PATTERNS: readonly RegExp[] = [
        /Bearer\s+[A-Za-z0-9._-]+/gi,
        /\bsk-[A-Za-z0-9]{20,}\b/g,
        /\bAIza[A-Za-z0-9_-]{10,}\b/g,
        /\bAQ\.[A-Za-z0-9._-]{10,}\b/g,
    ];

    private static readonly DEFAULT_OPTIONS: SanitizeOptions = {
        redactApiKeys: true,
        redactTokens: true,
        redactHeaders: true,
        truncateLength: 1000,
        redactUrls: false,
    };

    private static isSensitiveJsonField(key: string, extraFieldNames: string[] = []): boolean {
        const lower = key.toLowerCase();
        const names = [
            ...this.SENSITIVE_JSON_FIELDS,
            ...extraFieldNames.map((name) => name.toLowerCase()),
        ];
        return names.some((name) => lower === name || lower.endsWith(name));
    }

    private static redactSecretStrings(value: string): string {
        let redacted = value;
        for (const pattern of this.SECRET_STRING_PATTERNS) {
            redacted = redacted.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]');
        }
        return redacted;
    }

    private static walkJson(value: unknown, extraFieldNames: string[]): unknown {
        if (typeof value === 'string') {
            return this.redactSecretStrings(value);
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.walkJson(item, extraFieldNames));
        }
        if (value !== null && typeof value === 'object') {
            const sanitized: Record<string, unknown> = {};
            for (const [key, child] of Object.entries(value)) {
                sanitized[key] = this.isSensitiveJsonField(key, extraFieldNames)
                    ? '[REDACTED]'
                    : this.walkJson(child, extraFieldNames);
            }
            return sanitized;
        }
        return value;
    }

    static sanitizeObject(obj: any, options: SanitizeOptions = {}): any {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj === 'string') {
            return this.sanitizeString(obj, opts);
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeObject(item, opts));
        }

        if (typeof obj === 'object') {
            const sanitized: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
                if (this.isSensitiveJsonField(key, opts.extraFieldNames)) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = this.sanitizeObject(value, opts);
                }
            }
            return sanitized;
        }

        return obj;
    }

    static sanitizeString(str: string, options: SanitizeOptions = {}): string {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        let sanitized = str;

        if (opts.redactApiKeys || opts.redactTokens) {
            sanitized = this.redactSecretStrings(sanitized);
        }

        if (opts.redactUrls) {
            sanitized = sanitized.replace(
                /([?&])(api_key|token|key|auth|password)=[^&]*/gi,
                '$1$2=[REDACTED]',
            );
        }

        if (opts.truncateLength && sanitized.length > opts.truncateLength) {
            sanitized = sanitized.substring(0, opts.truncateLength) + ' [TRUNCATED]';
        }

        return sanitized;
    }

    static sanitizeKey(key: string, _options: SanitizeOptions = {}): string {
        return key;
    }

    static sanitizeHeaders(
        headers: Record<string, string>,
        options: SanitizeOptions = {},
    ): Record<string, string> {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        const sanitized: Record<string, string> = {};

        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();

            if (
                opts.redactHeaders &&
                this.SENSITIVE_HEADERS.some((header) => lowerKey.includes(header))
            ) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = this.sanitizeString(value, opts);
            }
        }

        return sanitized;
    }

    static sanitizeRequestData(requestData: any, options: SanitizeOptions = {}): any {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        if (!requestData) return requestData;

        const sanitized = { ...requestData };
        const preservedBody = sanitized.body;
        const preservedTruncated = sanitized.body_truncated;
        const preservedChars = sanitized.body_chars;

        if (sanitized.headers) {
            sanitized.headers = this.sanitizeHeaders(sanitized.headers, opts);
        }

        if (sanitized.url) {
            sanitized.url = this.sanitizeString(sanitized.url, opts);
        }

        if (preservedBody !== undefined) {
            sanitized.body = preservedBody;
            sanitized.body_truncated = preservedTruncated;
            sanitized.body_chars = preservedChars;
        }

        return sanitized;
    }

    static sanitizeResponseData(responseData: any, options: SanitizeOptions = {}): any {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        if (!responseData) return responseData;

        const sanitized = { ...responseData };
        const preservedBody = sanitized.body;
        const preservedTruncated = sanitized.body_truncated;
        const preservedChars = sanitized.body_chars;

        if (sanitized.headers) {
            sanitized.headers = this.sanitizeHeaders(sanitized.headers, opts);
        }

        if (preservedBody !== undefined) {
            sanitized.body = preservedBody;
            sanitized.body_truncated = preservedTruncated;
            sanitized.body_chars = preservedChars;
        }

        return sanitized;
    }

    /**
     * Prepare a request/response payload body for storage.
     * Field-name walk after JSON parse, then explicit secret regexes. Truncates to maxChars.
     */
    static sanitizePayloadBody(
        text: string,
        maxChars: number = DataSanitizer.PAYLOAD_BODY_MAX_CHARS,
        options?: { extraFieldNames?: string[] },
    ): SanitizedPayloadBody {
        const extraFieldNames = options?.extraFieldNames ?? [];
        let body: string | Record<string, unknown> | unknown[] = text;
        try {
            const parsed: unknown = JSON.parse(text);
            if (parsed !== null && typeof parsed === 'object') {
                body = this.walkJson(parsed, extraFieldNames) as
                    | Record<string, unknown>
                    | unknown[];
            } else if (typeof parsed === 'string') {
                body = this.redactSecretStrings(parsed);
            }
        } catch {
            body = this.redactSecretStrings(text);
        }

        const serialized = typeof body === 'string' ? body : JSON.stringify(body);
        const originalLength = serialized.length;
        const body_truncated = originalLength > maxChars;
        if (body_truncated) {
            body = serialized.substring(0, maxChars);
        }
        return {
            body,
            body_truncated,
            body_chars: originalLength,
        };
    }
}
