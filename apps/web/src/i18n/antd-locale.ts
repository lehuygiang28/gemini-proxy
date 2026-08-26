import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import type { Locale } from 'antd/es/locale';

export function resolveAntdLocale(locale: string): Locale {
    return locale === 'vi' ? viVN : enUS;
}
