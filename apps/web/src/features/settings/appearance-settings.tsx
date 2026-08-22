'use client';

import React, { useContext } from 'react';
import { Space, Switch, Typography } from 'antd';
import { ColorModeContext } from '@contexts/color-mode';

const { Text } = Typography;

/**
 * Theme preference (cookie-backed; no DB).
 */
export function AppearanceSettings() {
    const { mode, setColorMode } = useContext(ColorModeContext);

    return (
        <div className="gp-panel" style={{ padding: 16 }}>
            <div className="gp-section-title">Appearance</div>
            <Space direction="vertical" size="middle">
                <div>
                    <Text style={{ display: 'block', marginBottom: 8 }}>Color mode</Text>
                    <Switch
                        checked={mode === 'dark'}
                        checkedChildren="Dark"
                        unCheckedChildren="Light"
                        onChange={(checked) => setColorMode(checked ? 'dark' : 'light')}
                    />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Stored in a browser cookie. Does not affect request logging.
                </Text>
            </Space>
        </div>
    );
}
