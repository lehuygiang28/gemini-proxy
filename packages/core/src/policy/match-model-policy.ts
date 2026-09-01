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

export function matchModelPolicy(input: {
    readonly model: string | undefined;
    readonly allowed: string[] | null;
}): 'ok' | 'model_denied' | 'model_required' {
    const { model, allowed } = input;
    if (isEmptyList(allowed)) {
        return 'ok';
    }
    if (model === undefined) {
        return 'model_required';
    }
    return allowed!.some((pattern) => globModel(pattern, model)) ? 'ok' : 'model_denied';
}
