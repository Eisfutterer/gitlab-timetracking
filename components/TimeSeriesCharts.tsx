'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, Line, LineChart, Area, AreaChart, ReferenceLine
} from 'recharts';
import { CHART_CONFIG, CHART_TITLES, TOOLTIP_LABELS } from '../config/dashboardConfig';
import { ProjectMetrics } from '@/types/dashboard';

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
        },
    };
}

const TimeSeriesCharts: React.FC<TimeSeriesChartsProps> = ({
    projectMetrics,
    lineData,
    barData,
    TEAM_COLORS,
    COLORS
}) => {
    const ct = useChartTheme();

    return (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">Zeitliche Entwicklung</h2>
            <div className="grid grid-cols-1 gap-6">
                {/* Velocity Chart */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.WEEKLY_PERFORMANCE}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.SMALL}>
                        <BarChart data={projectMetrics.sprintData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="sprintStart" tick={{ fill: ct.axis, fontSize: 12 }} />
                            <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS_PER_WEEK]}
                                {...ct.tooltip}
                            />
                            <Bar dataKey="totalHours" fill="#82ca9d" name={TOOLTIP_LABELS.HOURS_PER_WEEK} radius={[3, 3, 0, 0]} />
                            <ReferenceLine
                                y={projectMetrics.averageVelocity}
                                stroke="#ef4444"
                                label={{ value: 'Durchschnitt', position: 'right', fill: ct.axis, fontSize: 11 }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Cumulative Progress */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.CUMULATIVE_PROGRESS}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.SMALL}>
                        <AreaChart data={projectMetrics.sprintData.map((sprint, index, array) => ({
                            sprint: `Sprint ${index + 1}`,
                            cumulativeHours: array
                                .slice(0, index + 1)
                                .reduce((sum, s) => sum + s.totalHours, 0)
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="sprint" tick={{ fill: ct.axis, fontSize: 12 }} />
                            <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.TOTAL_HOURS]}
                                {...ct.tooltip}
                            />
                            <Area
                                type="monotone"
                                dataKey="cumulativeHours"
                                stroke="#8884d8"
                                fill="#8884d8"
                                fillOpacity={0.3}
                                name="Kumulierte Stunden"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Team Activity Comparison */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.TEAM_ACTIVITY_COMPARISON}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.SMALL}>
                        <BarChart data={projectMetrics.sprintData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="sprintStart" tick={{ fill: ct.axis, fontSize: 12 }} />
                            <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                            <Tooltip
                                labelFormatter={(value) => `Sprint ${value}`}
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                {...ct.tooltip}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            {Object.keys(projectMetrics.sprintData[0]?.userHours || {}).map((user, index) => (
                                <Bar
                                    key={user}
                                    dataKey={`userHours.${user}`}
                                    name={user}
                                    stackId="a"
                                    fill={TEAM_COLORS[index % TEAM_COLORS.length]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Line Chart - Hours per Week per Person */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.HOURS_PER_WEEK_PER_PERSON}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <LineChart data={(() => {
                            return [...lineData].sort((a, b) => {
                                const [weekA, yearA] = a.week.split(' ')[1].split('/');
                                const [weekB, yearB] = b.week.split(' ')[1].split('/');
                                return (parseInt(yearA) * 100 + parseInt(weekA)) - (parseInt(yearB) * 100 + parseInt(weekB));
                            });
                        })()}>
                            <XAxis
                                dataKey="week"
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                tickFormatter={(value) => `KW ${value.split(' ')[1]}`}
                            />
                            <YAxis
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                label={{ value: TOOLTIP_LABELS.HOURS, angle: -90, position: 'insideLeft', fill: ct.axis }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value}h`, TOOLTIP_LABELS.HOURS]}
                                labelFormatter={(value) => `Kalenderwoche ${value.split(' ')[1]}`}
                                {...ct.tooltip}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            {barData.map((entry, index) => (
                                <Line
                                    key={index}
                                    type="basis"
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
                        <AreaChart data={projectMetrics.sprintData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="sprintStart" tick={{ fill: ct.axis, fontSize: 12 }} />
                            <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                            <Tooltip
                                labelFormatter={(value) => `Sprint ${value}`}
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                {...ct.tooltip}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            {Object.keys(projectMetrics.sprintData[0]?.categoryHours || {}).map((category, index) => (
                                <Area
                                    key={category}
                                    type="basis"
                                    dataKey={`categoryHours.${category}`}
                                    stackId="1"
                                    stroke={COLORS[index % COLORS.length]}
                                    fill={COLORS[index % COLORS.length]}
                                    fillOpacity={0.6}
                                    name={category}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TimeSeriesCharts;
