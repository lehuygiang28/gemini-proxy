import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from './index';

export default getRequestConfig(async () => {
    const locale = await getUserLocale();
    return {
        locale,
        messages: (await import(`../../public/locales/${locale}/common.json`)).default,
    };
});
