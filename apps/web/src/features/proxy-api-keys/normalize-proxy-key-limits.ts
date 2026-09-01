const NUMERIC_LIMIT_FIELDS = [
    'rpm_limit',
    'rpd_limit',
    'token_day_limit',
    'monthly_budget_usd',
] as const;

function normalizeOptionalNumber(value: unknown): unknown {
    return value === undefined || value === null || value === '' ? null : value;
}

function normalizeOptionalTags(value: unknown): unknown {
    return Array.isArray(value) && value.length > 0 ? value : null;
}

function normalizeOptionalExpiry(value: unknown): unknown {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (
        typeof value === 'object' &&
        'toISOString' in value &&
        typeof value.toISOString === 'function'
    ) {
        return value.toISOString();
    }
    return value;
}

export function normalizeProxyKeyLimits<T extends Record<string, unknown>>(
    values: T,
): T & Record<string, unknown> {
    const numericLimits: Record<string, unknown> = Object.fromEntries(
        NUMERIC_LIMIT_FIELDS.map((fieldName) => [
            fieldName,
            normalizeOptionalNumber(values[fieldName]),
        ]),
    );
    return {
        ...values,
        ...numericLimits,
        allowed_models: normalizeOptionalTags(values.allowed_models),
        expires_at: normalizeOptionalExpiry(values.expires_at),
    };
}
