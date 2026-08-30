# Shared UI Components — Gemini Proxy Web App

Stack: Next.js 15 + React 19 + Refine + Ant Design 5. Focus: components used by **request-logs** page redesign and **LiveRequestFeed** reference pattern.

---

## DateTimeDisplay

**Path:** `apps/web/src/components/common/DateTimeDisplay.tsx`  
**Description:** Locale-aware date + optional time stack for table cells.  
**Props:** `dateString`, `showTime?` (default `true`)

```tsx
'use client';

import React from 'react';
import { Typography, Space, theme } from 'antd';
import { useTranslation } from '@refinedev/core';
import { formatDate, formatTime } from '@/utils/table-helpers';

const { Text } = Typography;
const { useToken } = theme;

interface DateTimeDisplayProps {
    dateString: string | null | undefined;
    showTime?: boolean;
}

export const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({
    dateString,
    showTime = true,
}) => {
    const { token } = useToken();
    const { translate, getLocale } = useTranslation();
    const locale = getLocale();

    if (!dateString) {
        return <Text type="secondary">{translate('common.never')}</Text>;
    }

    return (
        <Space direction="vertical" size={0}>
            <Text>{formatDate(dateString, locale)}</Text>
            {showTime && (
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    {formatTime(dateString, locale)}
                </Text>
            )}
        </Space>
    );
};
```

---

## ConnectionStatusBadge

**Path:** `apps/web/src/features/observability/components/connection-status-badge.tsx`  
**Description:** Live / Connecting / Paused / Offline dot + label (used in request-logs list header).  
**Props:** `paused?` (default `false`)

```tsx
import React from 'react';
import { useTranslation } from '@refinedev/core';
import {
    useRealtimeConnectionStatus,
    type RealtimeConnectionState,
} from '../hooks/use-realtime-connection-status';

interface ConnectionStatusBadgeProps {
    paused?: boolean;
}

/**
 * Live / Connecting / Paused / Offline indicator for the ops console.
 */
export function ConnectionStatusBadge({ paused = false }: ConnectionStatusBadgeProps) {
    const { translate } = useTranslation();
    const { state } = useRealtimeConnectionStatus({ paused });
    const label = translate(`observability.connection.${state}`);
    return (
        <span className="gp-conn" title={translate('observability.realtimeTitle', { label })}>
            <span className="gp-conn-dot" data-state={state as RealtimeConnectionState} />
            {label}
        </span>
    );
}
```

---

## KeyCombobox

**Path:** `apps/web/src/features/request-logs/components/key-combobox.tsx`  
**Description:** Searchable API/proxy key filter select for request-logs filters.  
**Props:** `resource`, `value?`, `onChange?`, `placeholder?`, `allowClear?`

```tsx
import React, { useMemo } from 'react';
import { Select } from 'antd';
import { useList, useTranslation } from '@refinedev/core';
import type { Tables } from '@gemini-proxy/database';

type KeyRow = Pick<Tables<'api_keys'>, 'id' | 'name' | 'deleted_at'>;

export type KeyComboboxProps = {
    resource: 'api_keys' | 'proxy_api_keys';
    value?: string;
    onChange?: (value: string | undefined) => void;
    placeholder?: string;
    allowClear?: boolean;
};

/**
 * Searchable key picker: label is "name · shortId", value is UUID.
 * Includes soft-deleted keys so historical log filters still resolve.
 */
export function KeyCombobox({
    resource,
    value,
    onChange,
    placeholder,
    allowClear = true,
}: KeyComboboxProps) {
    const { translate } = useTranslation();
    const { result, query } = useList<KeyRow>({
        resource,
        pagination: { currentPage: 1, pageSize: 200 },
        sorters: [{ field: 'name', order: 'asc' }],
        meta: { select: 'id, name, deleted_at' },
    });

    const options = useMemo(() => {
        const keys = result?.data ?? [];
        const removedMark = translate('request_logs.identity.removedSuffix');
        return keys.map((key) => {
            const shortId = key.id.slice(0, 8);
            const removed = key.deleted_at ? removedMark : '';
            return {
                value: key.id,
                label: `${key.name} · ${shortId}${removed}`,
            };
        });
    }, [result?.data, translate]);

    return (
        <Select
            showSearch
            allowClear={allowClear}
            loading={query.isLoading}
            value={value}
            onChange={(next) => onChange?.(next ?? undefined)}
            options={options}
            optionFilterProp="label"
            placeholder={placeholder}
            style={{ width: '100%' }}
        />
    );
}
```

