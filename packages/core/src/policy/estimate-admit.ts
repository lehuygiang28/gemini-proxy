const DEFAULT_ADMIT_TOKENS = 8192;

function normalizePositiveFinite(value: number | undefined | null): number | undefined {
    if (value == null || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
        return undefined;
    }
    return value;
}

export function estimateAdmitTokens(input: {
    readonly peekedMaxOutput: number | undefined;
    readonly policyMaxOutput: number | null;
}): number {
    const peeked = normalizePositiveFinite(input.peekedMaxOutput);
    const policy = normalizePositiveFinite(input.policyMaxOutput);
    if (peeked === undefined && policy === undefined) {
        return DEFAULT_ADMIT_TOKENS;
    }
    if (peeked === undefined) {
        return policy!;
    }
    if (policy === undefined) {
        return peeked;
    }
    return Math.min(peeked, policy);
}
