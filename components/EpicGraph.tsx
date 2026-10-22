"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Epic, EpicIssue } from '../types/dashboard';
import { GITLAB_CONFIG, CATEGORIES, COLORS } from '../config/dashboardConfig';
import CollapsibleCard from './CollapsibleCard';
import { List, GitBranch } from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────

function getIssueColor(issue: EpicIssue): string {
    const label = issue.labels.nodes.find(l => Object.values(CATEGORIES).includes(l.title as never));
    return label ? (COLORS.CATEGORY[label.title as keyof typeof COLORS.CATEGORY] ?? '#94a3b8') : '#94a3b8';
}

// Derive the dominant category color of an epic from its issues (recursive)
function getEpicColor(epic: Epic): string {
    const counts: Record<string, number> = {};
    function tally(e: Epic) {
        e.issues.nodes.forEach(issue => {
            const label = issue.labels.nodes.find(l => Object.values(CATEGORIES).includes(l.title as never));
            if (label) counts[label.title] = (counts[label.title] ?? 0) + 1;
        });
        e.children.nodes.forEach(tally);
    }
    tally(epic);
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!dominant) return '#94a3b8';
    return COLORS.CATEGORY[dominant[0] as keyof typeof COLORS.CATEGORY] ?? '#94a3b8';
}

// ── Card view — vertikale Linienbaumstruktur (erste Iteration) ────────────────

// Connector uses a CSS variable so it respects dark/light theme automatically
const CONNECTOR = 'var(--border)';

