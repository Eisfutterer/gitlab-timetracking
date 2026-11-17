"use client"

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Epic, EpicIssue } from '../types/dashboard';
import { COLORS, resolveCategoryLabel } from '../config/dashboardConfig';

// ── helpers ───────────────────────────────────────────────────────────────────

function getIssueColor(issue: EpicIssue): string {
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

// ── flat row model ────────────────────────────────────────────────────────────

interface GanttRow {
    id: string;
    title: string;
    iid?: string;
    webUrl?: string;
    color: string;
    isEpic: boolean;
    depth: number;
    state: 'opened' | 'closed';
    start: Date;
    end: Date;
    hasExplicitDates: boolean;
    assignees: string[];
    progress: number; // 0–1
}

function collectRows(epic: Epic, depth: number, today: Date): GanttRow[] {
    const rows: GanttRow[] = [];

    // derive epic color from dominant issue category
    const counts: Record<string, number> = {};
    function tally(e: Epic) {
        e.issues.nodes.forEach(issue => {
            for (const l of issue.labels.nodes) {
                const cat = resolveCategoryLabel(l.title);
                if (cat) { counts[cat] = (counts[cat] ?? 0) + 1; break; }
            }
        });
        e.children.nodes.forEach(tally);
    }
    tally(epic);
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const epicColor = dominant
        ? (COLORS.CATEGORY[dominant[0] as keyof typeof COLORS.CATEGORY] ?? '#94a3b8')
        : '#94a3b8';

    // collect all issue dates to derive epic span
    function allIssueDates(e: Epic): Date[] {
        const dates: Date[] = [];
        e.issues.nodes.forEach(issue => {
            const s = parseDate(issue.startDate) ?? parseDate(issue.createdAt);
            const en = parseDate(issue.dueDate) ?? parseDate(issue.closedAt);
            if (s) dates.push(s);
            if (en) dates.push(en);
        });
        e.children.nodes.forEach(child => dates.push(...allIssueDates(child)));
        return dates;
    }

    const allDates = allIssueDates(epic);
    const epicStart = allDates.length > 0
        ? new Date(Math.min(...allDates.map(d => d.getTime())))
        : (parseDate(epic.createdAt) ?? today);
    const epicEnd = allDates.length > 0
        ? new Date(Math.max(...allDates.map(d => d.getTime())))
        : (parseDate(epic.closedAt) ?? today);

    // epic row
    const allIssues = (function flatten(e: Epic): EpicIssue[] {
        return [...e.issues.nodes, ...e.children.nodes.flatMap(flatten)];
    })(epic);
    const closedCount = allIssues.filter(i => i.state === 'closed').length;

    rows.push({
        id: epic.id,
        title: epic.title,
        color: epicColor,
        isEpic: true,
        depth,
        state: epic.state,
        start: epicStart,
        end: epicEnd,
        hasExplicitDates: false,
        assignees: [],
        progress: allIssues.length > 0 ? closedCount / allIssues.length : 0,
    });

    // child epics
    epic.children.nodes.forEach(child => {
        rows.push(...collectRows(child, depth + 1, today));
    });

    // issue rows
    epic.issues.nodes.forEach(issue => {
        const s = parseDate(issue.startDate) ?? parseDate(issue.createdAt) ?? today;
        const e = parseDate(issue.dueDate) ?? parseDate(issue.closedAt) ?? today;
        const hasExplicit = !!(issue.startDate || issue.dueDate);
        rows.push({
            id: `issue-${issue.iid}`,
            title: issue.title,
            iid: issue.iid,
            webUrl: issue.webUrl,
            color: getIssueColor(issue),
            isEpic: false,
            depth: depth + 1,
            state: issue.state,
            start: s,
            end: e < s ? s : e,
            hasExplicitDates: hasExplicit,
            assignees: issue.assignees?.nodes?.map(a => a.name) ?? [],
            progress: issue.state === 'closed' ? 1 : 0,
        });
    });

    return rows;
}

// ── component ─────────────────────────────────────────────────────────────────

const ROW_H = 36;
const LABEL_W = 220;
const DAY_W = 28;
const HEADER_H = 48;

export default function GanttView({ epics }: { epics: Epic[] }) {
    const today = useMemo(() => startOfDay(new Date()), []);
    const [hovered, setHovered] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; row: GanttRow } | null>(null);
    const [showOnlyExplicit, setShowOnlyExplicit] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const allRows = useMemo(() =>
        epics.flatMap(e => collectRows(e, 0, today)),
        [epics, today]
    );

    const rows = useMemo(() =>
        showOnlyExplicit ? allRows.filter(r => r.isEpic || r.hasExplicitDates) : allRows,
        [allRows, showOnlyExplicit]
    );

    // timeline range
    const minDate = useMemo(() => {
        const dates = rows.map(r => r.start);
        return dates.length > 0 ? addDays(new Date(Math.min(...dates.map(d => d.getTime()))), -3) : addDays(today, -7);
    }, [rows, today]);

    const maxDate = useMemo(() => {
        const dates = rows.map(r => r.end);
        return dates.length > 0 ? addDays(new Date(Math.max(...dates.map(d => d.getTime()))), 5) : addDays(today, 30);
    }, [rows, today]);

    const totalDays = diffDays(minDate, maxDate) + 1;
    const svgW = totalDays * DAY_W;
    const svgH = rows.length * ROW_H + HEADER_H;
    const todayX = diffDays(minDate, today) * DAY_W;

    // scroll to today on mount
    useEffect(() => {
        if (!scrollRef.current) return;
        const offset = todayX - scrollRef.current.clientWidth / 2 + DAY_W / 2;
        scrollRef.current.scrollLeft = Math.max(0, offset);
    }, [todayX]);

    // week columns for header
    const weeks: { label: string; x: number; w: number }[] = useMemo(() => {
        const result: { label: string; x: number; w: number }[] = [];
        let d = new Date(minDate);
        // move to monday
        while (d.getDay() !== 1) d = addDays(d, 1);
        while (d <= maxDate) {
            const x = diffDays(minDate, d) * DAY_W;
            const kw = getISOWeek(d);
            result.push({ label: `KW ${kw}`, x, w: 7 * DAY_W });
            d = addDays(d, 7);
        }
        return result;
    }, [minDate, maxDate]);

    // day ticks
    const dayTicks: { x: number; label: string; isMonday: boolean; isToday: boolean }[] = useMemo(() => {
        const result = [];
        for (let i = 0; i < totalDays; i++) {
            const d = addDays(minDate, i);
            result.push({
                x: i * DAY_W + DAY_W / 2,
                label: d.getDate() === 1 || d.getDay() === 1 ? fmtDate(d) : '',
                isMonday: d.getDay() === 1,
                isToday: diffDays(today, d) === 0,
            });
        }
        return result;
    }, [minDate, totalDays, today]);

    if (epics.length === 0) {
        return <p className="text-sm text-muted-foreground">Keine Epics gefunden.</p>;
    }

    return (
        <div className="w-full">
            {/* filter */}
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showOnlyExplicit}
                        onChange={e => setShowOnlyExplicit(e.target.checked)}
                        className="rounded border-border"
                    />
                    Nur Issues mit expliziten Daten
                </label>
                <span className="ml-auto">
                    {rows.filter(r => !r.isEpic && r.hasExplicitDates).length} / {allRows.filter(r => !r.isEpic).length} Issues mit Datum
                </span>
            </div>

            <div className="flex w-full overflow-hidden rounded-lg border border-border">
                {/* left: label column */}
                <div className="flex-shrink-0 border-r border-border bg-card" style={{ width: LABEL_W }}>
                    {/* header spacer */}
                    <div style={{ height: HEADER_H }} className="border-b border-border flex items-end px-3 pb-1">
                        <span className="text-xs font-medium text-muted-foreground">Epic / Issue</span>
                    </div>
                    {rows.map((row, i) => (
                        <div
                            key={row.id}
                            style={{ height: ROW_H, paddingLeft: 12 + row.depth * 16 }}
                            className={`flex items-center gap-2 border-b border-border/50 text-xs transition-colors ${hovered === row.id ? 'bg-accent/40' : i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}
                            onMouseEnter={() => setHovered(row.id)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: row.color, opacity: row.state === 'closed' ? 0.45 : 1 }} />
                            {row.webUrl ? (
                                <a
                                    href={row.webUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`truncate hover:underline ${row.state === 'closed' ? 'text-muted-foreground line-through' : 'text-foreground'} ${row.isEpic ? 'font-semibold' : ''}`}
                                    title={row.title}
                                >
                                    {row.iid && <span className="text-muted-foreground mr-1">#{row.iid}</span>}
                                    {row.title}
                                </a>
                            ) : (
                                <span className={`truncate ${row.state === 'closed' ? 'text-muted-foreground' : 'text-foreground'} ${row.isEpic ? 'font-semibold' : ''}`} title={row.title}>
                                    {row.title}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* right: scrollable gantt area */}
                <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
                    <svg width={svgW} height={svgH} style={{ display: 'block' }}>
                        {/* week header bands */}
                        {weeks.map((w, i) => (
                            <rect
                                key={i}
                                x={w.x} y={0} width={w.w} height={HEADER_H}
                                fill={i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.04)'}
                            />
                        ))}

                        {/* week labels */}
                        {weeks.map((w, i) => (
                            <text
                                key={`wl-${i}`}
                                x={w.x + w.w / 2} y={14}
                                textAnchor="middle"
                                fontSize={10} fontWeight={600}
                                fill="currentColor"
                                className="text-muted-foreground"
                                style={{ userSelect: 'none' }}
                            >
                                {w.label}
                            </text>
                        ))}

                        {/* day ticks */}
                        {dayTicks.map((tick, i) => (
                            <g key={i}>
                                {tick.isMonday && (
                                    <line
                                        x1={tick.x - DAY_W / 2} y1={0}
                                        x2={tick.x - DAY_W / 2} y2={svgH}
                                        stroke="currentColor"
                                        strokeOpacity={0.1}
                                        strokeWidth={1}
                                        className="text-border"
                                    />
                                )}
                                {tick.label && (
                                    <text
                                        x={tick.x} y={30}
                                        textAnchor="middle"
                                        fontSize={9}
                                        fill="currentColor"
                                        className="text-muted-foreground"
                                        style={{ userSelect: 'none' }}
                                    >
                                        {tick.label}
                                    </text>
                                )}
                            </g>
                        ))}

                        {/* header bottom border */}
                        <line x1={0} y1={HEADER_H} x2={svgW} y2={HEADER_H} stroke="currentColor" strokeOpacity={0.15} className="text-border" />

                        {/* row backgrounds */}
                        {rows.map((row, i) => (
                            <rect
                                key={`bg-${row.id}`}
                                x={0} y={HEADER_H + i * ROW_H}
                                width={svgW} height={ROW_H}
                                fill={hovered === row.id ? 'rgba(128,128,128,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.03)'}
                                onMouseEnter={() => setHovered(row.id)}
                                onMouseLeave={() => setHovered(null)}
                            />
                        ))}

                        {/* row dividers */}
                        {rows.map((_, i) => (
                            <line
                                key={`div-${i}`}
                                x1={0} y1={HEADER_H + (i + 1) * ROW_H}
                                x2={svgW} y2={HEADER_H + (i + 1) * ROW_H}
                                stroke="currentColor" strokeOpacity={0.06}
                                className="text-border"
                            />
                        ))}

                        {/* today line */}
                        {todayX >= 0 && todayX <= svgW && (
                            <g>
                                <line
                                    x1={todayX + DAY_W / 2} y1={HEADER_H}
                                    x2={todayX + DAY_W / 2} y2={svgH}
                                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3"
                                    opacity={0.7}
                                />
                                <text
                                    x={todayX + DAY_W / 2} y={HEADER_H - 4}
                                    textAnchor="middle" fontSize={9} fill="#ef4444"
                                    fontWeight={600} style={{ userSelect: 'none' }}
                                >
                                    Heute
                                </text>
                            </g>
                        )}

                        {/* bars */}
                        {rows.map((row, i) => {
                            const x1 = diffDays(minDate, row.start) * DAY_W;
                            const x2 = (diffDays(minDate, row.end) + 1) * DAY_W;
                            const barW = Math.max(x2 - x1, DAY_W);
                            const barY = HEADER_H + i * ROW_H;
                            const pad = row.isEpic ? 6 : 8;
                            const bh = ROW_H - pad * 2;
                            const r = bh / 2;
                            const alpha = row.state === 'closed' ? 0.45 : 1;

                            return (
                                <g
                                    key={`bar-${row.id}`}
                                    onMouseEnter={e => {
                                        setHovered(row.id);
                                        setTooltip({ x: e.clientX, y: e.clientY, row });
                                    }}
                                    onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                                    style={{ cursor: row.webUrl ? 'pointer' : 'default' }}
                                    onClick={() => row.webUrl && window.open(row.webUrl, '_blank')}
                                >
                                    {/* bar background */}
                                    <rect
                                        x={x1} y={barY + pad}
                                        width={barW} height={bh}
                                        rx={r} ry={r}
                                        fill={row.color}
                                        opacity={alpha * 0.25}
                                    />
                                    {/* progress fill */}
                                    {row.progress > 0 && (
                                        <rect
                                            x={x1} y={barY + pad}
                                            width={barW * row.progress} height={bh}
                                            rx={r} ry={r}
                                            fill={row.color}
                                            opacity={alpha * 0.8}
                                            style={{ transition: 'width 0.3s' }}
                                        />
                                    )}
                                    {/* border */}
                                    <rect
                                        x={x1} y={barY + pad}
                                        width={barW} height={bh}
                                        rx={r} ry={r}
                                        fill="none"
                                        stroke={row.color}
                                        strokeWidth={1.5}
                                        opacity={alpha * 0.7}
                                    />
                                    {/* label inside bar if wide enough */}
                                    {barW > 50 && (
                                        <text
                                            x={x1 + 8} y={barY + ROW_H / 2 + 1}
                                            dominantBaseline="middle"
                                            fontSize={9} fontWeight={600}
                                            fill={row.color}
                                            opacity={Math.min(alpha * 1.4, 1)}
                                            style={{ userSelect: 'none', pointerEvents: 'none' }}
                                        >
                                            {row.isEpic
                                                ? (barW > 120 ? row.title.slice(0, 20) + (row.title.length > 20 ? '…' : '') : '')
                                                : `${Math.round(row.progress * 100)}%`
                                            }
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* tooltip (portal-less, fixed) */}
            {tooltip && (
                <div
                    className="fixed z-50 pointer-events-none rounded-xl bg-popover border border-border shadow-2xl px-3.5 py-2.5 text-xs max-w-64"
                    style={{ left: tooltip.x + 16, top: tooltip.y - 10 }}
                >
                    <p className="font-semibold text-foreground mb-1 leading-snug">{tooltip.row.title}</p>
                    {tooltip.row.iid && <p className="text-muted-foreground">Issue #{tooltip.row.iid}</p>}
                    <p className="text-muted-foreground mt-0.5">
                        {fmtDateLong(tooltip.row.start)} → {fmtDateLong(tooltip.row.end)}
                    </p>
                    {!tooltip.row.hasExplicitDates && !tooltip.row.isEpic && (
                        <p className="text-amber-400 mt-0.5 italic">Kein explizites Datum — aus createdAt/closedAt abgeleitet</p>
                    )}
                    {tooltip.row.assignees.length > 0 && (
                        <p className="text-muted-foreground mt-0.5">👤 {tooltip.row.assignees.join(', ')}</p>
                    )}
                    <p className={`mt-1 font-medium ${tooltip.row.state === 'closed' ? 'text-zinc-400' : 'text-emerald-400'}`}>
                        {tooltip.row.state === 'closed' ? 'closed' : 'open'} · {Math.round(tooltip.row.progress * 100)}%
                    </p>
                </div>
            )}
        </div>
    );
}

// ISO week number helper
function getISOWeek(d: Date): number {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
