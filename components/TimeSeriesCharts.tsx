'use client';

import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, Line, LineChart, Area, AreaChart, ReferenceLine
} from 'recharts';
import { CHART_CONFIG, CHART_TITLES, TOOLTIP_LABELS, COLORS as CFG_COLORS } from '../config/dashboardConfig';
import { ProjectMetrics } from '@/types/dashboard';
import CollapsibleCard from './CollapsibleCard';

interface TimeSeriesChartsProps {
    projectMetrics: ProjectMetrics;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lineData: Array<Record<string, any>>;
    barData: Array<{name: string; value: number}>;
    TEAM_COLORS: string[];
    COLORS: string[];
}

function useChartTheme() {
    const { resolvedTheme } = useTheme();
    const dark = resolvedTheme === 'dark';
    return {
        grid:    dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        axis:    dark ? '#71717a' : '#a1a1aa',
        dark,
        tooltip: {
            contentStyle: {
                backgroundColor: dark ? '#1c1c1e' : '#ffffff',
                border:          `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius:    '0.625rem',
                color:           dark ? '#fafafa' : '#0a0a0a',
                fontSize:        '0.8125rem',
            },
            labelStyle: { color: dark ? '#fafafa' : '#0a0a0a', fontWeight: 600 },
            itemStyle:  { color: dark ? '#a1a1aa' : '#71717a' },
            cursor:     { fill: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
        },
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SumTooltip({ active, payload, label, dark, labelPrefix }: any) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: { value: number }) => s + (p.value ?? 0), 0);
    const bg  = dark ? '#1c1c1e' : '#ffffff';
    const br  = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const fg  = dark ? '#fafafa' : '#0a0a0a';
    const muted = dark ? '#a1a1aa' : '#71717a';
    const displayLabel = labelPrefix ? `${labelPrefix}${label}` : label;
    return (
        <div style={{ backgroundColor: bg, border: `1px solid ${br}`, borderRadius: '0.625rem', padding: '8px 12px', fontSize: '0.8125rem' }}>
            <p style={{ color: fg, fontWeight: 600, marginBottom: 6 }}>{displayLabel}</p>
            {payload.map((p: { name: string; value: number; color: string }) => (
                <p key={p.name} style={{ color: muted, margin: '2px 0' }}>
                    {p.name} : {(p.value ?? 0).toFixed(2)}h
                </p>
            ))}
            <p style={{ color: fg, fontWeight: 600, borderTop: `1px solid ${br}`, marginTop: 6, paddingTop: 6 }}>
                Σ {total.toFixed(2)} h
            </p>
        </div>
    );
}

const TimeSeriesCharts: React.FC<TimeSeriesChartsProps> = ({
    projectMetrics,
    lineData,
    barData,
    TEAM_COLORS,
    COLORS
}) => {
    const ct = useChartTheme();

    const sortedLineData = useMemo(() => lineData, [lineData]);

    // Flatten categoryHours onto each sprint data point so Recharts can access them directly
    const flatSprintData = useMemo(() =>
        projectMetrics.sprintData.map(sp => ({
            ...sp,
            ...sp.categoryHours,
        })),
        [projectMetrics.sprintData]
    );

    const categoryKeys = Object.keys(projectMetrics.sprintData[0]?.categoryHours ?? {});

    return (
        <div>
            <CollapsibleCard title="Zeitliche Entwicklung">
            <div className="grid grid-cols-1 gap-6">
                {/* Line Chart - Hours per Week per Person */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.HOURS_PER_WEEK_PER_PERSON}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <LineChart data={sortedLineData}>
                            <XAxis
                                dataKey="week"
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                tickFormatter={(value) => value}
                            />
                            <YAxis
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                label={{ value: TOOLTIP_LABELS.HOURS, angle: -90, position: 'insideLeft', fill: ct.axis }}
                            />
                            <Tooltip
                                content={<SumTooltip dark={ct.dark} />}
                                cursor={false}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            {barData.map((entry, index) => (
                                <Line
                                    key={index}
                                    type="monotone"
                                    dataKey={entry.name}
                                    stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    name={entry.name}
                                />
                            ))}
                            <ReferenceLine
                                y={projectMetrics.averageVelocity / barData.length}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                label={{
                                    value: 'Team Ø',
                                    position: 'right',
                                    fill: '#ef4444',
                                    fontSize: 11,
                                }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Trend */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.CATEGORY_TREND}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.SMALL}>
                        <AreaChart data={flatSprintData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="sprintStart" tick={{ fill: ct.axis, fontSize: 12 }} />
                            <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                            <Tooltip
                                content={<SumTooltip dark={ct.dark} />}
                                cursor={false}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            {categoryKeys.map((category, index) => {
                                const color = CFG_COLORS.CATEGORY[category as keyof typeof CFG_COLORS.CATEGORY] ?? COLORS[index % COLORS.length];
                                return (
                                    <Area
                                        key={category}
                                        type="monotone"
                                        dataKey={category}
                                        stackId="1"
                                        stroke={color}
                                        fill={color}
                                        fillOpacity={0.6}
                                        name={category}
                                    />
                                );
                            })}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            </CollapsibleCard>
        </div>
    );
};

export default TimeSeriesCharts;