function CardIssueRow({ issue, isLast }: { issue: EpicIssue; isLast: boolean }) {
    const color = getIssueColor(issue);
    const isClosed = issue.state === 'closed';
    const H = 40; // row height px

    return (
        <div className="flex" style={{ minHeight: H }}>
            {/* elbow connector */}
            <div className="relative flex-shrink-0" style={{ width: 20 }}>
                {/* vertical line upward */}
                <div className="absolute" style={{ left: 9, top: 0, height: H / 2, width: 1, background: CONNECTOR }} />
                {/* vertical line downward — hidden on last child */}
                {!isLast && <div className="absolute" style={{ left: 9, top: H / 2, bottom: 0, width: 1, background: CONNECTOR }} />}
                {/* horizontal elbow */}
                <div className="absolute" style={{ left: 9, top: H / 2 - 0.5, width: 11, height: 1, background: CONNECTOR }} />
            </div>

            {/* issue pill */}
            <div className="flex-1 flex items-center py-1 min-w-0">
                <a
                    href={`${issue.webUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-accent/50 transition-colors text-sm min-w-0"
                >
                    <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className={`truncate font-medium flex-1 min-w-0 ${isClosed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        #{issue.iid} {issue.title}
                    </span>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                        {isClosed ? 'closed' : 'open'}
                    </span>
                </a>
            </div>
        </div>
    );
}

function CardEpicNode({ epic, depth = 0, isLast = false }: { epic: Epic; depth?: number; isLast?: boolean }) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = epic.children.nodes.length > 0;
    const hasIssues = epic.issues.nodes.length > 0;
    const hasContent = hasChildren || hasIssues;
    const totalIssues = epic.issues.nodes.length;
    const closedIssues = epic.issues.nodes.filter(i => i.state === 'closed').length;
    const isClosed = epic.state === 'closed';
    const accent = getEpicColor(epic);
    const H = 40;

    return (
        <div className="flex">
            {/* depth connector for nested epics */}
            {depth > 0 && (
                <div className="relative flex-shrink-0" style={{ width: 20 }}>
                    <div className="absolute" style={{ left: 9, top: 0, height: H / 2, width: 1, background: CONNECTOR }} />
                    {!isLast && <div className="absolute" style={{ left: 9, top: H / 2, bottom: 0, width: 1, background: CONNECTOR }} />}
                    <div className="absolute" style={{ left: 9, top: H / 2 - 0.5, width: 11, height: 1, background: CONNECTOR }} />
                </div>
            )}

            <div className="flex-1 min-w-0">
                {/* epic header */}
                <div
                    className="flex items-center gap-2 cursor-pointer group py-1 select-none"
                    style={{ minHeight: H }}
                    onClick={() => hasContent && setExpanded(e => !e)}
                >
                    {/* coloured circle node */}
                    <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: accent, opacity: isClosed ? 0.45 : 1 }}
                    >
                        {hasContent && (
                            <span className="text-white text-[9px] font-bold leading-none">
                                {expanded ? '−' : '+'}
                            </span>
                        )}
                    </div>

                    <span className={`font-semibold text-sm truncate ${isClosed ? 'text-muted-foreground' : 'text-foreground'} group-hover:text-primary transition-colors`}>
                        {epic.title}
                    </span>

                    {totalIssues > 0 && (
                        <>
                            <span className="text-xs text-muted-foreground flex-shrink-0">{closedIssues}/{totalIssues}</span>
                            <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                                <div className="h-full bg-green-400 rounded-full" style={{ width: `${(closedIssues / totalIssues) * 100}%` }} />
                            </div>
                        </>
                    )}

                    <span className={`ml-auto flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                        {isClosed ? 'closed' : 'open'}
                    </span>
                </div>

                {/* children with vertical rail */}
                {expanded && hasContent && (
                    <div className="flex">
                        {/* vertical rail */}
                        <div className="flex-shrink-0" style={{ width: 10, borderRight: `1px solid ${CONNECTOR}`, marginLeft: 9 }} />
                        {/* children */}
                        <div className="flex-1 min-w-0 pl-2 pb-1">
                            {epic.children.nodes.map((child, ci) => (
                                <CardEpicNode
                                    key={child.id}
                                    epic={child}
                                    depth={depth + 1}
                                    isLast={ci === epic.children.nodes.length - 1 && !hasIssues}
                                />
                            ))}
                            {epic.issues.nodes.map((issue, ii) => (
                                <CardIssueRow
                                    key={issue.iid}
                                    issue={issue}
                                    isLast={ii === epic.issues.nodes.length - 1}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Tree node model ───────────────────────────────────────────────────────────

interface TreeNode {
    id: string;
    label: string;
    title: string;
    color: string;
    depth: number;
    isEpic: boolean;
    isClosed: boolean;
    url?: string;
    totalIssues?: number;
    closedIssues?: number;
    children: TreeNode[];
}

function epicToTreeNode(epic: Epic, depth: number): TreeNode {
    const words = epic.title.trim().split(/\s+/);
    const label = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : epic.title.slice(0, 2).toUpperCase();

    const closedIssues = epic.issues.nodes.filter(i => i.state === 'closed').length;
    const issueChildren: TreeNode[] = epic.issues.nodes.map(issue => ({
        id: `issue-${issue.iid}`,
        label: `#${issue.iid}`,
        title: issue.title,
        color: getIssueColor(issue),
        depth: depth + 1,
        isEpic: false,
        isClosed: issue.state === 'closed',
        url: issue.webUrl,
        children: [],
    }));

    return {
        id: epic.id,
        label,
        title: epic.title,
        color: getEpicColor(epic),
        depth,
        isEpic: true,
        isClosed: epic.state === 'closed',
        totalIssues: epic.issues.nodes.length,
        closedIssues,
        children: [
            ...epic.children.nodes.map(c => epicToTreeNode(c, depth + 1)),
            ...issueChildren,
        ],
    };
}

// ── Layout engine ─────────────────────────────────────────────────────────────

const R = 30;
const H_GAP = 28;
const V_GAP = 80;
const LABEL_H = 18; // px below circle for label text

interface LayoutNode { node: TreeNode; x: number; y: number; expanded: boolean }

function layoutTree(root: TreeNode, expandedIds: Set<string>) {
    const nodes: LayoutNode[] = [];

    function subtreeWidth(n: TreeNode): number {
        if (!expandedIds.has(n.id) || n.children.length === 0) return R * 2 + H_GAP;
        const total = n.children.reduce((sum, c) => sum + subtreeWidth(c), 0);
        return Math.max(R * 2 + H_GAP, total);
    }

    function place(n: TreeNode, cx: number, cy: number) {
        nodes.push({ node: n, x: cx, y: cy, expanded: expandedIds.has(n.id) });
        if (!expandedIds.has(n.id) || n.children.length === 0) return;
        const widths = n.children.map(subtreeWidth);
        const total = widths.reduce((a, b) => a + b, 0);
        let lx = cx - total / 2;
        n.children.forEach((child, i) => {
            place(child, lx + widths[i] / 2, cy + R * 2 + V_GAP);
            lx += widths[i];
        });
    }

    const rw = subtreeWidth(root);
    place(root, rw / 2, R + 6);

    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs) - R - 12;
    const shiftX = minX < 0 ? -minX : 0;

    const width  = Math.max(...xs) + R + 12 + shiftX;
    const height = Math.max(...ys) + R + LABEL_H + 8;

    return {
        nodes: nodes.map(n => ({ ...n, x: n.x + shiftX })),
        width,
        height,
    };
}

