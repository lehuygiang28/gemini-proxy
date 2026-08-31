export function createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
    }, timeoutMs);
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true });
    return controller.signal;
}

export function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
    if (signals.length === 0) {
        return new AbortController().signal;
    }
    if (signals.length === 1) {
        return signals[0];
    }
    const controller = new AbortController();
    for (const signal of signals) {
        if (signal.aborted) {
            controller.abort(signal.reason);
            return controller.signal;
        }
        signal.addEventListener(
            'abort',
            () => {
                controller.abort(signal.reason);
            },
            { once: true },
        );
    }
    return controller.signal;
}