---

## LiveRequestFeed (reference pattern)

**Path:** `apps/web/src/features/observability/components/live-request-feed.tsx`  
**Description:** Dense grid feed on dashboard — **design reference** for request-logs table redesign (`.gp-live-feed`, `.gp-live-row`, status border-left, highlight on new rows).  
**Props:** `logs`, `loading?`, `onRowClick?`

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, Spin, Tag, Tooltip } from 'antd';
import { useTranslation } from '@refinedev/core';
import type { Tables } from '@gemini-proxy/database';
import {
    extractPerformanceMetrics,
    extractUsageMetadata,
    formatDuration,
    formatTokenCount,
    getRequestType,
} from '@/utils/table-helpers';

export type LiveFeedLog = Pick<
    Tables<'request_logs'>,
    | 'id'
    | 'request_id'
    | 'api_format'
    | 'is_stream'
    | 'is_successful'
    | 'performance_metrics'
    | 'usage_metadata'
    | 'created_at'
    | 'api_key_id'
    | 'proxy_key_id'
> & {
    api_keys?: { id: string; name: string; deleted_at: string | null } | null;
    proxy_api_keys?: { id: string; name: string; deleted_at: string | null } | null;
};

interface LiveRequestFeedProps {
    logs: LiveFeedLog[];
    loading?: boolean;
    onRowClick?: (log: LiveFeedLog) => void;
}