// ── SVG Tree ──────────────────────────────────────────────────────────────────

function SvgTree({ roots }: { roots: TreeNode[] }) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        const ids = new Set<string>();
        function collect(n: TreeNode) { ids.add(n.id); n.children.forEach(collect); }
        roots.forEach(collect);
        return ids;
    });
    const [hovered, setHovered] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    const toggle = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    // virtual root for multiple epics
    const vRoot: TreeNode = {
        id: '__vroot__', label: 'Projekt', title: 'Projekt',
        color: '#94a3b8', depth: -1, isEpic: true, isClosed: false, children: roots,
    };
    const effectiveExp = new Set(expandedIds);
    effectiveExp.add('__vroot__');
    const hideVRoot = roots.length === 1;

    const { nodes, width, height } = layoutTree(vRoot, effectiveExp);
    const nodeMap = new Map(nodes.map(n => [n.node.id, n]));

    // edges
    const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    nodes.forEach(({ node, x, y, expanded }) => {
        if (!expanded) return;
        node.children.forEach(child => {
            const c = nodeMap.get(child.id);
            if (c) edges.push({ x1: x, y1: y + R, x2: c.x, y2: c.y - R, key: `${node.id}-${child.id}` });
        });
    });

    const hoveredNode = hovered ? nodeMap.get(hovered)?.node : null;

    useEffect(() => {
        const h = () => setHovered(null);
        window.addEventListener('click', h);
        return () => window.removeEventListener('click', h);
    }, []);

    return (
        <div className="relative w-full overflow-x-auto">
            <svg ref={svgRef} width={width} height={height} className="mx-auto block">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
                    </filter>
                </defs>

                {/* edges — straight lines like the reference image */}
                {edges.map(e => (
                    <line
                        key={e.key}
                        x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        className="text-border"
                    />
                ))}

                {/* nodes */}
                {nodes.map(({ node, x, y, expanded }) => {
                    if (hideVRoot && node.id === '__vroot__') return null;
                    const hasKids = node.children.length > 0;
                    const isIssue = !node.isEpic;
                    const alpha = node.isClosed ? 0.45 : 1;
                    const isHov = hovered === node.id;

                    // Issue nodes are rendered as <a> (foreignObject SVG anchor)
                    if (isIssue && node.url) {
                        return (
                            <a
                                key={node.id}
                                href={node.url}
                                target="_blank"
                                rel="noreferrer"
                                onMouseEnter={e => {
                                    setHovered(node.id);
                                    const r = svgRef.current?.getBoundingClientRect();
                                    setTooltipPos({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) });
                                }}
                                onMouseLeave={() => setHovered(null)}
                            >
                                <circle
                                    cx={x} cy={y} r={isHov ? R + 2 : R}
                                    fill={node.color}
                                    opacity={alpha}
                                    filter="url(#shadow)"
                                    style={{ transition: 'r 0.1s' }}
                                />
                                <circle
                                    cx={x} cy={y} r={R - 1}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.25)"
                                    strokeWidth={1.5}
                                    opacity={alpha}
                                />
                                <text
                                    x={x} y={y}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fill="white" fontSize={9} fontWeight="700"
                                    opacity={alpha}
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                                >
                                    {node.label}
                                </text>
                                {/* title below */}
                                <text
                                    x={x} y={y + R + 13}
                                    textAnchor="middle"
                                    fill="#a1a1aa" fontSize={9}
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                                >
                                    {node.title.length > 16 ? node.title.slice(0, 15) + '…' : node.title}
                                </text>
                            </a>
                        );
                    }

                    // Epic nodes
                    return (
                        <g
                            key={node.id}
                            style={{ cursor: hasKids ? 'pointer' : 'default' }}
                            onClick={e => { e.stopPropagation(); if (hasKids) toggle(node.id); }}
                            onMouseEnter={e => {
                                if (node.id !== '__vroot__') {
                                    setHovered(node.id);
                                    const r = svgRef.current?.getBoundingClientRect();
                                    setTooltipPos({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) });
                                }
                            }}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <circle
                                cx={x} cy={y} r={isHov ? R + 3 : R}
                                fill={node.color}
                                opacity={alpha}
                                filter="url(#shadow)"
                                style={{ transition: 'r 0.12s' }}
                            />
                            {/* inner ring */}
                            <circle
                                cx={x} cy={y} r={R - 1}
                                fill="none"
                                stroke="rgba(255,255,255,0.25)"
                                strokeWidth={1.5}
                                opacity={alpha}
                            />
                            {/* progress arc for epics with issues */}
                            {node.totalIssues != null && node.totalIssues > 0 && (() => {
                                const pct = (node.closedIssues ?? 0) / node.totalIssues;
                                const r2 = R - 4;
                                const sweep = pct * 2 * Math.PI;
                                const ex = x + r2 * Math.sin(sweep);
                                const ey = y - r2 * Math.cos(sweep);
                                const large = sweep > Math.PI ? 1 : 0;
                                const d = pct >= 1
                                    ? `M ${x} ${y - r2} A ${r2} ${r2} 0 1 1 ${x - 0.01} ${y - r2}`
                                    : `M ${x} ${y - r2} A ${r2} ${r2} 0 ${large} 1 ${ex} ${ey}`;
                                return (
                                    <path
                                        d={d} fill="none"
                                        stroke="rgba(255,255,255,0.55)"
                                        strokeWidth={3} strokeLinecap="round"
                                        opacity={alpha}
                                    />
                                );
                            })()}
                            {/* label */}
                            <text
                                x={x} y={y}
                                textAnchor="middle" dominantBaseline="middle"
                                fill="white" fontSize={11} fontWeight="700"
                                opacity={alpha}
                                style={{ userSelect: 'none', pointerEvents: 'none' }}
                            >
                                {node.label.slice(0, 4)}
                            </text>
                            {/* collapse badge */}
                            {hasKids && !expanded && (
                                <text x={x} y={y + R + 13} textAnchor="middle" fill="#a1a1aa" fontSize={9}
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                                    +{node.children.length}
                                </text>
                            )}
                            {/* title below node (only for visible, non-virtual) */}
                            {node.id !== '__vroot__' && (
                                <text x={x} y={y + R + 13} textAnchor="middle" fill="#a1a1aa" fontSize={9}
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                                    {!expanded && hasKids ? `+${node.children.length}` : (node.title.length > 16 ? node.title.slice(0, 15) + '…' : node.title)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* tooltip */}
            {hovered && hoveredNode && tooltipPos && (
                <div
                    className="absolute z-50 pointer-events-none rounded-lg bg-popover border border-border shadow-xl px-3 py-2 text-xs max-w-60"
                    style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
                >
                    <p className="font-semibold text-foreground leading-snug mb-1">{hoveredNode.title}</p>
                    {hoveredNode.isEpic && hoveredNode.totalIssues != null && (
                        <p className="text-muted-foreground">{hoveredNode.closedIssues}/{hoveredNode.totalIssues} Issues geschlossen</p>
                    )}
                    <p className={`mt-1 font-medium ${hoveredNode.isClosed ? 'text-zinc-400' : 'text-emerald-400'}`}>
                        {hoveredNode.isClosed ? 'closed' : 'open'}
                    </p>
                    {!hoveredNode.isEpic && (
                        <p className="text-muted-foreground mt-0.5 italic">↗ GitLab öffnen</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function EpicGraph({ epics }: { epics: Epic[] }) {
    const [view, setView] = useState<'card' | 'tree'>('card');
    const treeRoots = epics.map(e => epicToTreeNode(e, 0));

    return (
        <CollapsibleCard
            title="Epics & Issues"
            extra={
                <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5 bg-muted/40">
                    <button onClick={() => setView('card')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${view === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        <List className="w-3.5 h-3.5" /> Karten
                    </button>
                    <button onClick={() => setView('tree')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${view === 'tree' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        <GitBranch className="w-3.5 h-3.5" /> Baum
                    </button>
                </div>
            }
        >
            {epics.length === 0 && <p className="text-sm text-muted-foreground">Keine Epics gefunden.</p>}

            {view === 'card' && (
                <div className="space-y-2">
                    {epics.map((epic, i) => (
                        <CardEpicNode key={epic.id} epic={epic} depth={0} isLast={i === epics.length - 1} />
                    ))}
                </div>
            )}

            {view === 'tree' && epics.length > 0 && <SvgTree roots={treeRoots} />}
        </CollapsibleCard>
    );
}
