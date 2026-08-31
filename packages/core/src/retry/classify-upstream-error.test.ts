import { describe, expect, it, vi } from 'vitest';
import { UPSTREAM_FAILURE_CLASS } from './types';
import { classifyUpstreamError } from './classify-upstream-error';

describe('classifyUpstreamError', () => {
    const cases: Array<{
        name: string;
        input: {
            status: number | undefined;
            headers: Headers | Record<string, string>;
            bodyText: string;
        };
        expected: {
            class: (typeof UPSTREAM_FAILURE_CLASS)[keyof typeof UPSTREAM_FAILURE_CLASS];
            retryable: boolean;
            disableKey: boolean;
            retryAfterSeconds: number | null;
            keyWide?: boolean;
        };
    }> = [
        {
            name: '400 is client_invalid and not retryable',
            input: { status: 400, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.client_invalid,
                retryable: false,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: '404 is client_invalid and not retryable',
            input: { status: 404, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.client_invalid,
                retryable: false,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: '401 is key_invalid and disables the key',
            input: { status: 401, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.key_invalid,
                retryable: true,
                disableKey: true,
                retryAfterSeconds: null,
            },
        },
        {
            name: '403 with API_KEY_INVALID in body is key_invalid',
            input: {
                status: 403,
                headers: {},
                bodyText: JSON.stringify({
                    error: {
                        status: 'PERMISSION_DENIED',
                        message: 'API key not valid',
                        details: [{ reason: 'API_KEY_INVALID' }],
                    },
                }),
            },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.key_invalid,
                retryable: true,
                disableKey: true,
                retryAfterSeconds: null,
            },
        },
        {
            name: '403 without API_KEY_INVALID is key_permission',
            input: {
                status: 403,
                headers: {},
                bodyText: JSON.stringify({
                    error: {
                        status: 'PERMISSION_DENIED',
                        message: 'Permission denied',
                    },
                }),
            },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.key_permission,
                retryable: true,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: '429 with Retry-After header is rate_limit with parsed seconds',
            input: {
                status: 429,
                headers: { 'Retry-After': '120' },
                bodyText: JSON.stringify({
                    error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' },
                }),
            },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.rate_limit,
                retryable: true,
                disableKey: false,
                retryAfterSeconds: 120,
            },
        },
        {
            name: '429 with spend wording in the message is rate_limit, not spend_limit',
            input: {
                status: 429,
                headers: {},
                bodyText: JSON.stringify({
                    error: {
                        status: 'RESOURCE_EXHAUSTED',
                        message: 'You exceeded your spend limit: limit: 0',
                    },
                }),
            },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.rate_limit,
                retryable: true,
                disableKey: false,
                retryAfterSeconds: null,
                keyWide: false,
            },
        },
        {
            name: '503 is transient',
            input: { status: 503, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.transient,
                retryable: true,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: 'undefined status (abort/network) is transient',
            input: { status: undefined, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.transient,
                retryable: true,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: 'unknown 4xx such as 418 is unknown and not retryable',
            input: { status: 418, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.unknown,
                retryable: false,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: '408 is transient',
            input: { status: 408, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.transient,
                retryable: true,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: '409 is unknown and not retryable',
            input: { status: 409, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.unknown,
                retryable: false,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: '423 is unknown and not retryable',
            input: { status: 423, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.unknown,
                retryable: false,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
        {
            name: '502 is transient',
            input: { status: 502, headers: {}, bodyText: '' },
            expected: {
                class: UPSTREAM_FAILURE_CLASS.transient,
                retryable: true,
                disableKey: false,
                retryAfterSeconds: null,
            },
        },
    ];

    it.each(cases)('$name', ({ input, expected }) => {
        const actual = classifyUpstreamError(input);
        expect(actual.class).toBe(expected.class);
        expect(actual.retryable).toBe(expected.retryable);
        expect(actual.disableKey).toBe(expected.disableKey);
        expect(actual.retryAfterSeconds).toBe(expected.retryAfterSeconds);
        expect(actual.status).toBe(input.status);
        expect(actual.keyWide).toBe(expected.keyWide ?? false);
    });

    it('clamps integer Retry-After below minimum to 1 second', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': '0' },
            bodyText: '',
        });
        expect(actual.retryAfterSeconds).toBe(1);
    });

    it('clamps integer Retry-After above maximum to 3600 seconds', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': '9999' },
            bodyText: '',
        });
        expect(actual.retryAfterSeconds).toBe(3600);
    });

    it('parses HTTP-date Retry-After as seconds until that instant', () => {
        const now = new Date('2026-08-31T12:00:00.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(now);
        const futureDate = new Date('2026-08-31T12:02:30.000Z');
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': futureDate.toUTCString() },
            bodyText: '',
        });
        expect(actual.retryAfterSeconds).toBe(150);
        vi.useRealTimers();
    });

    it('uses 1 second when HTTP-date Retry-After is in the past', () => {
        const now = new Date('2026-08-31T12:00:00.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(now);
        const pastDate = new Date('2026-08-31T11:00:00.000Z');
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': pastDate.toUTCString() },
            bodyText: '',
        });
        expect(actual.retryAfterSeconds).toBe(1);
        vi.useRealTimers();
    });

    it('reads Retry-After from Headers object', () => {
        const headers = new Headers({ 'Retry-After': '60' });
        const actual = classifyUpstreamError({
            status: 429,
            headers,
            bodyText: '',
        });
        expect(actual.retryAfterSeconds).toBe(60);
    });

    it('does not treat billing wording in the 429 message as spend_limit', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: {},
            bodyText: JSON.stringify({
                error: { message: 'Billing account has no remaining budget' },
            }),
        });
        expect(actual.class).toBe(UPSTREAM_FAILURE_CLASS.rate_limit);
        expect(actual.keyWide).toBe(false);
    });

    it('detects spend_limit from structured quota_limit 0 without scanning the message', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: {},
            bodyText: JSON.stringify({
                error: {
                    status: 'RESOURCE_EXHAUSTED',
                    message: 'Quota exceeded',
                    details: [
                        {
                            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                            reason: 'CONSUMER_SUSPENDED',
                            metadata: {
                                quota_limit: '0',
                                quota_metric: 'invoiced_usage',
                            },
                        },
                    ],
                },
            }),
        });
        expect(actual.class).toBe(UPSTREAM_FAILURE_CLASS.spend_limit);
        expect(actual.keyWide).toBe(true);
    });

    it('parses google.rpc.RetryInfo.retryDelay ahead of Retry-After when it is later', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': '30' },
            bodyText: JSON.stringify({
                error: {
                    status: 'RESOURCE_EXHAUSTED',
                    details: [
                        {
                            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                            retryDelay: '90s',
                        },
                    ],
                },
            }),
        });
        expect(actual.class).toBe(UPSTREAM_FAILURE_CLASS.rate_limit);
        expect(actual.retryAfterSeconds).toBe(90);
    });

    it('keeps the later Retry-After when RetryInfo is shorter', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': '120' },
            bodyText: JSON.stringify({
                error: {
                    status: 'RESOURCE_EXHAUSTED',
                    details: [
                        {
                            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                            retryDelay: '45s',
                        },
                    ],
                },
            }),
        });
        expect(actual.retryAfterSeconds).toBe(120);
    });

    it('marks 403 SERVICE_DISABLED as key-wide permission cooldown', () => {
        const actual = classifyUpstreamError({
            status: 403,
            headers: {},
            bodyText: JSON.stringify({
                error: {
                    status: 'PERMISSION_DENIED',
                    details: [
                        {
                            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                            reason: 'SERVICE_DISABLED',
                        },
                    ],
                },
            }),
        });
        expect(actual.class).toBe(UPSTREAM_FAILURE_CLASS.key_permission);
        expect(actual.keyWide).toBe(true);
    });

    it('marks project-wide 429 ErrorInfo as key-wide rate_limit', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: {},
            bodyText: JSON.stringify({
                error: {
                    status: 'RESOURCE_EXHAUSTED',
                    details: [
                        {
                            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                            reason: 'RATE_LIMIT_EXCEEDED',
                            metadata: {
                                quota_location: 'project',
                            },
                        },
                    ],
                },
            }),
        });
        expect(actual.class).toBe(UPSTREAM_FAILURE_CLASS.rate_limit);
        expect(actual.keyWide).toBe(true);
    });

    it('does not clamp HTTP-date Retry-After deltas to 3600 seconds', () => {
        const now = new Date('2026-08-31T12:00:00.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(now);
        const futureDate = new Date('2026-08-31T14:00:00.000Z');
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': futureDate.toUTCString() },
            bodyText: '',
        });
        expect(actual.retryAfterSeconds).toBe(7200);
        vi.useRealTimers();
    });

    it('parses leading-zero integer Retry-After as delta seconds', () => {
        const actual = classifyUpstreamError({
            status: 429,
            headers: { 'Retry-After': '0120' },
            bodyText: '',
        });
        expect(actual.retryAfterSeconds).toBe(120);
    });

    it('classifies 403 with non-array error.details as key_permission without throwing', () => {
        const actual = classifyUpstreamError({
            status: 403,
            headers: {},
            bodyText: JSON.stringify({ error: { details: 'invalid' } }),
        });
        expect(actual.class).toBe(UPSTREAM_FAILURE_CLASS.key_permission);
        expect(actual.retryable).toBe(true);
        expect(actual.disableKey).toBe(false);
    });
});
