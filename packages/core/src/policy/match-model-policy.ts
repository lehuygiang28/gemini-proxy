export function globModel(pattern: string, model: string): boolean {
    if (pattern === '') {
        return model === '';
    }
    const lastAsteriskIndex = pattern.lastIndexOf('*');
    if (lastAsteriskIndex === -1) {
        return pattern === model;
    }
    const firstAsteriskIndex = pattern.indexOf('*');
    if (firstAsteriskIndex !== lastAsteriskIndex || lastAsteriskIndex !== pattern.length - 1) {
        return pattern === model;
    }
    const prefix = pattern.slice(0, -1);
    return model.startsWith(prefix);
}

function isEmptyList(list: string[] | null): boolean {
    return list == null || list.length === 0;
}

function matchesAnyPattern(patterns: string[], model: string): boolean {
    return patterns.some((pattern) => globModel(pattern, model));
}

export function matchModelPolicy(input: {
    readonly model: string | undefined;
    readonly allowed: string[] | null;
    readonly denied: string[] | null;
}): 'ok' | 'model_denied' | 'model_required' {
    const { model, allowed, denied } = input;
    const hasAllowed = !isEmptyList(allowed);
    const hasDenied = !isEmptyList(denied);
    if (hasAllowed && model === undefined) {
        return 'model_required';
    }
    if (model !== undefined && hasDenied && matchesAnyPattern(denied!, model)) {
        return 'model_denied';
    }
    if (hasAllowed && model !== undefined && !matchesAnyPattern(allowed!, model)) {
        return 'model_denied';
    }
    return 'ok';
}
