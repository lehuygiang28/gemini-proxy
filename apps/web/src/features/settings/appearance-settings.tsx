'use client';

import React, { useContext } from 'react';
import { useTranslation } from '@refinedev/core';
import { Space, Switch, Typography } from 'antd';
import { ColorModeContext } from '@contexts/color-mode';

const { Text } = Typography;

/**
 * Theme preference (cookie-backed; no DB).
 */
export function AppearanceSettings() {
    const { translate } = useTranslation();
    const { mode, setColorMode } = useContext(ColorModeContext);

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <div className="gp-section-title">{translate('settings.appearance.title')}</div>
            <Space direction="vertical" size="middle">
                <div>
                    <Text style={{ display: 'block', marginBottom: 8 }}>
                        {translate('settings.appearance.colorMode')}
                    </Text>
                    <Switch
                        checked={mode === 'dark'}
                        checkedChildren={translate('settings.appearance.dark')}
                        unCheckedChildren={translate('settings.appearance.light')}
                        onChange={(checked) => setColorMode(checked ? 'dark' : 'light')}
                    />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {translate('settings.appearance.hint')}
                </Text>
            </Space>
        </div>
    );
}
