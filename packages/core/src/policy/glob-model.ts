export function globModel(pattern: string, model: string): boolean {
    if (pattern === '') {
        return model === '';
    }
    const lastAsteriskIndex = pattern.lastIndexOf('*');
    if (lastAsteriskIndex === -1) {
        return pattern === model;
    }
    if (lastAsteriskIndex !== pattern.length - 1) {
        return pattern === model;
    }
    const prefix = pattern.slice(0, -1);
    return model.startsWith(prefix);
}
