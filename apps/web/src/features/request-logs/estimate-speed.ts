/**
 * Estimated output throughput (tok/s) from completion tokens and API duration.
 * Not a Google-reported speed. Null when either input is missing or not positive.
 */
export function estimateSpeedTokPerS(input: {
    completionTokens?: number | null;
    durationMs?: number | null;
}): number | null {
    const completionTokens = input.completionTokens;
    const durationMs = input.durationMs;
    if (
        completionTokens == null ||
        durationMs == null ||
        completionTokens <= 0 ||
        durationMs <= 0
    ) {
        return null;
    }
    return completionTokens / (durationMs / 1000);
}

export function formatStoredEstimatedSpeed(
    stored: number | null | undefined,
    emptyLabel = '—',
): string {
    if (stored == null || !Number.isFinite(Number(stored)) || Number(stored) <= 0) {
        return emptyLabel;
    }
    return `${Number(stored).toFixed(1)} tok/s`;
}
