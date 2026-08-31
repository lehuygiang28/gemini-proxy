const DEFAULT_ADMIT_TOKENS = 8192;

function normalizePositiveFinite(value: number | undefined | null): number | undefined {
    if (value == null || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
        return undefined;
    }
    return value;
}

export function estimateAdmitTokens(input: {
    readonly peekedMaxOutput: number | undefined;
}): number {
    return normalizePositiveFinite(input.peekedMaxOutput) ?? DEFAULT_ADMIT_TOKENS;
}
