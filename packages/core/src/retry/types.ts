export const UPSTREAM_FAILURE_CLASS = {
    client_invalid: 'client_invalid',
    key_invalid: 'key_invalid',
    key_permission: 'key_permission',
    rate_limit: 'rate_limit',
    spend_limit: 'spend_limit',
    transient: 'transient',
    unknown: 'unknown',
} as const;

export interface ClassifiedUpstreamFailure {
    readonly class: (typeof UPSTREAM_FAILURE_CLASS)[keyof typeof UPSTREAM_FAILURE_CLASS];
    readonly retryable: boolean;
    readonly disableKey: boolean;
    readonly retryAfterSeconds: number | null;
    readonly message: string;
    readonly status: number | undefined;
}
