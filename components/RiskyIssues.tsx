"use client"

import React, { useState, useRef } from 'react';
import { AlertTriangle, CalendarX, FileX, ExternalLink, TrendingUp, Users, ShieldAlert, User, ChevronDown, Tag, Clock, GitBranch } from 'lucide-react';
import { Issue, UserCategoryRow } from '../types/dashboard';
import { LeaderboardEntry } from '../lib/processData';
import { COLORS, CATEGORIES, resolveCategoryLabel } from '../config/dashboardConfig';
import CollapsibleCard from './CollapsibleCard';

interface RiskyIssuesProps {
    issues: Issue[];
    leaderboard?: LeaderboardEntry[];
    userCategoryMatrix?: UserCategoryRow[];
}

type RiskReason = 'no_description' | 'no_dates' | 'high_deviation' | 'no_estimate' | 'no_label' | 'no_epic';

interface RiskyIssue {
    issue: Issue;
    reasons: RiskReason[];
    categoryColor: string;
    deviation: number | null;
}

const DEVIATION_THRESHOLD = 30;

// ── Risk Score ──────────────────────────────────────────────────────────────
// Composed of three sub-scores (each 0–100), weighted:
//   40% Issue quality  (missing desc/dates + high deviation issues)
//   35% Person concentration (key-person dependency)
//   25% Category coverage (solo coverage per category)
function computeRiskScore(
    riskyIssues: RiskyIssue[],
    totalOpenIssues: number,
    leaderboard: LeaderboardEntry[],
    userCategoryMatrix: UserCategoryRow[],
): { score: number; issueScore: number; personScore: number; categoryScore: number } {
    // --- issue score ---
    const issueScore = totalOpenIssues === 0 ? 0
        : Math.min(100, Math.round((riskyIssues.length / totalOpenIssues) * 100));

    // --- person score ---
    // Based on how far the top contributor deviates from a fair equal share.
    // fair share = 100/n. At fair share → score 0. At 100% solo → score 100.
    // Formula: (topShare - fairShare) / (100 - fairShare) * 100
    const teamSize = leaderboard.length;
    const fairShare = teamSize > 0 ? 100 / teamSize : 100;
    const topShare = Math.max(...leaderboard.map(p => p.percentage), 0);
    const maxDeviation = 100 - fairShare; // worst case: one person holds everything
    const personScore = maxDeviation <= 0 ? 0
        : Math.min(100, Math.round(Math.max(0, topShare - fairShare) / maxDeviation * 100));

    // --- category score ---
    // for each canonical category: how many people contribute > 5 % of their hours there?
    const cats = Object.values(CATEGORIES);
    let soloCount = 0;
    cats.forEach(cat => {
        const contributors = userCategoryMatrix.filter(row => {
            const h = row[cat] as number | undefined;
            return h !== undefined && h > 0;
        });
        if (contributors.length === 1) soloCount++;
    });
    const categoryScore = Math.min(100, Math.round((soloCount / cats.length) * 100));

    const score = Math.min(100, Math.round(issueScore * 0.4 + personScore * 0.35 + categoryScore * 0.25));
    return { score, issueScore, personScore, categoryScore };
}

function scoreColor(s: number) {
    if (s >= 70) return { bar: '#ef4444', text: 'text-red-500', label: 'Hoch' };
    if (s >= 40) return { bar: '#f59e0b', text: 'text-amber-500', label: 'Mittel' };
    return { bar: '#22c55e', text: 'text-green-500', label: 'Niedrig' };
}

// ── Personal risk helpers ────────────────────────────────────────────────────
interface PersonRisk {
    name: string;
    percentage: number;       // share of total hours
    isSoloCoverage: string[]; // categories they alone cover
}

function computePersonRisks(
    leaderboard: LeaderboardEntry[],
    userCategoryMatrix: UserCategoryRow[],
): PersonRisk[] {
    const teamSize = leaderboard.length;
    const fairShare = teamSize > 0 ? 100 / teamSize : 100;
    const threshold = fairShare * 1.5;
    const cats = Object.values(CATEGORIES);

    return leaderboard
        .filter(p => p.percentage > threshold)
        .map(p => {
            const soloCategories = cats.filter(cat => {
                const contributors = userCategoryMatrix.filter(row => {
                    const h = row[cat] as number | undefined;
                    return h !== undefined && h > 0;
                });
                return contributors.length === 1 && contributors[0].name === p.name;
            });
            return { name: p.name, percentage: p.percentage, isSoloCoverage: soloCategories };
        });
}

