export type ModelColumnPresentation = {
    apiFormat: string;
    showStream: boolean;
    showRetries: boolean;
    retryCount: number;
};

export function modelColumnPresentation(input: {
    apiFormat: string;
    isStream: boolean;
    retryCount: number;
}): ModelColumnPresentation {
    const retryCount = input.retryCount;
    return {
        apiFormat: input.apiFormat,
        showStream: input.isStream,
        showRetries: retryCount > 0,
        retryCount,
    };
}
