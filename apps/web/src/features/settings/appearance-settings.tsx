'use client';

import React, { useContext } from 'react';
import { useTranslation } from '@refinedev/core';
import { Radio, Space, Switch, Typography } from 'antd';
import { ColorModeContext } from '@contexts/color-mode';
import { DateTimeFormatContext } from '@contexts/datetime-format';
import type { DatetimeFormatMode } from '@constants';

const { Text } = Typography;

/**
 * Theme and datetime preferences (cookie-backed; no DB).
 */
export function AppearanceSettings() {
    const { translate } = useTranslation();
    const { mode, setColorMode } = useContext(ColorModeContext);
    const { mode: datetimeMode, setMode: setDatetimeMode } = useContext(DateTimeFormatContext);

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
                <div>
                    <Text style={{ display: 'block', marginBottom: 8 }}>
                        {translate('settings.appearance.datetimeFormat')}
                    </Text>
                    <Radio.Group
                        value={datetimeMode}
                        optionType="button"
                        onChange={(event) =>
                            setDatetimeMode(event.target.value as DatetimeFormatMode)
                        }
                        options={[
                            {
                                value: 'relative',
                                label: translate('settings.appearance.datetime.relative'),
                            },
                            {
                                value: 'exact',
                                label: translate('settings.appearance.datetime.exact'),
                            },
                            {
                                value: 'auto',
                                label: translate('settings.appearance.datetime.auto'),
                            },
                        ]}
                    />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {translate('settings.appearance.hint')}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {translate('settings.appearance.datetimeHint')}
                </Text>
            </Space>
        </div>
    );
}
