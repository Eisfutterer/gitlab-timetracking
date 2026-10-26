'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import { CHART_CONFIG, CHART_TITLES, TOOLTIP_LABELS, CHART_LABELS } from '@/config/dashboardConfig';
import { ProductivityPatterns } from '@/types/dashboard';
import CollapsibleCard from './CollapsibleCard';

interface ProductivityAnalysisProps {
    productivityPatterns: ProductivityPatterns;
}

function useChartTheme() {
    const { resolvedTheme } = useTheme();
    const dark = resolvedTheme === 'dark';
    return {
        grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        axis: dark ? '#71717a' : '#a1a1aa',
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

const ProductivityAnalysis: React.FC<ProductivityAnalysisProps> = ({ productivityPatterns }) => {
    const ct = useChartTheme();

    return (
        <CollapsibleCard title="Produktivitätsanalyse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hourly Pattern */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.HOURLY_DISTRIBUTION}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <BarChart data={productivityPatterns.hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis
                                dataKey="hour"
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                label={{ value: 'Uhrzeit', position: 'bottom', fill: ct.axis }}
                            />
                            <YAxis
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                label={{ value: TOOLTIP_LABELS.HOURS, angle: -90, position: 'insideLeft', fill: ct.axis }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                {...ct.tooltip}
                            />
                            <Bar dataKey="value" name={CHART_LABELS.WORK_TIME} radius={[3, 3, 0, 0]}>
                                {productivityPatterns.hourlyData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.hour === productivityPatterns.peakHour.hour ? '#4ade80' : '#8884d8'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Weekly Pattern */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.WEEKLY_DISTRIBUTION}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <BarChart data={productivityPatterns.weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis
                                dataKey="day"
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                label={{ value: 'Wochentag', position: 'bottom', fill: ct.axis }}
                            />
                            <YAxis
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                label={{ value: TOOLTIP_LABELS.HOURS, angle: -90, position: 'insideLeft', fill: ct.axis }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                {...ct.tooltip}
                            />
                            <Bar dataKey="value" name={CHART_LABELS.WORK_TIME} radius={[3, 3, 0, 0]}>
                                {productivityPatterns.weeklyData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.day === productivityPatterns.peakDay.day ? '#4ade80' : '#82ca9d'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </CollapsibleCard>
    );
};

export default ProductivityAnalysis;
