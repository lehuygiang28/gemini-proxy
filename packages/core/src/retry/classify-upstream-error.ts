import {
    ClassifiedUpstreamFailure,
    UPSTREAM_FAILURE_CLASS,
} from './types';

export { UPSTREAM_FAILURE_CLASS } from './types';
export type { ClassifiedUpstreamFailure } from './types';

const RETRY_AFTER_MIN_SECONDS = 1;
const RETRY_AFTER_MAX_SECONDS = 3600;

interface GoogleErrorBody {
    error?: {
        status?: string;
        message?: string;
        details?: Array<{ reason?: string }>;
    };
}

function getHeaderValue(
    headers: Headers | Record<string, string>,
    name: string,
): string | undefined {
    if (headers instanceof Headers) {
        return headers.get(name) ?? undefined;
    }
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === lowerName) {
            return value;
        }
    }
    return undefined;
}

function parseGoogleErrorBody(bodyText: string): GoogleErrorBody['error'] | undefined {
    if (bodyText.trim() === '') {
        return undefined;
    }
    try {
        const parsed = JSON.parse(bodyText) as GoogleErrorBody;
        return parsed.error;
    } catch {
        return undefined;
    }
}

function hasApiKeyInvalid(error: GoogleErrorBody['error'], bodyText: string): boolean {
    if (error?.status === 'API_KEY_INVALID') {
        return true;
    }
    if (error?.message?.includes('API_KEY_INVALID') === true) {
        return true;
    }
    if (error?.details?.some((detail) => detail.reason === 'API_KEY_INVALID') === true) {
        return true;
    }
    return bodyText.includes('API_KEY_INVALID');
}

function isSpendLimitBody(bodyText: string, message: string): boolean {
    const combined = `${bodyText} ${message}`.toLowerCase();
    if (combined.includes('spend')) {
        return true;
    }
    if (combined.includes('billing')) {
        return true;
    }
    if (/limit:\s*0/i.test(combined)) {
        return true;
    }
    if (/\blimit\s+0\b/i.test(combined)) {
        return true;
    }
    return false;
}

function parseRetryAfterSeconds(headerValue: string | undefined): number | null {
    if (headerValue == null || headerValue.trim() === '') {
        return null;
    }
    const trimmed = headerValue.trim();
    const asInteger = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(asInteger) && String(asInteger) === trimmed) {
        return Math.min(RETRY_AFTER_MAX_SECONDS, Math.max(RETRY_AFTER_MIN_SECONDS, asInteger));
    }
    const targetMs = Date.parse(trimmed);
    if (Number.isNaN(targetMs)) {
        return null;
    }
    const deltaSeconds = Math.ceil((targetMs - Date.now()) / 1000);
    if (deltaSeconds <= 0) {
        return RETRY_AFTER_MIN_SECONDS;
    }
    return Math.min(RETRY_AFTER_MAX_SECONDS, Math.max(RETRY_AFTER_MIN_SECONDS, deltaSeconds));
}

function isTransientStatus(status: number): boolean {
    return status === 408 || status === 409 || status === 423 || status >= 500;
}

function buildResult(
    failureClass: ClassifiedUpstreamFailure['class'],
    retryable: boolean,
    disableKey: boolean,
    retryAfterSeconds: number | null,
    message: string,
    status: number | undefined,
): ClassifiedUpstreamFailure {
    return {
        class: failureClass,
        retryable,
        disableKey,
        retryAfterSeconds,
        message,
        status,
    };
}

export function classifyUpstreamError(input: {
    readonly status: number | undefined;
    readonly headers: Headers | Record<string, string>;
    readonly bodyText: string;
}): ClassifiedUpstreamFailure {
    const { status, headers, bodyText } = input;
    const googleError = parseGoogleErrorBody(bodyText);
    const message = googleError?.message ?? (bodyText || 'upstream_error');
    if (status === undefined) {
        return buildResult(
            UPSTREAM_FAILURE_CLASS.transient,
            true,
            false,
            null,
            message,
            status,
        );
    }
    if (status === 400 || status === 404) {
        return buildResult(
            UPSTREAM_FAILURE_CLASS.client_invalid,
            false,
            false,
            null,
            message,
            status,
        );
    }
    if (status === 401) {
        return buildResult(UPSTREAM_FAILURE_CLASS.key_invalid, true, true, null, message, status);
    }
    if (status === 403) {
        if (hasApiKeyInvalid(googleError, bodyText)) {
            return buildResult(
                UPSTREAM_FAILURE_CLASS.key_invalid,
                true,
                true,
                null,
                message,
                status,
            );
        }
        return buildResult(
            UPSTREAM_FAILURE_CLASS.key_permission,
            true,
            false,
            null,
            message,
            status,
        );
    }
    if (status === 429) {
        const retryAfterSeconds = parseRetryAfterSeconds(getHeaderValue(headers, 'Retry-After'));
        if (isSpendLimitBody(bodyText, message)) {
            return buildResult(
                UPSTREAM_FAILURE_CLASS.spend_limit,
                true,
                false,
                null,
                message,
                status,
            );
        }
        return buildResult(
            UPSTREAM_FAILURE_CLASS.rate_limit,
            true,
            false,
            retryAfterSeconds,
            message,
            status,
        );
    }
    if (isTransientStatus(status)) {
        return buildResult(UPSTREAM_FAILURE_CLASS.transient, true, false, null, message, status);
    }
    if (status >= 400 && status < 500) {
        return buildResult(UPSTREAM_FAILURE_CLASS.unknown, false, false, null, message, status);
    }
    return buildResult(UPSTREAM_FAILURE_CLASS.unknown, false, false, null, message, status);
}