// ── Issue helpers ────────────────────────────────────────────────────────────
function getCategoryColor(issue: Issue): string {
    for (const l of issue.labels.nodes) {
        const cat = resolveCategoryLabel(l.title);
        if (cat) return COLORS.CATEGORY[cat as keyof typeof COLORS.CATEGORY] ?? '#94a3b8';
    }
    return '#94a3b8';
}

function calcDeviation(issue: Issue): number | null {
    const est = issue.timeEstimate ?? 0;
    const spent = issue.totalTimeSpent ?? 0;
    if (est === 0) return null;
    return ((spent - est) / est) * 100;
}

const REASON_META: Record<RiskReason, { label: string; icon: React.ReactNode; color: string }> = {
    no_description: {
        label: 'Keine Beschreibung',
        icon: <FileX className="w-3 h-3" />,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    no_dates: {
        label: 'Kein Start-/Enddatum',
        icon: <CalendarX className="w-3 h-3" />,
        color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    },
    high_deviation: {
        label: 'Hohe Abweichung',
        icon: <TrendingUp className="w-3 h-3" />,
        color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    },
    no_estimate: {
        label: 'Keine Zeitschätzung',
        icon: <Clock className="w-3 h-3" />,
        color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    },
    no_label: {
        label: 'Kein Kategorie-Label',
        icon: <Tag className="w-3 h-3" />,
        color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    },
    no_epic: {
        label: 'Kein Epic',
        icon: <GitBranch className="w-3 h-3" />,
        color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    },
};

type FilterKey = 'all' | RiskReason;
type TabKey = 'all' | RiskReason | 'persons';

export default function RiskyIssues({ issues, leaderboard = [], userCategoryMatrix = [] }: RiskyIssuesProps) {
    const [tab, setTab] = useState<TabKey>('all');
    const [showFormula, setShowFormula] = useState(false);

    // ── compute risky issues ──
    const riskyIssues: RiskyIssue[] = issues
        .filter(i => i.state === 'opened')
        .reduce<RiskyIssue[]>((acc, issue) => {
            const noDesc    = !issue.description || issue.description.trim() === '';
            const noDates   = !issue.startDate || !issue.dueDate;
            const deviation = calcDeviation(issue);
            const highDev   = deviation !== null && Math.abs(deviation) > DEVIATION_THRESHOLD;
            const noEst     = (issue.timeEstimate ?? 0) === 0;
            const noLabel   = !issue.labels.nodes.some(l => resolveCategoryLabel(l.title) !== null);
            const noEpic    = !issue.epic;

            if (!noDesc && !noDates && !highDev && !noEst && !noLabel && !noEpic) return acc;

            const reasons: RiskReason[] = [];
            if (noLabel)  reasons.push('no_label');
            if (noEpic)   reasons.push('no_epic');
            if (noEst)    reasons.push('no_estimate');
            if (noDesc)   reasons.push('no_description');
            if (noDates)  reasons.push('no_dates');
            if (highDev)  reasons.push('high_deviation');
            acc.push({ issue, reasons, categoryColor: getCategoryColor(issue), deviation });
            return acc;
        }, [])
        .sort((a, b) => {
            if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
            const da = a.deviation !== null ? Math.abs(a.deviation) : 0;
            const db = b.deviation !== null ? Math.abs(b.deviation) : 0;
            return db - da;
        });

    const filtered = tab === 'all' || tab === 'persons'
        ? riskyIssues
        : riskyIssues.filter(r => r.reasons.includes(tab as RiskReason));

    const counts: Record<FilterKey, number> = {
        all:             riskyIssues.length,
        no_label:        riskyIssues.filter(r => r.reasons.includes('no_label')).length,
        no_epic:         riskyIssues.filter(r => r.reasons.includes('no_epic')).length,
        no_estimate:     riskyIssues.filter(r => r.reasons.includes('no_estimate')).length,
        no_description:  riskyIssues.filter(r => r.reasons.includes('no_description')).length,
        no_dates:        riskyIssues.filter(r => r.reasons.includes('no_dates')).length,
        high_deviation:  riskyIssues.filter(r => r.reasons.includes('high_deviation')).length,
    };

    // ── compute person risks ──
    const personRisks = computePersonRisks(leaderboard, userCategoryMatrix);

    // ── risk score ──
    const totalOpenIssues = issues.filter(i => i.state === 'opened').length;
    const { score, issueScore, personScore, categoryScore } = computeRiskScore(
        riskyIssues, totalOpenIssues, leaderboard, userCategoryMatrix
    );
    const sc = scoreColor(score);

    const extraBadge = (
        <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                score >= 70 ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                score >= 40 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                'text-green-500 bg-green-500/10 border-green-500/20'
            }`}>
                <ShieldAlert className="w-3 h-3" />
                Risiko {score}/100
            </span>
        </div>
    );

    return (
        <CollapsibleCard title="Risikobehaftete Issues" extra={extraBadge}>

            {/* ── Risk Score Section ── */}
            <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Gesamt-Risikoscore</p>
                        <div className="flex items-end gap-2">
                            <span className={`text-4xl font-bold tabular-nums ${sc.text}`}>{score}</span>
                            <span className="text-sm text-muted-foreground mb-1">/100 · {sc.label}</span>
                        </div>
                        <div className="mt-2 h-2 w-48 rounded-full bg-border overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: sc.bar }} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 text-xs min-w-[260px]">
                        {[
                            {
                                label: 'Issue-Qualität',
                                value: issueScore,
                                weight: '40%',
                                desc: `${riskyIssues.length} von ${totalOpenIssues} offenen Issues: kein Label, kein Epic, keine Schätzung, fehlende Beschreibung/Datum oder hohe Abweichung`,
                            },
                            {
                                label: 'Personenkonzentration',
                                value: personScore,
                                weight: '35%',
                                desc: `Wie ungleich die Stunden verteilt sind — hoher Wert bedeutet starke Abhängigkeit von einzelnen Personen`,
                            },
                            {
                                label: 'Kategorie-Abdeckung',
                                value: categoryScore,
                                weight: '25%',
                                desc: `Anzahl Kategorien, die nur von einer einzigen Person abgedeckt werden (Solo-Coverage)`,
                            },
                        ].map(({ label, value, weight, desc }) => {
                            const c = scoreColor(value);
                            return (
                                <div key={label}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-foreground">{label}</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: c.bar }} />
                                        </div>
                                        <span className={`w-8 text-right font-semibold tabular-nums ${c.text}`}>{value}</span>
                                        <span className="text-muted-foreground/60 w-8">{weight}</span>
                                    </div>
                                    <p className="text-muted-foreground/70 leading-tight">{desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Formula Toggle ── */}
            <div className="mb-6 -mt-2">
                <button
                    onClick={() => setShowFormula(v => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronDown className={`w-3 h-3 transition-transform ${showFormula ? 'rotate-180' : ''}`} />
                    Berechnung anzeigen
                </button>
                {showFormula && (
                    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 text-xs space-y-3">
                        <p className="font-semibold text-foreground">Score = 0.4 × Issue-Qualität + 0.35 × Personenkonzentration + 0.25 × Kategorie-Abdeckung</p>
                        <div className="space-y-2 text-muted-foreground">
                            <div>
                                <span className="font-medium text-foreground">Issue-Qualität</span>
                                <code className="ml-2 font-mono bg-muted px-1.5 py-0.5 rounded">riskyIssues / offeneIssues × 100</code>
                                <p className="mt-0.5">Anteil offener Issues mit mind. einem Risiko: kein Label, kein Epic, keine Schätzung, keine Beschreibung, kein Datum oder Abweichung &gt;{DEVIATION_THRESHOLD}%.</p>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">Personenkonzentration</span>
                                <code className="ml-2 font-mono bg-muted px-1.5 py-0.5 rounded">(topAnteil − fairAnteil) / (100 − fairAnteil) × 100</code>
                                <p className="mt-0.5">Wie weit der größte Stundenanteil vom gleichmäßigen fairen Anteil (100% / Teamgröße) abweicht. Bei perfekter Gleichverteilung → 0.</p>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">Kategorie-Abdeckung</span>
                                <code className="ml-2 font-mono bg-muted px-1.5 py-0.5 rounded">soloKategorien / alleKategorien × 100</code>
                                <p className="mt-0.5">Anteil der Kategorien, die nur von einer einzigen Person abgedeckt werden. Fällt diese Person aus, fehlt die Kategorie komplett.</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground/60 pt-1 border-t border-border">Skala: 0–39 Niedrig · 40–69 Mittel · 70–100 Hoch</p>
                    </div>
                )}
            </div>

            {/* ── Tab Switch ── */}
            <div className="flex gap-0 mb-4 border-b border-border overflow-x-auto">
                {/* Issues tabs */}
                {([
                    { key: 'all',            icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Alle Issues' },
                    { key: 'no_label',       icon: REASON_META.no_label.icon,       label: REASON_META.no_label.label },
                    { key: 'no_epic',        icon: REASON_META.no_epic.icon,        label: REASON_META.no_epic.label },
                    { key: 'no_estimate',    icon: REASON_META.no_estimate.icon,    label: REASON_META.no_estimate.label },
                    { key: 'no_description', icon: REASON_META.no_description.icon, label: REASON_META.no_description.label },
                    { key: 'no_dates',       icon: REASON_META.no_dates.icon,       label: REASON_META.no_dates.label },
                    { key: 'high_deviation', icon: REASON_META.high_deviation.icon, label: REASON_META.high_deviation.label },
                ] as const).map(({ key, icon, label }) => {
                    const count = key === 'all' ? riskyIssues.length : counts[key as RiskReason];
                    const active = tab === key;
                    const meta = key !== 'all' ? REASON_META[key as RiskReason] : null;
                    return (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
                                active
                                    ? `border-foreground text-foreground`
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <span className={active && meta ? meta.color.split(' ')[0] : ''}>{icon}</span>
                            {label}
                            <span className="opacity-60">({count})</span>
                        </button>
                    );
                })}
                {/* separator */}
                <div className="w-px bg-border mx-1 self-stretch my-1" />
                {/* Persons tab */}
                <button
                    onClick={() => setTab('persons')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
                        tab === 'persons'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    Personen
                    <span className="opacity-60">({personRisks.length})</span>
                </button>
            </div>
            {/* leftover from old tab code removed */}

            {/* ── Issues / Filter Tabs content ── */}
            {tab !== 'persons' && (
                <>
                    {filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">Keine Treffer.</p>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Issue</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Risiken</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Kategorie</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Geschätzt</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Tatsächlich</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Abweichung</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Assignee</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map(({ issue, reasons, categoryColor, deviation }) => {
                                    const category = (() => {
                                        for (const l of issue.labels.nodes) {
                                            const c = resolveCategoryLabel(l.title);
                                            if (c) return c;
                                        }
                                        return undefined;
                                    })();
                                    const assignees = issue.assignees?.nodes ?? [];
                                    const estH = (issue.timeEstimate ?? 0) / 3600;
                                    const spentH = (issue.totalTimeSpent ?? 0) / 3600;
                                    const absDeviation = deviation !== null ? Math.abs(deviation) : null;
                                    const deviationColor =
                                        deviation === null ? 'text-muted-foreground' :
                                        absDeviation! <= 10 ? 'text-green-500' :
                                        absDeviation! <= 30 ? 'text-yellow-500' :
                                        'text-red-500';

                                    return (
                                        <tr key={issue.webUrl} className="bg-card hover:bg-accent/30 transition-colors">
                                            <td className="px-4 py-2.5 max-w-[220px]">
                                                <a href={issue.webUrl} target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-1.5 hover:text-primary hover:underline transition-colors"
                                                >
                                                    <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
                                                    <span className="text-muted-foreground text-xs flex-shrink-0">#{issue.iid}</span>
                                                    <span className="truncate font-medium text-foreground">{issue.title}</span>
                                                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-40" />
                                                </a>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {reasons.map(r => {
                                                        const m = REASON_META[r];
                                                        return (
                                                            <span key={r} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${m.color}`}>
                                                                {m.icon}{m.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {category ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border"
                                                        style={{ color: categoryColor, backgroundColor: categoryColor + '15', borderColor: categoryColor + '30' }}
                                                    >
                                                        {category}
                                                    </span>
                                                ) : <span className="text-muted-foreground/40">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                                                {estH > 0 ? `${estH.toFixed(2)}h` : <span className="opacity-40">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-foreground whitespace-nowrap">
                                                {spentH > 0 ? `${spentH.toFixed(2)}h` : <span className="text-muted-foreground/40">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                {deviation === null ? (
                                                    <span className="text-muted-foreground/40 text-xs">—</span>
                                                ) : (
                                                    <span className={`text-xs font-semibold tabular-nums ${deviationColor}`}>
                                                        {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {assignees.length > 0
                                                    ? assignees.map(a => a.name).join(', ')
                                                    : <span className="opacity-40">—</span>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {counts.all > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground text-right">
                            {filtered.length} von {totalOpenIssues} offenen Issues · Abweichungsschwelle: &gt;{DEVIATION_THRESHOLD}%
                        </p>
                    )}
                </>
            )}

            {/* ── Persons Tab ── */}
            {tab === 'persons' && (
                <>
                    {personRisks.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-sm text-green-500 font-medium">Keine kritischen Personenabhängigkeiten erkannt.</p>
                            <p className="text-xs text-muted-foreground mt-1">Alle Teammitglieder tragen gleichmäßig bei.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {personRisks.map(({ name, percentage, isSoloCoverage }) => {
                                const teamSize = leaderboard.length;
                                const fairShare = teamSize > 0 ? 100 / teamSize : 100;
                                const overload = Math.round(percentage / fairShare * 10) / 10;
                                const severity = percentage > fairShare * 2.5 ? 'high' : 'medium';
                                return (
                                    <div key={name} className={`rounded-lg border p-4 ${severity === 'high' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-full ${severity === 'high' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                                                    <User className={`w-4 h-4 ${severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {percentage.toFixed(1)}% aller Stunden · {overload}× fairer Anteil
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                                severity === 'high'
                                                    ? 'text-red-500 bg-red-500/10 border-red-500/20'
                                                    : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                                            }`}>
                                                {severity === 'high' ? 'Kritisch' : 'Erhöht'}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-1.5">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <TrendingUp className="w-3 h-3 shrink-0" />
                                                <span>Schlüsselperson: hoher Stundenanteil birgt Ausfallrisiko</span>
                                            </div>
                                            {isSoloCoverage.length > 0 && (
                                                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                                    <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5" />
                                                    <span>
                                                        Einziger Contributor in:{' '}
                                                        {isSoloCoverage.map((cat, i) => (
                                                            <span key={cat}>
                                                                <span
                                                                    className="font-medium"
                                                                    style={{ color: COLORS.CATEGORY[cat as keyof typeof COLORS.CATEGORY] ?? '#94a3b8' }}
                                                                >
                                                                    {cat}
                                                                </span>
                                                                {i < isSoloCoverage.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* mini share bar */}
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${Math.min(100, percentage)}%`,
                                                        backgroundColor: severity === 'high' ? '#ef4444' : '#f59e0b',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{percentage.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* team overview mini-table */}
                    {leaderboard.length > 0 && (
                        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Person</th>
                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Stunden</th>
                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Anteil</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Verteilung</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {leaderboard.map(entry => {
                                        const fairShare = 100 / leaderboard.length;
                                        const isRisky = entry.percentage > fairShare * 1.5;
                                        return (
                                            <tr key={entry.name} className="bg-card">
                                                <td className={`px-3 py-2 font-medium ${isRisky ? 'text-amber-500' : 'text-foreground'}`}>
                                                    {entry.name}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                                    {entry.hours.toFixed(1)}h
                                                </td>
                                                <td className={`px-3 py-2 text-right tabular-nums font-semibold ${isRisky ? 'text-amber-500' : 'text-foreground'}`}>
                                                    {entry.percentage.toFixed(1)}%
                                                </td>
                                                <td className="px-3 py-2 w-32">
                                                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.min(100, entry.percentage)}%`,
                                                                backgroundColor: isRisky ? '#f59e0b' : '#94a3b8',
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                                Schwelle: &gt;{Math.round(100 / leaderboard.length * 1.5)}% (1.5× fairer Anteil bei {leaderboard.length} Personen)
                            </p>
                        </div>
                    )}
                </>
            )}
        </CollapsibleCard>
    );
}
