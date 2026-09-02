export const REQUEST_LOG_TABLE_BUSY_MIN_MS = 600;

export function requestLogTableSpinning(input: {
    isLoading: boolean;
    isFetching: boolean;
    userInitiated: boolean;
}): boolean {
    return input.isLoading || input.userInitiated;
}

/** How long to keep user-initiated busy after fetch ends. `null` = do not clear. */
export function requestLogTableBusyClearDelayMs(input: {
    isFetching: boolean;
    userInitiated: boolean;
    elapsedMs: number;
    minVisibleMs?: number;
}): number | null {
    if (!input.userInitiated || input.isFetching) {
        return null;
    }
    const minVisibleMs = input.minVisibleMs ?? REQUEST_LOG_TABLE_BUSY_MIN_MS;
    return Math.max(0, minVisibleMs - input.elapsedMs);
}