function shortModel(model: string | null): string {
    if (!model) {
        return '—';
    }
    // Drop common vendor prefixes for scan density
    return model.replace(/^models\//, '');
}

function keyLabel(
    joined: { name: string; deleted_at: string | null } | null | undefined,
    fallbackId: string | null,
    removedLabel: (name: string) => string,
): string {
    if (joined?.name) {
        return joined.deleted_at ? removedLabel(joined.name) : joined.name;
    }
    if (fallbackId) {
        return `${fallbackId.slice(0, 8)}…`;
    }
    return '—';
}

/**
 * Presentational live feed — model + key names over opaque IDs.
 */
export function LiveRequestFeed({ logs, loading = false, onRowClick }: LiveRequestFeedProps) {
    const { translate, getLocale } = useTranslation();
    const locale = getLocale();
    const clockFormat = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }),
        [locale],
    );
    const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
    const previousIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const nextIds = new Set(logs.map((log) => log.id));
        const newcomers = logs
            .filter((log) => previousIds.current.size > 0 && !previousIds.current.has(log.id))
            .map((log) => log.id);
        previousIds.current = nextIds;
        if (newcomers.length === 0) {
            return;
        }
        setHighlightedIds(new Set(newcomers));
        const timer = window.setTimeout(() => setHighlightedIds(new Set()), 1200);
        return () => window.clearTimeout(timer);
    }, [logs]);

    const rows = useMemo(() => logs, [logs]);
    const formatRemovedName = (name: string): string =>
        translate('request_logs.identity.removedLabel', { name });

    return (
        <div className="gp-panel-sunken">
            <div style={{ padding: '12px 12px 0' }}>
                <div className="gp-section-title">{translate('observability.liveFeedTitle')}</div>
            </div>
            <div className="gp-live-feed gp-scrollable">
                <div className="gp-live-feed-header">
                    <span>{translate('observability.columns.time')}</span>
                    <span>{translate('observability.columns.status')}</span>
                    <span>{translate('observability.columns.model')}</span>
                    <span>{translate('observability.columns.key')}</span>
                    <span>{translate('observability.columns.latency')}</span>
                    <span>{translate('observability.columns.tokens')}</span>
                </div>
                {loading && rows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin />
                    </div>
                ) : rows.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={translate('observability.waitingRequests')}
                        style={{ padding: 32 }}
                    />
                ) : (
                    rows.map((log) => {
                        const performance = extractPerformanceMetrics(log.performance_metrics);
                        const usage = extractUsageMetadata(log.usage_metadata);
                        const status = log.is_successful ? 'ok' : 'fail';
                        const formatLabel = getRequestType(log.api_format);
                        const formatLine = log.is_stream
                            ? translate('observability.streamFormat', { format: formatLabel })
                            : formatLabel;
                        const proxyName = keyLabel(
                            log.proxy_api_keys,
                            log.proxy_key_id,
                            formatRemovedName,
                        );
                        const apiName = keyLabel(log.api_keys, log.api_key_id, formatRemovedName);
                        const model = shortModel(usage.model);
                        const tokenPrimary =
                            usage.total_tokens > 0 ? formatTokenCount(usage.total_tokens) : '—';
                        const tokenSecondary =
                            usage.total_tokens > 0
                                ? `${formatTokenCount(usage.prompt_tokens)} / ${formatTokenCount(usage.completion_tokens)}`
                                : null;
                        const requestTitle = translate('observability.requestTitle', {
                            id: log.request_id,
                        });

                        return (
                            <div
                                key={log.id}
                                className="gp-live-row"
                                data-status={status}
                                data-highlight={highlightedIds.has(log.id) ? 'true' : 'false'}
                                onClick={() => onRowClick?.(log)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        onRowClick?.(log);
                                    }
                                }}
                            >
                                <Tooltip title={new Date(log.created_at).toISOString()}>
                                    <span className="gp-live-mono">
                                        {clockFormat.format(new Date(log.created_at))}
                                    </span>
                                </Tooltip>
                                <Tag
                                    color={log.is_successful ? 'success' : 'error'}
                                    style={{ margin: 0, borderRadius: 2 }}
                                >
                                    {log.is_successful
                                        ? translate('observability.ok')
                                        : translate('observability.fail')}
                                </Tag>
                                <Tooltip title={requestTitle}>
                                    <span className="gp-live-cell">
                                        <span className="gp-live-primary">{model}</span>
                                        <span className="gp-live-secondary">{formatLine}</span>
                                    </span>
                                </Tooltip>
                                <Tooltip title={requestTitle}>
                                    <span className="gp-live-cell">
                                        <span className="gp-live-primary">{proxyName}</span>
                                        <span className="gp-live-secondary">{apiName}</span>
                                    </span>
                                </Tooltip>
                                <span className="gp-live-mono">
                                    {performance.duration_ms > 0
                                        ? formatDuration(performance.duration_ms)
                                        : '—'}
                                </span>
                                <span className="gp-live-cell gp-live-mono">
                                    <span className="gp-live-primary">{tokenPrimary}</span>
                                    {tokenSecondary ? (
                                        <span className="gp-live-secondary">{tokenSecondary}</span>
                                    ) : null}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
```

---

## ConsoleToolbar

**Path:** `apps/web/src/features/observability/components/console-toolbar.tsx`  
**Description:** Dashboard toolbar pattern — title, period select, pause/live, refresh, connection badge (mirrored in request-logs header buttons).  
**Props:** `selectedDays`, `isLive`, `isRefreshing`, `onDaysChange`, `onRefresh`, `onToggleLive`

```tsx
import React from 'react';
import { Button, Select, Space, Typography } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { ConnectionStatusBadge } from './connection-status-badge';

const { Title, Text } = Typography;

interface ConsoleToolbarProps {
    selectedDays: number;
    isLive: boolean;
    isRefreshing: boolean;
    onDaysChange: (days: number) => void;
    onRefresh: () => void;
    onToggleLive: () => void;
}

/**
 * Console page chrome: title, period, refresh, pause/live, connection badge.
 */
export function ConsoleToolbar({
    selectedDays,
    isLive,
    isRefreshing,
    onDaysChange,
    onRefresh,
    onToggleLive,
}: ConsoleToolbarProps) {
    const { translate } = useTranslation();
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 16,
                flexWrap: 'wrap',
            }}
        >
            <div>
                <Title level={3} style={{ margin: 0 }}>
                    {translate('observability.title')}
                </Title>
                <Text type="secondary">{translate('observability.subtitle')}</Text>
            </div>
            <Space wrap>
                <ConnectionStatusBadge paused={!isLive} />
                <Select
                    value={selectedDays}
                    onChange={onDaysChange}
                    style={{ width: 140 }}
                    options={[
                        { label: translate('observability.last7'), value: 7 },
                        { label: translate('observability.last30'), value: 30 },
                        { label: translate('observability.last90'), value: 90 },
                    ]}
                />
                <Button
                    icon={isLive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={onToggleLive}
                >
                    {isLive ? translate('observability.pause') : translate('observability.resume')}
                </Button>
                <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={isRefreshing}>
                    {translate('observability.refresh')}
                </Button>
            </Space>
        </div>
    );
}
```

---

## StatusToggle

**Path:** `apps/web/src/components/common/StatusToggle.tsx`  
**Description:** Badge + switch for active/inactive entity state (api-keys pages).  
**Props:** `isActive`, `onToggle`, `loading?`

```tsx
'use client';

