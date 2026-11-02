'use client';

import { useTheme } from 'next-themes';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip,
    PieChart, Pie, Cell,
} from 'recharts';
import { UserCategoryRow } from '@/types/dashboard';
import { COLORS as CFG_COLORS, CHART_CONFIG, TOOLTIP_LABELS } from '@/config/dashboardConfig';
import CollapsibleCard from './CollapsibleCard';

interface Props {
    userCategoryMatrix: UserCategoryRow[];
    keys: string[];
    pieData: Array<{ name: string; value: number }>;
}

function useChartTheme() {
    const { resolvedTheme } = useTheme();
    const dark = resolvedTheme === 'dark';
    return {
        grid: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
        axis: dark ? '#71717a' : '#a1a1aa',
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

const TEAM_COLORS = CFG_COLORS.TEAM;

export default function RadarCategoryChart({ userCategoryMatrix, keys, pieData }: Props) {
    const ct = useChartTheme();

    if (userCategoryMatrix.length === 0) {
        return (
            <CollapsibleCard title="Kategorie-Verteilung">
                <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
            </CollapsibleCard>
        );
    }

    const teamAvg = keys.map(cat => {
        const total = userCategoryMatrix.reduce((s, r) => s + (r[cat] as number ?? 0), 0);
        return { category: cat, Durchschnitt: +(total / userCategoryMatrix.length).toFixed(2) };
    });

    const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

    return (
        <CollapsibleCard title="Kategorie-Verteilung">
            {/* Pie + Legend + Radar side by side */}
            <div className="flex flex-row items-start gap-6">
                {/* Pie chart with legend */}
                <div className="flex items-center gap-6 shrink-0">
                    <div style={{ width: 200, height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    dataKey="value"
                                    data={pieData}
                                    outerRadius={85}
                                    innerRadius={38}
                                    label={false}
                                    labelLine={false}
                                >
                                    {pieData.map(entry => (
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
                    <div className="flex flex-col gap-2">
                        {[...pieData].sort((a, b) => b.value - a.value).map(entry => {
                            const color = CFG_COLORS.CATEGORY[entry.name as keyof typeof CFG_COLORS.CATEGORY] ?? '#94a3b8';
                            const pct = pieTotal > 0 ? (entry.value / pieTotal * 100).toFixed(1) : '0.0';
                            return (
                                <div key={entry.name} className="flex items-center gap-2 min-w-0">
                                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                                    <span className="text-sm text-foreground truncate flex-1">{entry.name}</span>
                                    <span className="text-sm tabular-nums text-muted-foreground shrink-0">{entry.value.toFixed(1)}h</span>
                                    <span className="text-xs tabular-nums text-muted-foreground/60 shrink-0 w-10 text-right">{pct}%</span>
                                </div>
                            );
                        })}
                        <div className="flex items-center gap-2 min-w-0 border-t border-border pt-2 mt-1">
                            <span className="h-3 w-3 shrink-0" />
                            <span className="text-sm font-semibold text-foreground flex-1">Σ Gesamt</span>
                            <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">{pieTotal.toFixed(1)}h</span>
                            <span className="text-xs tabular-nums text-muted-foreground/60 shrink-0 w-10 text-right">100%</span>
                        </div>
                    </div>
                </div>

                {/* Team Radar */}
                <div className="flex-1 min-w-0" style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={teamAvg} cx="50%" cy="50%" outerRadius="65%">
                            <PolarGrid stroke={ct.grid} />
                            <PolarAngleAxis
                                dataKey="category"
                                tick={{ fill: ct.axis, fontSize: 12 }}
                            />
                            <PolarRadiusAxis
                                tick={{ fill: ct.axis, fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                {...ct.tooltip}
                                formatter={(v: number) => [`${v.toFixed(1)} h`, 'Ø Team']}
                                cursor={false}
                                wrapperStyle={{ zIndex: 50 }}
                            />
                            <Radar
                                name="Ø Team"
                                dataKey="Durchschnitt"
                                stroke="#8884d8"
                                fill="#8884d8"
                                fillOpacity={0.4}
                                dot={{ r: 3, fill: '#8884d8' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Per-person mini radars */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {userCategoryMatrix.map((row, i) => {
                    const color = TEAM_COLORS[i % TEAM_COLORS.length];
                    const personData = keys.map(cat => ({
                        category: cat,
                        value: +(row[cat] as number ?? 0),
                    }));
                    return (
                        <div key={row.name}>
                            <p className="text-xs font-medium mb-1" style={{ color }}>{row.name}</p>
                            <div style={{ height: 120 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={personData} cx="50%" cy="50%" outerRadius="65%">
                                        <PolarGrid stroke={ct.grid} />
                                        <PolarAngleAxis dataKey="category" tick={{ fill: ct.axis, fontSize: 9 }} />
                                        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>
        </CollapsibleCard>
    );
}
