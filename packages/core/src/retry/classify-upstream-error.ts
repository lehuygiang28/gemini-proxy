import { ClassifiedUpstreamFailure, UPSTREAM_FAILURE_CLASS } from './types';

export { UPSTREAM_FAILURE_CLASS } from './types';
export type { ClassifiedUpstreamFailure } from './types';

const RETRY_AFTER_MIN_SECONDS = 1;
const RETRY_AFTER_MAX_SECONDS = 3600;

interface GoogleErrorDetail {
    '@type'?: string;
    reason?: string;
    retryDelay?: string | { seconds?: number; nanos?: number };
    metadata?: Record<string, string | undefined>;
    violations?: Array<{ subject?: string; description?: string }>;
}

interface GoogleErrorBody {
    error?: {
        status?: string;
        message?: string;
        details?: GoogleErrorDetail[] | unknown;
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

function asDetails(error: GoogleErrorBody['error']): GoogleErrorDetail[] {
    return Array.isArray(error?.details) ? error.details : [];
}

function hasApiKeyInvalid(error: GoogleErrorBody['error'], bodyText: string): boolean {
    if (error?.status === 'API_KEY_INVALID') {
        return true;
    }
    if (error?.message?.includes('API_KEY_INVALID') === true) {
        return true;
    }
    if (asDetails(error).some((detail) => detail.reason === 'API_KEY_INVALID')) {
        return true;
    }
    return bodyText.includes('API_KEY_INVALID');
}

function detailType(detail: GoogleErrorDetail): string {
    return (detail['@type'] ?? '').toLowerCase();
}

function parseProtobufDurationSeconds(value: unknown): number | null {
    if (typeof value === 'string') {
        const match = /^(\d+(?:\.\d+)?)s$/.exec(value.trim());
        if (!match) {
            return null;
        }
        const seconds = Number(match[1]);
        if (!Number.isFinite(seconds)) {
            return null;
        }
        return clampRetryAfterSeconds(Math.ceil(seconds));
    }
    if (value && typeof value === 'object' && 'seconds' in value) {
        const seconds = Number((value as { seconds?: number }).seconds);
        if (!Number.isFinite(seconds)) {
            return null;
        }
        return clampRetryAfterSeconds(Math.ceil(seconds));
    }
    return null;
}

function clampRetryAfterSeconds(seconds: number): number {
    return Math.min(RETRY_AFTER_MAX_SECONDS, Math.max(RETRY_AFTER_MIN_SECONDS, seconds));
}

function parseRetryAfterSeconds(headerValue: string | undefined): number | null {
    if (headerValue == null || headerValue.trim() === '') {
        return null;
    }
    const trimmed = headerValue.trim();
    if (/^\d+$/.test(trimmed)) {
        return clampRetryAfterSeconds(Number.parseInt(trimmed, 10));
    }
    const targetMs = Date.parse(trimmed);
    if (Number.isNaN(targetMs)) {
        return null;
    }
    const deltaSeconds = Math.ceil((targetMs - Date.now()) / 1000);
    if (deltaSeconds <= 0) {
        return RETRY_AFTER_MIN_SECONDS;
    }
    return deltaSeconds;
}

function parseRetryInfoSeconds(details: GoogleErrorDetail[]): number | null {
    let latest: number | null = null;
    for (const detail of details) {
        if (!detailType(detail).includes('retryinfo')) {
            continue;
        }
        const parsed = parseProtobufDurationSeconds(detail.retryDelay);
        if (parsed != null && (latest == null || parsed > latest)) {
            latest = parsed;
        }
    }
    return latest;
}

function latestRetryAfterSeconds(
    headers: Headers | Record<string, string>,
    details: GoogleErrorDetail[],
): number | null {
    const fromHeader = parseRetryAfterSeconds(getHeaderValue(headers, 'Retry-After'));
    const fromRetryInfo = parseRetryInfoSeconds(details);
    if (fromHeader == null) {
        return fromRetryInfo;
    }
    if (fromRetryInfo == null) {
        return fromHeader;
    }
    return Math.max(fromHeader, fromRetryInfo);
}

function isStructuredSpendLimit(details: GoogleErrorDetail[]): boolean {
    for (const detail of details) {
        const reason = (detail.reason ?? '').toUpperCase();
        if (
            reason.includes('BILLING') ||
            reason.includes('SPEND') ||
            reason === 'CONSUMER_SUSPENDED'
        ) {
            return true;
        }
        if (detail.metadata?.quota_limit === '0') {
            return true;
        }
        if (
            Array.isArray(detail.violations) &&
            detail.violations.some((violation) =>
                (violation.subject ?? '').toLowerCase().includes('billing'),
            )
        ) {
            return true;
        }
    }
    return false;
}

function isKeyWidePermission(details: GoogleErrorDetail[]): boolean {
    return details.some((detail) => {
        const reason = (detail.reason ?? '').toUpperCase();
        return (
            reason === 'SERVICE_DISABLED' ||
            reason === 'API_DISABLED' ||
            reason === 'BILLING_DISABLED' ||
            reason.includes('BILLING')
        );
    });
}

function isProjectWideRateLimit(details: GoogleErrorDetail[]): boolean {
    return details.some((detail) => {
        const location = (detail.metadata?.quota_location ?? '').toLowerCase();
        return location === 'project' || location.includes('project');
    });
}

function isTransientStatus(status: number): boolean {
    return status === 408 || status >= 500;
}

function buildResult(
    failureClass: ClassifiedUpstreamFailure['class'],
    retryable: boolean,
    disableKey: boolean,
    retryAfterSeconds: number | null,
    message: string,
    status: number | undefined,
    keyWide: boolean,
): ClassifiedUpstreamFailure {
    return {
        class: failureClass,
        retryable,
        disableKey,
        retryAfterSeconds,
        message,
        status,
        keyWide,
    };
}

export function classifyUpstreamError(input: {
    readonly status: number | undefined;
    readonly headers: Headers | Record<string, string>;
    readonly bodyText: string;
}): ClassifiedUpstreamFailure {
    const { status, headers, bodyText } = input;
    const googleError = parseGoogleErrorBody(bodyText);
    const details = asDetails(googleError);
    const message = googleError?.message ?? (bodyText || 'upstream_error');
    if (status === undefined) {
        return buildResult(
            UPSTREAM_FAILURE_CLASS.transient,
            true,
            false,
            null,
            message,
            status,
            false,
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
            false,
        );
    }
    if (status === 401) {
        return buildResult(
            UPSTREAM_FAILURE_CLASS.key_invalid,
            true,
            true,
            null,
            message,
            status,
            false,
        );
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
                false,
            );
        }
        return buildResult(
            UPSTREAM_FAILURE_CLASS.key_permission,
            true,
            false,
            null,
            message,
            status,
            isKeyWidePermission(details),
        );
    }
    if (status === 429) {
        const retryAfterSeconds = latestRetryAfterSeconds(headers, details);
        if (isStructuredSpendLimit(details)) {
            return buildResult(
                UPSTREAM_FAILURE_CLASS.spend_limit,
                true,
                false,
                retryAfterSeconds,
                message,
                status,
                true,
            );
        }
        return buildResult(
            UPSTREAM_FAILURE_CLASS.rate_limit,
            true,
            false,
            retryAfterSeconds,
            message,
            status,
            isProjectWideRateLimit(details),
        );
    }
    if (isTransientStatus(status)) {
        return buildResult(
            UPSTREAM_FAILURE_CLASS.transient,
            true,
            false,
            latestRetryAfterSeconds(headers, details),
            message,
            status,
            false,
        );
    }
    return buildResult(UPSTREAM_FAILURE_CLASS.unknown, false, false, null, message, status, false);
}
