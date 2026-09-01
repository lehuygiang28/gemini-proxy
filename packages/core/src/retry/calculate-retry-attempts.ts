export const MAX_RETRIES_SAFETY_CAP = 50;

/** Extra attempts after the first. Total attempts never exceed eligible keys or 50. */
export function calculateRetryAttempts(maxRetries: number, availableApiKeys: number): number {
    const cappedAvailable = Math.min(Math.max(0, availableApiKeys), MAX_RETRIES_SAFETY_CAP);
    if (cappedAvailable <= 1) {
        return 0;
    }
    if (maxRetries < 0) {
        return cappedAvailable - 1;
    }
    if (maxRetries === 0) {
        return 0;
    }
    return Math.min(maxRetries, cappedAvailable - 1);
}
