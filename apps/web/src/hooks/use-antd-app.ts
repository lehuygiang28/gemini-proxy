'use client';

import { App } from 'antd';

/**
 * Themed Ant Design modal/message/notification APIs from App context.
 * Prefer declarative Modal/Popconfirm components; use this for imperative flows only.
 */
export function useAntdApp() {
    return App.useApp();
}
