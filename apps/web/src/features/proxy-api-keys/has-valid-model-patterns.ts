export function hasValidModelPatterns(patterns: string[] | null | undefined): boolean {
    return (patterns ?? []).every((pattern: string) => {
        const wildcardIndex: number = pattern.indexOf('*');
        return wildcardIndex === -1 || wildcardIndex === pattern.length - 1;
    });
}
