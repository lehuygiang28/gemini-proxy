import React, { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Empty, Spin } from 'antd';

interface ChartsRowProps {
    requestsByHour?: Record<string, number>;
    requestsByFormat?: Record<string, number>;
    loading?: boolean;
}

const FORMAT_COLORS = [
    'var(--gp-chart-1)',
    'var(--gp-chart-2)',
    'var(--gp-chart-3)',
    'var(--gp-chart-5)',
];

/**
 * Hourly volume + format breakdown from get_request_logs_statistics.
 */
export function ChartsRow({
    requestsByHour = {},
    requestsByFormat = {},
    loading = false,
}: ChartsRowProps) {
    const hourSeries = useMemo(() => {
        return Array.from({ length: 24 }, (_, hour) => {
            const key = String(hour);
            return {
                hour: key.padStart(2, '0'),
                count: requestsByHour[key] ?? requestsByHour[hour] ?? 0,
            };
        });
    }, [requestsByHour]);

    const formatSeries = useMemo(() => {
        return Object.entries(requestsByFormat).map(([name, value]) => ({
            name,
            value,
        }));
    }, [requestsByFormat]);

    const hasHourData = hourSeries.some((point) => point.count > 0);
    const hasFormatData = formatSeries.some((point) => point.value > 0);

    return (
        <div className="gp-charts-row">
            <div className="gp-panel" style={{ padding: 16, minHeight: 260 }}>
                <div className="gp-section-title">Requests by hour (last 24h)</div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin />
                    </div>
                ) : !hasHourData ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hourly data" />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                            data={hourSeries}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid stroke="var(--gp-chart-grid)" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                tick={{ fill: 'var(--gp-chart-axis)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                interval={2}
                            />
                            <YAxis
                                tick={{ fill: 'var(--gp-chart-axis)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                width={36}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--gp-bg-raised)',
                                    border: '1px solid var(--gp-border)',
                                    borderRadius: 4,
                                    fontSize: 12,
                                }}
                            />
                            <Bar dataKey="count" fill="var(--gp-chart-1)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="gp-panel" style={{ padding: 16, minHeight: 260 }}>
                <div className="gp-section-title">By format</div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                        <Spin />
                    </div>
                ) : !hasFormatData ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No format data" />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={formatSeries}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={48}
                                outerRadius={72}
                                paddingAngle={2}
                            >
                                {formatSeries.map((entry, index) => (
                                    <Cell
                                        key={entry.name}
                                        fill={FORMAT_COLORS[index % FORMAT_COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--gp-bg-raised)',
                                    border: '1px solid var(--gp-border)',
                                    borderRadius: 4,
                                    fontSize: 12,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
                {hasFormatData && (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                        {formatSeries.map((entry, index) => (
                            <span key={entry.name} className="gp-chip">
                                <span
                                    className="gp-chip-dot"
                                    style={{
                                        background: FORMAT_COLORS[index % FORMAT_COLORS.length],
                                    }}
                                />
                                {entry.name}: {entry.value}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
