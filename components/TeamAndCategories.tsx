'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import { CHART_CONFIG, CHART_TITLES, TOOLTIP_LABELS, COLORS as CFG_COLORS } from '../config/dashboardConfig';
import CollapsibleCard from './CollapsibleCard';

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
            cursor:     { fill: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
        },
    };
}

const TeamAndCategories: React.FC<TeamAndCategoriesProps> = ({ pieData, barData, COLORS }) => {
    const ct = useChartTheme();

    return (
        <CollapsibleCard title="Team & Kategorien">
            <div className="grid grid-cols-1 gap-6">
                {/* Category Distribution */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.CATEGORY_DISTRIBUTION}</h4>
                    <div className="flex items-center gap-6">
                        <div className="shrink-0" style={{ width: 220, height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        dataKey="value"
                                        data={pieData}
                                        outerRadius={90}
                                        innerRadius={40}
                                        label={false}
                                        labelLine={false}
                                    >
                                        {pieData.map((entry) => (
                                            <Cell
                                                key={`cell-${entry.name}`}
                                                fill={CFG_COLORS.CATEGORY[entry.name as keyof typeof CFG_COLORS.CATEGORY] ?? '#94a3b8'}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                        contentStyle={ct.tooltip.contentStyle}
                                        labelStyle={ct.tooltip.labelStyle}
                                        itemStyle={ct.tooltip.itemStyle}
                                        wrapperStyle={{ zIndex: 50 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Custom legend with values */}
                        <div className="flex flex-col gap-2 min-w-0">
                            {(() => {
                                const total = pieData.reduce((s, d) => s + d.value, 0);
                                return [
                                    ...pieData
                                        .slice()
                                        .sort((a, b) => b.value - a.value)
                                        .map(entry => {
                                            const color = CFG_COLORS.CATEGORY[entry.name as keyof typeof CFG_COLORS.CATEGORY] ?? '#94a3b8';
                                            const pct = total > 0 ? (entry.value / total * 100).toFixed(1) : '0.0';
                                            return (
                                                <div key={entry.name} className="flex items-center gap-2 min-w-0">
                                                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                                                    <span className="text-sm text-foreground truncate flex-1">{entry.name}</span>
                                                    <span className="text-sm tabular-nums text-muted-foreground shrink-0">
                                                        {entry.value.toFixed(1)}h
                                                    </span>
                                                    <span className="text-xs tabular-nums text-muted-foreground/60 shrink-0 w-10 text-right">
                                                        {pct}%
                                                    </span>
                                                </div>
                                            );
                                        }),
                                    <div key="__total" className="flex items-center gap-2 min-w-0 border-t border-border pt-2 mt-1">
                                        <span className="h-3 w-3 shrink-0" />
                                        <span className="text-sm font-semibold text-foreground flex-1">Σ Gesamt</span>
                                        <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                                            {total.toFixed(1)}h
                                        </span>
                                        <span className="text-xs tabular-nums text-muted-foreground/60 shrink-0 w-10 text-right">
                                            100%
                                        </span>
                                    </div>,
                                ];
                            })()}
                        </div>
                    </div>
                </div>

            </div>
        </CollapsibleCard>
    );
};

export default TeamAndCategories;
