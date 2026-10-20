'use client';

import { useTheme } from 'next-themes';
import {
    LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer,
} from 'recharts';
import { ProjectMetrics } from '@/types/dashboard';
import { LeaderboardEntry } from '@/lib/processData';
import CollapsibleCard from './CollapsibleCard';

interface Props {
    sprintData: ProjectMetrics['sprintData'];
    leaderboard: LeaderboardEntry[];
}

const TEAM_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
];

function useChartTheme() {
    const { resolvedTheme } = useTheme();
    const dark = resolvedTheme === 'dark';
    return {
        grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        axis: dark ? '#71717a' : '#a1a1aa',
        dark,
        tooltip: {
            contentStyle: {
                backgroundColor: dark ? '#1c1c1e' : '#ffffff',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '0.625rem',
                color: dark ? '#fafafa' : '#0a0a0a',
                fontSize: '0.8125rem',
            },
            labelStyle: { color: dark ? '#fafafa' : '#0a0a0a', fontWeight: 600 },
            itemStyle: { color: dark ? '#a1a1aa' : '#71717a' },
            cursor: false as const,
        },
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SumTooltip({ active, payload, label, dark }: any) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: { value: number }) => s + (p.value ?? 0), 0);
    const bg    = dark ? '#1c1c1e' : '#ffffff';
    const br    = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const fg    = dark ? '#fafafa' : '#0a0a0a';
    const muted = dark ? '#a1a1aa' : '#71717a';
    return (
        <div style={{ backgroundColor: bg, border: `1px solid ${br}`, borderRadius: '0.625rem', padding: '8px 12px', fontSize: '0.8125rem' }}>
            <p style={{ color: fg, fontWeight: 600, marginBottom: 6 }}>{label}</p>
            {payload.map((p: { name: string; value: number }) => (
                <p key={p.name} style={{ color: muted, margin: '2px 0' }}>
                    {p.name} : {(p.value ?? 0).toFixed(1)} h
                </p>
            ))}
            <p style={{ color: fg, fontWeight: 600, borderTop: `1px solid ${br}`, marginTop: 6, paddingTop: 6 }}>
                Σ {total.toFixed(1)} h
            </p>
        </div>
    );
}

export default function HoursPerCycleChart({ sprintData, leaderboard }: Props) {
    const ct = useChartTheme();

    if (sprintData.length === 0) {
        return (
            <CollapsibleCard title="Stunden pro Zyklus">
                <p className="text-sm text-muted-foreground">Keine Sprint-Daten verfügbar</p>
            </CollapsibleCard>
        );
    }

    const members = leaderboard.map(e => e.name);

    const chartData = sprintData.map(sp => {
        const row: Record<string, string | number> = { sprint: `Sprint ${sp.sprintNumber}` };
        members.forEach(name => {
            row[name] = +(sp.userHours[name] ?? 0).toFixed(2);
        });
        return row;
    });

    return (
        <CollapsibleCard title="Stunden pro Zyklus">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis
                        dataKey="sprint"
                        tick={{ fill: ct.axis, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: ct.axis, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        unit=" h"
                    />
                    <Tooltip
                        content={<SumTooltip dark={ct.dark} />}
                        cursor={false}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '0.75rem', color: ct.axis }}
                        iconType="circle"
                        iconSize={8}
                    />
                    {members.map((name) => (
                        <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={TEAM_COLORS[members.indexOf(name) % TEAM_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </CollapsibleCard>
    );
}
