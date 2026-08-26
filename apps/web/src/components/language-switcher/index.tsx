'use client';

import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { Button, Dropdown, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { I18N_COOKIE_NAME, SUPPORTED_LOCALES } from '@i18n/config';

export function LanguageSwitcher() {
    const { getLocale, changeLocale, translate } = useTranslation();
    const currentLocale = getLocale();
    const router = useRouter();

    const items: MenuProps['items'] = SUPPORTED_LOCALES.map((lang) => ({
        key: lang,
        label: translate(`languageSwitcher.${lang}`),
        onClick: () => {
            void changeLocale(lang).then(() => {
                Cookies.set(I18N_COOKIE_NAME, lang);
                router.refresh();
            });
        },
    }));

    return (
        <Dropdown menu={{ items, selectedKeys: currentLocale ? [currentLocale] : [] }}>
            <Button type="text" aria-label={translate('languageSwitcher.label')}>
                <Space>
                    <Typography.Text>
                        {translate(`languageSwitcher.${currentLocale === 'vi' ? 'vi' : 'en'}`)}
                    </Typography.Text>
                    <DownOutlined />
                </Space>
            </Button>
        </Dropdown>
    );
}
