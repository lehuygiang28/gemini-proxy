import React, { useEffect, useRef, useState } from 'react';
import { formatDuration, formatTokenCount } from '@/utils/table-helpers';

export type KpiTone = 'default' | 'success' | 'error' | 'warn' | 'accent';

export interface KpiItem {
    key: string;
    label: string;
    value: string | number;
    tone?: KpiTone;
    hint?: string;
}

interface KpiStripProps {
    items: KpiItem[];
    loading?: boolean;
}

/**
 * Dense KPI strip without nested Cards.
 */
export function KpiStrip({ items, loading = false }: KpiStripProps) {
    const [tickedKeys, setTickedKeys] = useState<Set<string>>(new Set());
    const previousValues = useRef<Record<string, string | number>>({});

    useEffect(() => {
        const changed = new Set<string>();
        for (const item of items) {
            const previous = previousValues.current[item.key];
            if (previous !== undefined && previous !== item.value) {
                changed.add(item.key);
            }
            previousValues.current[item.key] = item.value;
        }
        if (changed.size === 0) {
            return;
        }
        setTickedKeys(changed);
        const timer = window.setTimeout(() => setTickedKeys(new Set()), 280);
        return () => window.clearTimeout(timer);
    }, [items]);

    return (
        <div className="gp-kpi-strip" aria-busy={loading}>
            {items.map((item) => (
                <div
                    key={item.key}
                    className="gp-kpi-cell"
                    data-tick={tickedKeys.has(item.key) ? 'true' : 'false'}
                    title={item.hint}
                >
                    <div className="gp-kpi-label">{item.label}</div>
                    <div className="gp-kpi-value" data-tone={item.tone ?? 'default'}>
                        {loading ? '—' : item.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function buildConsoleKpiItems(input: {
    totalRequests?: number;
    successRate?: number;
    avgResponseMs?: number;
    totalTokens?: number;
    activeKeys?: number;
    retryRate?: number;
}): KpiItem[] {
    const successRate = Math.round(input.successRate ?? 0);
    const retryRate = Math.round(input.retryRate ?? 0);
    return [
        {
            key: 'requests',
            label: 'Requests',
            value: input.totalRequests ?? 0,
            tone: 'accent',
            hint: 'Period-scoped request count',
        },
        {
            key: 'success',
            label: 'Success rate',
            value: `${successRate}%`,
            tone: successRate >= 95 ? 'success' : successRate >= 80 ? 'warn' : 'error',
        },
        {
            key: 'latency',
            label: 'Avg latency',
            value: formatDuration(input.avgResponseMs),
            tone: 'default',
        },
        {
            key: 'tokens',
            label: 'Proxy tokens',
            value: formatTokenCount(input.totalTokens),
            hint: 'All-time token counters on proxy keys',
        },
        {
            key: 'keys',
            label: 'Active keys',
            value: input.activeKeys ?? 0,
        },
        {
            key: 'retry',
            label: 'Retry rate',
            value: `${retryRate}%`,
            tone: retryRate > 20 ? 'error' : retryRate > 10 ? 'warn' : 'success',
        },
    ];
}
