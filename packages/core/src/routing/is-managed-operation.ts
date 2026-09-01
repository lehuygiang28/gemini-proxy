import type { ProxyApiFormat } from '../types';

export function isManagedOperation(input: {
    readonly apiFormat: ProxyApiFormat;
    readonly path: string;
}): boolean {
    if (input.apiFormat === 'openai') {
        return true;
    }
    const action = input.path.split(':').pop()?.split('?')[0] ?? '';
    return action === 'generateContent' || action === 'streamGenerateContent';
}
