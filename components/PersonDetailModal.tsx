'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PersonDetail } from '@/types/dashboard';
import { LeaderboardEntry } from '@/lib/processData';
import { ProjectMetrics } from '@/types/dashboard';
import { CATEGORY_LIST } from '@/config/dashboardConfig';

const ALL_CATEGORIES = [...CATEGORY_LIST, 'Sonstige'] as const;

interface Props {
    person: (PersonDetail & LeaderboardEntry) | null;
    onClose: () => void;
    sprintData: ProjectMetrics['sprintData'];
}

const CATEGORY_COLORS: Record<string, string> = {
    'Projektmanagement':       '#FF8042',
    'Requirements Engineering': '#8884D8',
    'Implementierung':          '#0088FE',
    'Architektur & Design':     '#00C49F',
    'Sonstige':                 '#a1a1aa',
};

export default function PersonDetailModal({ person, onClose, sprintData }: Props) {
    const { resolvedTheme } = useTheme();
    const dark = resolvedTheme === 'dark';
    const chartTheme = {
        grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        axis: dark ? '#71717a' : '#a1a1aa',
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
    useEffect(() => {
        if (!person) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [person, onClose]);

    if (!person) return null;

    const totalCatHours = Object.values(person.categoryHours).reduce((s, v) => s + v, 0);
    const maxSprintHours = Math.max(...person.hoursBySprintNumber, 0.01);

    const categoryRows = ALL_CATEGORIES.map(cat => ({
        name: cat,
        hours: person.categoryHours[cat] ?? 0,
        pct: totalCatHours > 0 ? ((person.categoryHours[cat] ?? 0) / totalCatHours) * 100 : 0,
        color: CATEGORY_COLORS[cat] ?? '#a1a1aa',
    }));

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card ring-1 ring-foreground/10 p-6"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">{person.name}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Rang #{person.rank} · {person.issueCount} Issues
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: 'Gesamtstunden', value: `${person.hours.toFixed(1)} h` },
                        { label: 'Gruppenanteil', value: `${person.percentage.toFixed(1)}%` },
                        { label: 'Issues', value: String(person.issueCount) },
                    ].map(kpi => (
                        <div key={kpi.label} className="rounded-xl bg-background ring-1 ring-foreground/8 p-4">
                            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                            <p className="text-lg font-semibold text-foreground">{kpi.value}</p>
                        </div>
                    ))}
                </div>

                {/* Category breakdown */}
                <div className="mb-6">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Kategorien</p>
                    <div className="space-y-3">
                        {categoryRows.filter(r => r.hours > 0).map(row => (
                            <div key={row.name}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: row.color }}
                                        />
                                        <span className="text-foreground truncate">{row.name}</span>
                                    </div>
                                    <span className="text-muted-foreground tabular-nums shrink-0 ml-3">
                                        {row.hours.toFixed(1)} h ({row.pct.toFixed(0)}%)
                                    </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(100, row.pct)}%`, backgroundColor: row.color }}
                                    />
                                </div>
                            </div>
                        ))}
                        {categoryRows.every(r => r.hours === 0) && (
                            <p className="text-sm text-muted-foreground">Keine Kategorien erfasst</p>
                        )}
                    </div>
                </div>

                {/* Time by sprint */}
                {person.hoursBySprintNumber.length > 0 && (
                    <div className="mb-6">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Zeit pro KW</p>
                        <div className="space-y-2">
                            {person.hoursBySprintNumber.map((h, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <span className="w-28 shrink-0 text-muted-foreground">
                                        {sprintData[i]?.sprintStart ?? `KW ${i + 1}`}
                                    </span>
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-foreground/40 transition-all"
                                            style={{ width: `${Math.min(100, (h / maxSprintHours) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="w-12 text-right text-foreground tabular-nums">
                                        {h.toFixed(1)} h
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cumulative hours chart */}
                {person.hoursBySprintNumber.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Kumulativer Fortschritt</p>
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart
                                data={person.hoursBySprintNumber.map((_, i) => ({
                                    sprint: sprintData[i]?.sprintStart ?? `KW ${i + 1}`,
                                    kumuliert: +person.hoursBySprintNumber.slice(0, i + 1).reduce((s, v) => s + v, 0).toFixed(2),
                                }))}
                                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                <XAxis dataKey="sprint" tick={{ fill: chartTheme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: chartTheme.axis, fontSize: 11 }} axisLine={false} tickLine={false} unit=" h" />
                                <Tooltip
                                    formatter={(v: number) => [`${v.toFixed(1)} h`, 'Kumuliert']}
                                    contentStyle={chartTheme.tooltip.contentStyle}
                                    labelStyle={chartTheme.tooltip.labelStyle}
                                    itemStyle={chartTheme.tooltip.itemStyle}
                                    cursor={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="kumuliert"
                                    stroke="#8884d8"
                                    fill="#8884d8"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: '#8884d8' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
