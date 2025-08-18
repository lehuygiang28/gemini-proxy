/**
 * Sanitize sensitive data for logging purposes
 */

export interface SanitizeOptions {
    redactApiKeys?: boolean;
    redactTokens?: boolean;
    redactHeaders?: boolean;
    truncateLength?: number;
    redactUrls?: boolean;
}

export class DataSanitizer {
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

    private static readonly SENSITIVE_URL_PATTERNS = [
        /api_key=/i,
        /token=/i,
        /key=/i,
        /auth=/i,
        /password=/i,
    ];

    private static readonly DEFAULT_OPTIONS: SanitizeOptions = {
        redactApiKeys: true,
        redactTokens: true,
        redactHeaders: true,
        truncateLength: 1000,
        redactUrls: false,
    };

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
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.sanitizeKey(key, opts);
                const sanitizedValue = this.sanitizeObject(value, opts);
                sanitized[sanitizedKey] = sanitizedValue;
            }
            return sanitized;
        }

        return obj;
    }

    static sanitizeString(str: string, options: SanitizeOptions = {}): string {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        let sanitized = str;

        // Redact API keys and tokens
        if (opts.redactApiKeys || opts.redactTokens) {
            // Redact API keys (typically 40+ character alphanumeric strings)
            sanitized = sanitized.replace(/[a-zA-Z0-9]{40,}/g, '[REDACTED_API_KEY]');

            // Redact Bearer tokens
            sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9._-]+/g, 'Bearer [REDACTED_TOKEN]');
        }

        // Redact sensitive URL parameters
        if (opts.redactUrls) {
            sanitized = sanitized.replace(
                /([?&])(api_key|token|key|auth|password)=[^&]*/gi,
                '$1$2=[REDACTED]',
            );
        }

        // Truncate if too long
        if (opts.truncateLength && sanitized.length > opts.truncateLength) {
            sanitized = sanitized.substring(0, opts.truncateLength) + ' [TRUNCATED]';
        }

        return sanitized;
    }

    static sanitizeKey(key: string, options: SanitizeOptions = {}): string {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        // Check if key contains sensitive information
        const lowerKey = key.toLowerCase();
        if (
            opts.redactHeaders &&
            this.SENSITIVE_HEADERS.some((header) => lowerKey.includes(header))
        ) {
            return '[REDACTED_HEADER]';
        }

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

        // Sanitize headers
        if (sanitized.headers) {
            sanitized.headers = this.sanitizeHeaders(sanitized.headers, opts);
        }

        // Sanitize URL
        if (sanitized.url) {
            sanitized.url = this.sanitizeString(sanitized.url, opts);
        }

        // Sanitize body if it's a string
        if (sanitized.body && typeof sanitized.body === 'string') {
            sanitized.body = this.sanitizeString(sanitized.body, opts);
        }

        return sanitized;
    }

    static sanitizeResponseData(responseData: any, options: SanitizeOptions = {}): any {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        if (!responseData) return responseData;

        const sanitized = { ...responseData };

        // Sanitize headers
        if (sanitized.headers) {
            sanitized.headers = this.sanitizeHeaders(sanitized.headers, opts);
        }

        // Sanitize body if it's a string
        if (sanitized.body && typeof sanitized.body === 'string') {
            sanitized.body = this.sanitizeString(sanitized.body, opts);
        }

        return sanitized;
    }
}
