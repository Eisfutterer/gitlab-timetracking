"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Issue } from '../types/dashboard';
import { COLORS, resolveCategoryLabel } from '../config/dashboardConfig';
import { ChevronRight, ChevronDown } from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function getIssueColor(issue: Issue): string {
    for (const l of issue.labels.nodes) {
        const cat = resolveCategoryLabel(l.title);
        if (cat) return COLORS.CATEGORY[cat as keyof typeof COLORS.CATEGORY] ?? '#94a3b8';
    }
    return '#94a3b8';
}

function parseDate(s: string | null | undefined): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
    return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function fmtDate(d: Date): string {
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function fmtDateLong(d: Date): string {
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getISOWeek(d: Date): number {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const MILESTONE_COLOR = '#a78bfa';

// ── row model ──────────────────────────────────────────────────────────────────

interface GanttRow {
    id: string;
    title: string;
    iid?: string;
    webUrl?: string;
    color: string;
    isMilestone: boolean;
    state: 'opened' | 'closed';
    // dated rows carry a span; undated rows have null start/end
    start: Date | null;
    end: Date | null;
    assignees: string[];
    milestoneTitle: string;
    dated: boolean;
    issueCount?: number;
}

interface MilestoneGroup {
    title: string;
    start: Date | null;
    end: Date | null;
    dated: boolean;
    webUrl: string | null;
    issues: Issue[];
}

const UNDATED_KEY = '__no_milestone__';

// milestone webPath is relative (e.g. "/group/-/milestones/3"); resolve against an issue's absolute origin
export function milestoneUrl(issues: Issue[]): string | null {
    const ms = issues[0]?.milestone;
    if (!ms?.webPath) return null;
    const ref = issues.find(i => i.webUrl)?.webUrl;
    if (!ref) return null;
    try {
        return new URL(ms.webPath, new URL(ref).origin).href;
    } catch {
        return null;
    }
}

export function buildGroups(issues: Issue[]): MilestoneGroup[] {
    // dedupe: the same issue can arrive from multiple group paths (includeSubgroups)
    const seen = new Set<string>();
    const uniqueIssues = issues.filter(i => {
        if (seen.has(i.webUrl)) return false;
        seen.add(i.webUrl);
        return true;
    });

    const byTitle = new Map<string, Issue[]>();
    for (const issue of uniqueIssues) {
        const key = issue.milestone?.title ?? UNDATED_KEY;
        if (!byTitle.has(key)) byTitle.set(key, []);
        byTitle.get(key)!.push(issue);
    }

    const groups: MilestoneGroup[] = [];
    for (const [title, groupIssues] of byTitle) {
        if (title === UNDATED_KEY) {
            groups.push({ title: 'Ohne Meilenstein', start: null, end: null, dated: false, webUrl: null, issues: groupIssues });
            continue;
        }
        // milestone dates come from any issue in the group (all share the same milestone)
        const ms = groupIssues[0].milestone;
        const s = parseDate(ms?.startDate);
        const e = parseDate(ms?.dueDate);
        // fall back: if only one bound is set, use it for both ends
        const start = s ?? e;
        const end = e ?? s;
        const dated = !!(start && end);
        groups.push({ title, start, end, dated, webUrl: milestoneUrl(groupIssues), issues: groupIssues });
    }

    // dated groups first, sorted by start date; undated/no-milestone last
    groups.sort((a, b) => {
        if (a.dated && !b.dated) return -1;
        if (!a.dated && b.dated) return 1;
        if (a.dated && b.dated) return a.start!.getTime() - b.start!.getTime();
        return a.title.localeCompare(b.title);
    });
    return groups;
}

export function groupsToRows(groups: MilestoneGroup[], showUndated: boolean, collapsed: Set<string>): GanttRow[] {
    const rows: GanttRow[] = [];
    for (const g of groups) {
        if (!g.dated && !showUndated) continue;

        rows.push({
            id: `ms-${g.title}`,
            title: g.title,
            webUrl: g.webUrl ?? undefined,
            color: MILESTONE_COLOR,
            isMilestone: true,
            state: g.issues.every(i => i.state === 'closed') ? 'closed' : 'opened',
            start: g.start,
            end: g.end,
            assignees: [],
            milestoneTitle: g.title,
            dated: g.dated,
            issueCount: g.issues.length,
        });

        if (collapsed.has(g.title)) continue;

        for (const issue of g.issues) {
            // Default to the milestone span, but tighten it to the issue's own
            // lifetime where that falls inside the milestone window:
            //  - start at createdAt if it lies between milestone start and end
            //  - end at closedAt if it lies between milestone start and end
            let start = g.start;
            let end = g.end;
            if (g.start && g.end) {
                const created = parseDate(issue.createdAt);
                if (created && created > g.start && created < g.end) start = created;

                const closed = parseDate(issue.closedAt);
                if (closed && closed > g.start && closed < g.end) end = closed;

                // guard against an inverted span (e.g. createdAt after closedAt)
                if (start && end && start > end) start = end;
            }

            rows.push({
                id: `ms-${g.title}-issue-${issue.webUrl}`,
                title: issue.title,
                iid: issue.iid,
                webUrl: issue.webUrl,
                color: getIssueColor(issue),
                isMilestone: false,
                state: issue.state,
                start,
                end,
                assignees: issue.assignees?.nodes?.map(a => a.name) ?? [],
                milestoneTitle: g.title,
                dated: g.dated,
            });
        }
    }
    return rows;
}

// ── component ─────────────────────────────────────────────────────────────────

const ROW_H = 36;
const LABEL_W = 240;
const DAY_W = 28;
const HEADER_H = 48;

export default function MilestoneGanttView({ issues }: { issues: Issue[] }) {
    const today = useMemo(() => startOfDay(new Date()), []);
    const [hovered, setHovered] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; row: GanttRow } | null>(null);
    const [showUndated, setShowUndated] = useState(false);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    const toggleCollapse = (title: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(title)) next.delete(title); else next.add(title);
            return next;
        });
    };

    const groups = useMemo(() => buildGroups(issues), [issues]);
    const rows = useMemo(() => groupsToRows(groups, showUndated, collapsed), [groups, showUndated, collapsed]);

    // counts for the toolbar
    const datedMilestones = groups.filter(g => g.dated).length;
    const totalMilestones = groups.filter(g => g.title !== 'Ohne Meilenstein').length;

    // timeline range — derived only from dated rows
    const datedRows = rows.filter(r => r.dated && r.start && r.end);

    const minDate = useMemo(() => {
        const dates = datedRows.map(r => r.start!);
        return dates.length > 0 ? addDays(new Date(Math.min(...dates.map(d => d.getTime()))), -3) : addDays(today, -7);
    }, [datedRows, today]);

    const maxDate = useMemo(() => {
        const dates = datedRows.map(r => r.end!);
        return dates.length > 0 ? addDays(new Date(Math.max(...dates.map(d => d.getTime()))), 5) : addDays(today, 30);
    }, [datedRows, today]);

    const totalDays = diffDays(minDate, maxDate) + 1;
    const svgW = totalDays * DAY_W;
    const todayX = diffDays(minDate, today) * DAY_W;

    useEffect(() => {
        if (!scrollRef.current) return;
        const offset = todayX - scrollRef.current.clientWidth / 2 + DAY_W / 2;
        scrollRef.current.scrollLeft = Math.max(0, offset);
    }, [todayX]);

    const weeks: { label: string; x: number; w: number }[] = useMemo(() => {
        const result: { label: string; x: number; w: number }[] = [];
        let d = new Date(minDate);
        while (d.getDay() !== 1) d = addDays(d, 1);
        while (d <= maxDate) {
            const x = diffDays(minDate, d) * DAY_W;
            result.push({ label: `KW ${getISOWeek(d)}`, x, w: 7 * DAY_W });
            d = addDays(d, 7);
        }
        return result;
    }, [minDate, maxDate]);

    const dayTicks: { x: number; label: string; isMonday: boolean }[] = useMemo(() => {
        const result = [];
        for (let i = 0; i < totalDays; i++) {
            const d = addDays(minDate, i);
            result.push({
                x: i * DAY_W + DAY_W / 2,
                label: d.getDate() === 1 || d.getDay() === 1 ? fmtDate(d) : '',
                isMonday: d.getDay() === 1,
            });
        }
        return result;
    }, [minDate, totalDays]);

    // overview strip: pack dated milestones into as few lanes as possible (greedy interval packing)
    const stripItems = useMemo(() => {
        const dated = groups
            .filter(g => g.dated && g.start && g.end)
            .map(g => ({
                title: g.title,
                start: g.start!,
                end: g.end!,
                x1: diffDays(minDate, g.start!) * DAY_W,
                x2: (diffDays(minDate, g.end!) + 1) * DAY_W,
            }))
            .sort((a, b) => a.x1 - b.x1);

        const laneEnds: number[] = []; // right edge (x) occupied per lane
        return dated.map(item => {
            let lane = laneEnds.findIndex(end => item.x1 >= end);
            if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
            laneEnds[lane] = item.x2;
            return { ...item, lane };
        });
    }, [groups, minDate]);

    const laneCount = stripItems.reduce((m, it) => Math.max(m, it.lane + 1), 0);
    const STRIP_LANE_H = 22;
    const STRIP_PAD = 6;
    const stripH = laneCount > 0 ? laneCount * STRIP_LANE_H + STRIP_PAD * 2 : 0;

    const BODY_TOP = HEADER_H + stripH;
    const svgH = rows.length * ROW_H + BODY_TOP;


    if (groups.length === 0 || (datedMilestones === 0 && !showUndated)) {
        return (
            <div className="w-full">
                <Toolbar
                    showUndated={showUndated}
                    setShowUndated={setShowUndated}
                    datedMilestones={datedMilestones}
                    totalMilestones={totalMilestones}
                />
                <p className="text-sm text-muted-foreground mt-2">
                    Keine terminierten Meilensteine gefunden.
                    {totalMilestones > datedMilestones && ' Aktiviere „Nicht terminierte Elemente anzeigen", um sie zu sehen.'}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <Toolbar
                showUndated={showUndated}
                setShowUndated={setShowUndated}
                datedMilestones={datedMilestones}
                totalMilestones={totalMilestones}
            />

            <div className="flex w-full overflow-hidden rounded-lg border border-border">
                {/* left: label column */}
                <div className="flex-shrink-0 border-r border-border bg-card" style={{ width: LABEL_W }}>
                    <div style={{ height: HEADER_H }} className="border-b border-border flex items-end px-3 pb-1">
                        <span className="text-xs font-medium text-muted-foreground">Meilenstein / Issue</span>
                    </div>
                    {stripH > 0 && (
                        <div style={{ height: stripH }} className="border-b border-border flex items-center px-3">
                            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: MILESTONE_COLOR }}>
                                Meilenstein-Übersicht
                            </span>
                        </div>
                    )}
                    {rows.map((row, i) => {
                        const isCollapsed = collapsed.has(row.milestoneTitle);
                        return (
                            <div
                                key={row.id}
                                style={{ height: ROW_H, paddingLeft: row.isMilestone ? 6 : 28 }}
                                className={`flex items-center gap-1.5 border-b border-border/50 text-xs transition-colors ${row.isMilestone ? 'cursor-pointer' : ''} ${hovered === row.id ? 'bg-accent/40' : row.isMilestone ? 'bg-muted/10' : i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}
                                onMouseEnter={() => setHovered(row.id)}
                                onMouseLeave={() => setHovered(null)}
                                onClick={row.isMilestone ? () => toggleCollapse(row.milestoneTitle) : undefined}
                            >
                                {row.isMilestone ? (
                                    <>
                                        <span
                                            className="flex-shrink-0"
                                            title={isCollapsed ? 'Ausklappen' : 'Einklappen'}
                                        >
                                            {isCollapsed
                                                ? <ChevronRight className="w-3.5 h-3.5" style={{ color: MILESTONE_COLOR }} />
                                                : <ChevronDown className="w-3.5 h-3.5" style={{ color: MILESTONE_COLOR }} />}
                                        </span>
                                        {row.webUrl ? (
                                            <a
                                                href={row.webUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className={`truncate font-semibold hover:underline ${row.state === 'closed' ? 'opacity-60' : ''}`}
                                                style={{ color: MILESTONE_COLOR }}
                                                title={row.title}
                                            >
                                                {row.title}
                                                {!row.dated && <span className="ml-1 font-normal text-muted-foreground">(ohne Termin)</span>}
                                            </a>
                                        ) : (
                                            <span
                                                className={`truncate font-semibold ${row.state === 'closed' ? 'opacity-60' : ''}`}
                                                style={{ color: MILESTONE_COLOR }}
                                                title={row.title}
                                            >
                                                {row.title}
                                                {!row.dated && <span className="ml-1 font-normal text-muted-foreground">(ohne Termin)</span>}
                                            </span>
                                        )}
                                        {row.issueCount != null && (
                                            <span className="ml-auto mr-2 flex-shrink-0 rounded-full bg-muted/60 px-1.5 text-[10px] text-muted-foreground">
                                                {row.issueCount}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span
                                            className="flex-shrink-0 w-2 h-2 rounded-full"
                                            style={{ backgroundColor: row.color, opacity: row.state === 'closed' ? 0.45 : 1 }}
                                        />
                                        {row.webUrl ? (
                                            <a
                                                href={row.webUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`truncate hover:underline ${row.state === 'closed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                                                title={row.title}
                                            >
                                                {row.iid && <span className="text-muted-foreground mr-1">#{row.iid}</span>}
                                                {row.title}
                                            </a>
                                        ) : (
                                            <span
                                                className={`truncate ${row.state === 'closed' ? 'text-muted-foreground' : 'text-foreground'}`}
                                                title={row.title}
                                            >
                                                {row.title}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* right: scrollable gantt area */}
                <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
                    <svg width={svgW} height={svgH} style={{ display: 'block' }}>
                        {/* week header bands */}
                        {weeks.map((w, i) => (
                            <rect key={i} x={w.x} y={0} width={w.w} height={HEADER_H}
                                fill={i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.04)'} />
                        ))}
                        {/* week labels */}
                        {weeks.map((w, i) => (
                            <text key={`wl-${i}`} x={w.x + w.w / 2} y={14} textAnchor="middle"
                                fontSize={10} fontWeight={600} fill="currentColor"
                                className="text-muted-foreground" style={{ userSelect: 'none' }}>
                                {w.label}
                            </text>
                        ))}
                        {/* day ticks */}
                        {dayTicks.map((tick, i) => (
                            <g key={i}>
                                {tick.isMonday && (
                                    <line x1={tick.x - DAY_W / 2} y1={0} x2={tick.x - DAY_W / 2} y2={svgH}
                                        stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} className="text-border" />
                                )}
                                {tick.label && (
                                    <text x={tick.x} y={30} textAnchor="middle" fontSize={9}
                                        fill="currentColor" className="text-muted-foreground" style={{ userSelect: 'none' }}>
                                        {tick.label}
                                    </text>
                                )}
                            </g>
                        ))}

                        <line x1={0} y1={HEADER_H} x2={svgW} y2={HEADER_H} stroke="currentColor" strokeOpacity={0.15} className="text-border" />

                        {/* milestone overview strip (packed lanes) */}
                        {stripH > 0 && (
                            <g>
                                <rect x={0} y={HEADER_H} width={svgW} height={stripH} fill="rgba(167,139,250,0.04)" />
                                {stripItems.map((it, k) => {
                                    const w = Math.max(it.x2 - it.x1, DAY_W);
                                    const y = HEADER_H + STRIP_PAD + it.lane * STRIP_LANE_H;
                                    const h = STRIP_LANE_H - 4;
                                    const rr = h / 2;
                                    const hov = hovered === `ms-${it.title}`;
                                    return (
                                        <g key={`strip-${k}`}
                                            onMouseEnter={() => setHovered(`ms-${it.title}`)}
                                            onMouseLeave={() => setHovered(null)}
                                            style={{ cursor: 'default' }}>
                                            <rect x={it.x1} y={y} width={w} height={h} rx={rr} ry={rr}
                                                fill={MILESTONE_COLOR} opacity={hov ? 0.5 : 0.3} />
                                            <rect x={it.x1} y={y} width={w} height={h} rx={rr} ry={rr}
                                                fill="none" stroke={MILESTONE_COLOR} strokeWidth={1.5} opacity={0.85} />
                                            {w > 50 && (
                                                <text x={it.x1 + 8} y={y + h / 2 + 1} dominantBaseline="middle"
                                                    fontSize={9} fontWeight={700} fill={MILESTONE_COLOR}
                                                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                                                    {it.title.slice(0, Math.floor(w / 7))}{it.title.length > Math.floor(w / 7) ? '…' : ''}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                                <line x1={0} y1={BODY_TOP} x2={svgW} y2={BODY_TOP} stroke="currentColor" strokeOpacity={0.15} className="text-border" />
                            </g>
                        )}

                        {/* row backgrounds — milestone rows get a subtle tint */}
                        {rows.map((row, i) => (
                            <rect key={`bg-${row.id}`}
                                x={0} y={BODY_TOP + i * ROW_H} width={svgW} height={ROW_H}
                                fill={hovered === row.id
                                    ? 'rgba(128,128,128,0.08)'
                                    : row.isMilestone ? 'rgba(167,139,250,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.03)'}
                                onMouseEnter={() => setHovered(row.id)}
                                onMouseLeave={() => setHovered(null)} />
                        ))}
                        {/* row dividers */}
                        {rows.map((_, i) => (
                            <line key={`div-${i}`}
                                x1={0} y1={BODY_TOP + (i + 1) * ROW_H} x2={svgW} y2={BODY_TOP + (i + 1) * ROW_H}
                                stroke="currentColor" strokeOpacity={0.06} className="text-border" />
                        ))}

                        {/* today line */}
                        {todayX >= 0 && todayX <= svgW && (
                            <g>
                                <line x1={todayX + DAY_W / 2} y1={HEADER_H} x2={todayX + DAY_W / 2} y2={svgH}
                                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                                <text x={todayX + DAY_W / 2} y={HEADER_H - 4} textAnchor="middle"
                                    fontSize={9} fill="#ef4444" fontWeight={600} style={{ userSelect: 'none' }}>
                                    Heute
                                </text>
                            </g>
                        )}

                        {/* bars — plain rounded capsules, NO progress fill */}
                        {rows.map((row, i) => {
                            if (!row.dated || !row.start || !row.end) return null;
                            const x1 = diffDays(minDate, row.start) * DAY_W;
                            const x2 = (diffDays(minDate, row.end) + 1) * DAY_W;
                            const barW = Math.max(x2 - x1, DAY_W);
                            const barY = BODY_TOP + i * ROW_H;
                            const pad = 9;
                            const bh = ROW_H - pad * 2;
                            const rr = bh / 2;
                            const alpha = row.state === 'closed' ? 0.45 : 1;

                            return (
                                <g key={`bar-${row.id}`}
                                    onMouseEnter={e => { setHovered(row.id); setTooltip({ x: e.clientX, y: e.clientY, row }); }}
                                    onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                                    style={{ cursor: row.webUrl ? 'pointer' : 'default' }}
                                    onClick={() => row.webUrl && window.open(row.webUrl, '_blank')}
                                >
                                    {/* fill capsule */}
                                    <rect x={x1} y={barY + pad} width={barW} height={bh}
                                        rx={rr} ry={rr}
                                        fill={row.color}
                                        opacity={alpha * (row.isMilestone ? 0.35 : 0.25)} />
                                    {/* border */}
                                    <rect x={x1} y={barY + pad} width={barW} height={bh}
                                        rx={rr} ry={rr} fill="none"
                                        stroke={row.color}
                                        strokeWidth={row.isMilestone ? 2 : 1.5}
                                        opacity={alpha * 0.8} />
                                    {/* in-bar label */}
                                    {barW > 60 && (
                                        <text x={x1 + 10} y={barY + ROW_H / 2 + 1}
                                            dominantBaseline="middle" fontSize={9}
                                            fontWeight={row.isMilestone ? 700 : 600}
                                            fill={row.color} opacity={Math.min(alpha * 1.4, 1)}
                                            style={{ userSelect: 'none', pointerEvents: 'none' }}>
                                            {row.isMilestone
                                                ? row.title.slice(0, 24) + (row.title.length > 24 ? '…' : '')
                                                : (row.state === 'closed' ? '✓' : '')}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* tooltip */}
            {tooltip && (
                <div className="fixed z-50 pointer-events-none rounded-xl bg-popover border border-border shadow-2xl px-3.5 py-2.5 text-xs max-w-72"
                    style={{ left: tooltip.x + 16, top: tooltip.y - 10 }}>
                    <p className="font-semibold text-foreground mb-1 leading-snug">{tooltip.row.title}</p>
                    {tooltip.row.isMilestone
                        ? <p style={{ color: MILESTONE_COLOR }}>Meilenstein</p>
                        : <p className="text-muted-foreground">Issue #{tooltip.row.iid} · {tooltip.row.milestoneTitle}</p>}
                    {tooltip.row.start && tooltip.row.end && (
                        <p className="text-muted-foreground mt-0.5">
                            {fmtDateLong(tooltip.row.start)} → {fmtDateLong(tooltip.row.end)}
                        </p>
                    )}
                    {tooltip.row.assignees.length > 0 && (
                        <p className="text-muted-foreground mt-0.5">👤 {tooltip.row.assignees.join(', ')}</p>
                    )}
                    <p className={`mt-1 font-medium ${tooltip.row.state === 'closed' ? 'text-zinc-400' : 'text-emerald-400'}`}>
                        {tooltip.row.state === 'closed' ? 'closed' : 'open'}
                    </p>
                </div>
            )}
        </div>
    );
}

function Toolbar({
    showUndated, setShowUndated, datedMilestones, totalMilestones,
}: {
    showUndated: boolean;
    setShowUndated: (v: boolean) => void;
    datedMilestones: number;
    totalMilestones: number;
}) {
    return (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={showUndated}
                    onChange={e => setShowUndated(e.target.checked)}
                    className="rounded border-border"
                />
                Nicht terminierte Elemente anzeigen
            </label>
            <span className="ml-auto">
                {datedMilestones} / {totalMilestones} Meilensteine mit Termin
            </span>
        </div>
    );
}
