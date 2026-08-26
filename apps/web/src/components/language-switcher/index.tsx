'use client';

import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { Button, Dropdown, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { I18N_COOKIE_NAME, I18N_COOKIE_OPTIONS, SUPPORTED_LOCALES } from '@i18n/config';

const SWITCHER_TRIGGER_MIN_WIDTH = 132;

export function LanguageSwitcher() {
    const { getLocale, changeLocale, translate } = useTranslation();
    const currentLocale = getLocale() === 'vi' ? 'vi' : 'en';
    const router = useRouter();
    const localeLabel = translate(`languageSwitcher.${currentLocale}`);

    const items: MenuProps['items'] = SUPPORTED_LOCALES.map((lang) => ({
        key: lang,
        label: translate(`languageSwitcher.${lang}`),
        onClick: () => {
            void changeLocale(lang).then(() => {
                Cookies.set(I18N_COOKIE_NAME, lang, I18N_COOKIE_OPTIONS);
                router.refresh();
            });
        },
    }));

    return (
        <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{ items, selectedKeys: [currentLocale] }}
        >
            <Button
                type="text"
                style={{ minWidth: SWITCHER_TRIGGER_MIN_WIDTH }}
                aria-label={translate('languageSwitcher.ariaLabel', {
                    label: translate('languageSwitcher.label'),
                    locale: localeLabel,
                })}
            >
                <Space>
                    <Typography.Text>{localeLabel}</Typography.Text>
                    <DownOutlined />
                </Space>
            </Button>
        </Dropdown>
    );
}
