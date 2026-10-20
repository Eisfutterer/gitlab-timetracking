'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import { CHART_CONFIG, CHART_TITLES, TOOLTIP_LABELS, CHART_LABELS } from '@/config/dashboardConfig';
import { IssueComplexityData } from '@/types/dashboard';
import CollapsibleCard from './CollapsibleCard';

interface IssueAnalysisProps {
    issueComplexityData: IssueComplexityData[];
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

const IssueAnalysis: React.FC<IssueAnalysisProps> = ({ issueComplexityData, COLORS }) => {
    const ct = useChartTheme();

    return (
        <CollapsibleCard title="Issue Analyse">
            <div className="grid grid-cols-1 gap-6">
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.ISSUE_COMPLEXITY}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <BarChart data={issueComplexityData} margin={{ bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis
                                dataKey="category"
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                angle={CHART_CONFIG.ANGLES.LABEL_ROTATION}
                                textAnchor="end"
                                height={80}
                                interval={0}
                            />
                            <YAxis
                                tick={{ fill: ct.axis, fontSize: 12 }}
                                label={{
                                    value: 'Ø Zeit (h)',
                                    angle: -90,
                                    position: 'insideLeft',
                                    fill: ct.axis,
                                    style: { textAnchor: 'middle' },
                                }}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, TOOLTIP_LABELS.HOURS]}
                                labelFormatter={(label) => `${label}`}
                                {...ct.tooltip}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            <Bar dataKey="averageTime" name={CHART_LABELS.AVERAGE_TIME_PER_ISSUE} radius={[3, 3, 0, 0]}>
                                {issueComplexityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </CollapsibleCard>
    );
};

export default IssueAnalysis;
 