import React from 'react';
import { Badge, Switch, Tooltip, Space } from 'antd';
import { useTranslation } from '@refinedev/core';
import { getStatusValue } from '@/utils/table-helpers';

interface StatusToggleProps {
    isActive: boolean;
    onToggle: (checked: boolean) => void;
    loading?: boolean;
}

export const StatusToggle: React.FC<StatusToggleProps> = ({
    isActive,
    onToggle,
    loading = false,
}) => {
    const { translate } = useTranslation();

    return (
        <Space align="center">
            <Badge
                status={getStatusValue(isActive)}
                text={translate(isActive ? 'common.active' : 'common.inactive')}
            />
            <Tooltip title={translate(isActive ? 'common.disable' : 'common.enable')}>
                <Switch checked={isActive} size="small" onChange={onToggle} loading={loading} />
            </Tooltip>
        </Space>
    );
};
```

---

## LanguageSwitcher

**Path:** `apps/web/src/components/language-switcher/index.tsx`  
**Description:** EN/VI locale dropdown in header.  
**Props:** none

```tsx
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
```

---

## resolveKeyLabel (utility)

**Path:** `apps/web/src/features/request-logs/resolve-key-label.ts`  
**Description:** Resolves key display label for request-logs table cells (joined name → short id → em dash).

```typescript
export type KeyJoinLabel =
    | {
          name: string;
          deleted_at: string | null;
      }
    | null
    | undefined;

export type ResolveKeyLabelInput = {
    joined?: KeyJoinLabel;
    /** Optional name from retry_attempts JSON (not a DB column on request_logs). */
    embeddedName?: string | null;
    id?: string | null;
};

export type ResolveKeyLabelResult = {
    label: string;
    isRemoved: boolean;
    shortId: string | null;
};

/**
 * Resolve a display label: joined name → embedded name → short id → em dash.
 */
export function resolveKeyLabel(input: ResolveKeyLabelInput): ResolveKeyLabelResult {
    const { joined, embeddedName, id } = input;
    const shortId = id ? `${id.slice(0, 8)}…` : null;
    if (joined?.name) {
        return { label: joined.name, isRemoved: Boolean(joined.deleted_at), shortId };
    }
    if (embeddedName) {
        return { label: embeddedName, isRemoved: !joined && Boolean(id), shortId };
    }
    if (shortId) {
        return { label: shortId, isRemoved: Boolean(id) && !joined, shortId };
    }
    return { label: '—', isRemoved: false, shortId: null };
}
```
