export function computeRetryDelayMs(input: {
    readonly attempt: number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
    readonly random: () => number;
}): number {
    const { attempt, baseDelayMs, maxDelayMs, random } = input;
    const maximumDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    return random() * maximumDelay;
}
