'use client';

import { useTheme } from 'next-themes';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { LabelTimelinePoint } from '@/types/dashboard';
import { COLORS } from '@/config/dashboardConfig';
import CollapsibleCard from './CollapsibleCard';

interface Props {
    data: LabelTimelinePoint[];
    keys: string[];
}

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
            labelStyle: { color: dark ? '#fafafa' : '#0a0a0a', fontWeight: 600 as const },
            itemStyle: { color: dark ? '#a1a1aa' : '#71717a' },
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

export default function LabelsTimeline({ data, keys }: Props) {
    const ct = useChartTheme();

    return (
        <CollapsibleCard title="Kategorie-Zeitverlauf (kumuliert)">
            {data.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: ct.axis }} />
                        <YAxis tick={{ fontSize: 11, fill: ct.axis }} unit="h" />
                        <Tooltip
                            content={<SumTooltip dark={ct.dark} />}
                            cursor={false}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {keys.map((key, i) => (
                            <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stackId="1"
                                stroke={COLORS.PRIMARY[i % COLORS.PRIMARY.length]}
                                fill={COLORS.PRIMARY[i % COLORS.PRIMARY.length]}
                                fillOpacity={0.4}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </CollapsibleCard>
    );
}
