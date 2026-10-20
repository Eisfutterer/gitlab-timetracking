'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import { CHART_CONFIG, CHART_TITLES, TOOLTIP_LABELS, CHART_LABELS, DISPLAY_CONFIG } from '../config/dashboardConfig';
import { CollaborationData, AverageTeamMembersData } from '@/types/dashboard';
import CollapsibleCard from './CollapsibleCard';

interface TeamCollaborationProps {
    collaborationData: CollaborationData[];
    averageTeamMembersData: AverageTeamMembersData[];
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

const TeamCollaboration: React.FC<TeamCollaborationProps> = ({
    collaborationData,
    averageTeamMembersData,
    COLORS
}) => {
    const ct = useChartTheme();

    return (
        <CollapsibleCard title="Team Zusammenarbeit">
            <div className="grid grid-cols-1 gap-6">
                {/* Top Collaborations */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.TOP_COLLABORATIONS}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {collaborationData.slice(0, DISPLAY_CONFIG.TOP_COLLABORATIONS).map((collab, index) => (
                            <div key={index} className="rounded-lg bg-muted/50 p-4 ring-1 ring-foreground/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {collab.source} + {collab.target}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {collab.value} gemeinsame Issues
                                        </p>
                                    </div>
                                    <span className="text-xl font-bold text-muted-foreground">#{index + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Average Team Members per Issue */}
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.AVERAGE_TEAM_SIZE}</h4>
                    <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                        <BarChart data={averageTeamMembersData} margin={{ bottom: 60 }}>
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
                                    value: 'Ø Teammitglieder',
                                    angle: -90,
                                    position: 'insideLeft',
                                    fill: ct.axis,
                                    style: { textAnchor: 'middle' },
                                }}
                                domain={[0, 'dataMax + 1']}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}`, TOOLTIP_LABELS.TEAM_MEMBERS]}
                                labelFormatter={(label) => `${label}`}
                                {...ct.tooltip}
                            />
                            <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                            <Bar dataKey="averageMembers" name={CHART_LABELS.TEAM_SIZE} radius={[3, 3, 0, 0]}>
                                {averageTeamMembersData.map((entry, index) => (
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

export default TeamCollaboration;
