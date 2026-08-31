export function normalizeV1Path(path: string): string {
    if (path.startsWith('/v1/v1beta/') || path.startsWith('/v1/v1/')) {
        return path.slice('/v1'.length);
    }
    return path;
}
