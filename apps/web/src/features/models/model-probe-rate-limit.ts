const MIN_PROBE_INTERVAL_MS = 2000;

const lastProbeAtByUser = new Map<string, number>();

export function consumeModelProbeRateLimit(userId: string, nowMs = Date.now()): boolean {
    const lastAt = lastProbeAtByUser.get(userId) ?? 0;
    if (nowMs - lastAt < MIN_PROBE_INTERVAL_MS) {
        return false;
    }
    lastProbeAtByUser.set(userId, nowMs);
    return true;
}
