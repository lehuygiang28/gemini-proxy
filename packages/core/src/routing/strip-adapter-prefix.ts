const ADAPTER_PREFIX = '/api/gproxy';

export function stripAdapterPrefix(path: string): string {
    if (path === ADAPTER_PREFIX) {
        return '/';
    }
    if (path.startsWith(`${ADAPTER_PREFIX}/`)) {
        return path.slice(ADAPTER_PREFIX.length);
    }
    return path;
}
