import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from './index';
import { getIntlMessageFallback, onIntlError } from './intl-errors';

export default getRequestConfig(async () => {
    const locale = await getUserLocale();
    return {
        locale,
        messages: (await import(`../../public/locales/${locale}/common.json`)).default,
        onError: onIntlError,
        getMessageFallback: getIntlMessageFallback,
    };
});
