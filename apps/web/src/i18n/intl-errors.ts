import { IntlErrorCode, type IntlError } from 'next-intl';

type MessageFallbackInfo = {
    error: IntlError;
    key: string;
    namespace?: string;
};

export function onIntlError(error: IntlError): void {
    if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.error(error);
        return;
    }
    console.error(error);
}

export function getIntlMessageFallback({ namespace, key }: MessageFallbackInfo): string {
    return [namespace, key].filter(Boolean).join('.');
}
