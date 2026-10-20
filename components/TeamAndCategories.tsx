'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { CHART_CONFIG, CHART_TITLES, TOOLTIP_LABELS } from '../config/dashboardConfig';

interface TeamAndCategoriesProps {
    pieData: Array<{ name: string; value: number }>;
    barData: Array<{ name: string; value: number }>;
    COLORS: string[];
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
        },
    };
}

const TeamAndCategories: React.FC<TeamAndCategoriesProps> = ({ pieData, barData, COLORS }) => {
    const ct = useChartTheme();

    return (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">Team & Kategorien</h2>
            <div className="grid grid-cols-1 gap-6">
                {/* Category Distribution */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.CATEGORY_DISTRIBUTION}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <PieChart>
                            <Pie
                                dataKey="value"
                                data={pieData}
                                outerRadius={100}
                                label={({ name, value }) =>
                                    value !== undefined ? `${name}\n${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h` : name
                                }
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                {...ct.tooltip}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Team Activity */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.TEAM_ACTIVITY}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="name" tick={{ fill: ct.axis, fontSize: 12 }} />
                            <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                {...ct.tooltip}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            <Bar dataKey="value" fill="#8884d8" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TeamAndCategories;
