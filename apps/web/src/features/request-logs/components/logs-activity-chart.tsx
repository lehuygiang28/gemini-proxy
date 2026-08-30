'use client';

import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty, Segmented, Spin } from 'antd';
import { useTranslation } from '@refinedev/core';
import type { RequestLogsVolume, RequestLogsVolumeRange } from '@gemini-proxy/database';
import { fillBucketSeries } from '../logs-activity-chart-series';

interface LogsActivityChartProps {
    volume?: RequestLogsVolume | null;
    loading?: boolean;
    range: RequestLogsVolumeRange;
    onRangeChange: (range: RequestLogsVolumeRange) => void;
}

/**
 * Request volume bar chart with dynamic time range (A2).
 */
export function LogsActivityChart({
    volume,
    loading = false,
    range,
    onRangeChange,
}: LogsActivityChartProps) {
    const { translate, getLocale } = useTranslation();
    const locale = getLocale();
    const series = useMemo(() => fillBucketSeries(volume, locale), [volume, locale]);
    const hasData = series.some((point) => point.count > 0);
    const rangeOptions = useMemo(
        () => [
            { label: translate('request_logs.chart.range.24h'), value: '24h' as const },
            { label: translate('request_logs.chart.range.7d'), value: '7d' as const },
            { label: translate('request_logs.chart.range.30d'), value: '30d' as const },
            { label: translate('request_logs.chart.range.90d'), value: '90d' as const },
        ],
        [translate],
    );

    return (
        <div className="gp-panel gp-logs-chart" style={{ marginBottom: 12, padding: 16 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 12,
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <div className="gp-section-title">{translate('request_logs.chart.title')}</div>
                    {volume ? (
                        <div style={{ fontSize: 12, color: 'var(--gp-text-muted)', marginTop: 4 }}>
                            {translate('request_logs.chart.totalRequests', {
                                count: volume.total_requests,
                            })}
                        </div>
                    ) : null}
                </div>
                <Segmented
                    size="small"
                    value={range}
                    options={rangeOptions}
                    onChange={(value) => onRangeChange(value as RequestLogsVolumeRange)}
                />
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                </div>
            ) : !hasData ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={translate('request_logs.chart.empty')}
                    style={{ padding: 24 }}
                />
            ) : (
                <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--gp-chart-grid)" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: 'var(--gp-chart-axis)', fontSize: 10 }}
                            interval="preserveStartEnd"
                            minTickGap={24}
                        />
                        <YAxis
                            tick={{ fill: 'var(--gp-chart-axis)', fontSize: 10 }}
                            width={32}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--gp-bg-raised)',
                                border: '1px solid var(--gp-border)',
                                borderRadius: 4,
                                fontSize: 12,
                            }}
                            formatter={(value) => [
                                String(value ?? 0),
                                translate('request_logs.chart.requests'),
                            ]}
                        />
                        <Bar
                            dataKey="count"
                            fill="var(--gp-chart-1)"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={24}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
