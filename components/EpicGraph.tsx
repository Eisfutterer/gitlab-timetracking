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

// depth → circle fill colour (like the reference image)
const DEPTH_COLORS = ['#b45309', '#d97706', '#4ade80', '#34d399', '#60a5fa', '#a78bfa'];
function depthColor(depth: number) { return DEPTH_COLORS[depth % DEPTH_COLORS.length]; }

// ── Card view (unchanged) ─────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: EpicIssue }) {
    const color = getIssueColor(issue);
    const label = issue.labels.nodes[0]?.title;
    const isClosed = issue.state === 'closed';
    return (
        <a
            href={`${GITLAB_CONFIG.ISSUE_BASE_URL}/${issue.iid}`}
            target="_blank" rel="noreferrer"
            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-background border border-border hover:bg-accent/50 transition-colors text-sm"
        >
            <span className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <div className="min-w-0">
                <p className={`truncate font-medium ${isClosed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    #{issue.iid} {issue.title}
                </p>
                {label && <span className="text-xs text-muted-foreground">{label}</span>}
            </div>
            <span className={`ml-auto flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                {isClosed ? 'closed' : 'open'}
            </span>
        </a>
    );
}

function EpicNode({ epic, depth = 0 }: { epic: Epic; depth?: number }) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = epic.children.nodes.length > 0;
    const hasIssues = epic.issues.nodes.length > 0;
    const totalIssues = epic.issues.nodes.length;
    const closedIssues = epic.issues.nodes.filter(i => i.state === 'closed').length;
    const isClosed = epic.state === 'closed';
    const borderColors = ['border-l-blue-400', 'border-l-purple-400', 'border-l-teal-400', 'border-l-orange-400'];
    return (
        <div className={`border-l-4 ${borderColors[depth % borderColors.length]} pl-4 ${depth > 0 ? 'mt-3' : ''}`}>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setExpanded(e => !e)}>
                <span className="text-muted-foreground text-xs w-4">
                    {(hasChildren || hasIssues) ? (expanded ? '▾' : '▸') : ''}
                </span>
                <h3 className={`font-semibold ${depth === 0 ? 'text-base' : 'text-sm'} ${isClosed ? 'text-muted-foreground' : 'text-foreground'} group-hover:text-primary transition-colors`}>
                    {epic.title}
                </h3>
                {totalIssues > 0 && <span className="text-xs text-muted-foreground ml-1">{closedIssues}/{totalIssues} Issues</span>}
                {totalIssues > 0 && (
                    <div className="flex-1 max-w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${(closedIssues / totalIssues) * 100}%` }} />
                    </div>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                    {isClosed ? 'closed' : 'open'}
                </span>
            </div>
            {expanded && (
                <div className="mt-2 space-y-1.5">
                    {hasIssues && (
                        <div className="space-y-1.5 mb-3">
                            {epic.issues.nodes.map(issue => <IssueCard key={issue.iid} issue={issue} />)}
                        </div>
                    )}
                    {hasChildren && epic.children.nodes.map(child => (
                        <EpicNode key={child.id} epic={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Tree node data model ──────────────────────────────────────────────────────

interface TreeNode {
    id: string;
    label: string;          // short label for circle
    title: string;          // full title for tooltip/popup
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
    // Short label: up to 3 chars or issue count
    const words = epic.title.split(' ');
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
        url: `${GITLAB_CONFIG.ISSUE_BASE_URL}/${issue.iid}`,
        children: [],
    }));

    const epicChildren: TreeNode[] = epic.children.nodes.map(c => epicToTreeNode(c, depth + 1));

    return {
        id: epic.id,
        label,
        title: epic.title,
        color: depthColor(depth),
        depth,
        isEpic: true,
        isClosed: epic.state === 'closed',
        totalIssues: epic.issues.nodes.length,
        closedIssues,
        children: [...epicChildren, ...issueChildren],
    };
}

// ── Layout engine (Reingold-Tilford-style, pure JS) ───────────────────────────

const NODE_R = 28;       // circle radius px
const H_GAP = 24;        // horizontal gap between sibling circles
const V_GAP = 90;        // vertical gap between levels

interface LayoutNode {
    node: TreeNode;
    x: number;
    y: number;
    expanded: boolean;
}

function layoutTree(
    root: TreeNode,
    expandedIds: Set<string>,
): { nodes: LayoutNode[]; width: number; height: number } {
    const nodes: LayoutNode[] = [];

    function subtreeWidth(n: TreeNode): number {
        if (!expandedIds.has(n.id) || n.children.length === 0) return NODE_R * 2;
        const childWidths = n.children.map(subtreeWidth);
        const total = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (n.children.length - 1);
        return Math.max(NODE_R * 2, total);
    }

    function place(n: TreeNode, cx: number, cy: number) {
        nodes.push({ node: n, x: cx, y: cy, expanded: expandedIds.has(n.id) });
        if (!expandedIds.has(n.id) || n.children.length === 0) return;
        const childWidths = n.children.map(subtreeWidth);
        const totalW = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (n.children.length - 1);
        let startX = cx - totalW / 2;
        n.children.forEach((child, i) => {
            const cw = childWidths[i];
            place(child, startX + cw / 2, cy + V_GAP + NODE_R * 2);
            startX += cw + H_GAP;
        });
    }

    const rootWidth = subtreeWidth(root);
    const startX = rootWidth / 2;
    place(root, startX, NODE_R + 4);

    const maxX = Math.max(...nodes.map(n => n.x + NODE_R)) + 8;
    const maxY = Math.max(...nodes.map(n => n.y + NODE_R)) + 16;

    return { nodes, width: maxX, height: maxY };
}

// ── SVG Tree renderer ─────────────────────────────────────────────────────────

interface SvgTreeProps {
    roots: TreeNode[];
}

function SvgTree({ roots }: SvgTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        const ids = new Set<string>();
        function collect(n: TreeNode) { ids.add(n.id); n.children.forEach(collect); }
        roots.forEach(collect);
        return ids;
    });
    const [tooltip, setTooltip] = useState<{ node: TreeNode; x: number; y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const toggleNode = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    // Build a virtual root if multiple top-level epics
    const virtualRoot: TreeNode = {
        id: '__root__',
        label: 'Projekt',
        title: 'Projekt',
        color: depthColor(0),
        depth: -1,
        isEpic: true,
        isClosed: false,
        children: roots,
    };
    // Always expand the virtual root
    const effectiveExpanded = new Set(expandedIds);
    effectiveExpanded.add('__root__');

    const { nodes, width, height } = layoutTree(virtualRoot, effectiveExpanded);

    // Build edge list
    const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const nodeMap = new Map(nodes.map(n => [n.node.id, n]));
    nodes.forEach(({ node, x, y, expanded }) => {
        if (!expanded) return;
        node.children.forEach(child => {
            const c = nodeMap.get(child.id);
            if (c) edges.push({ x1: x, y1: y + NODE_R, x2: c.x, y2: c.y - NODE_R });
        });
    });

    // Tooltip hide on outside click
    useEffect(() => {
        const handler = () => setTooltip(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    return (
        <div className="relative w-full overflow-x-auto">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="mx-auto block"
                style={{ minWidth: Math.min(width, 320) }}
            >
                {/* edges */}
                {edges.map((e, i) => {
                    const midY = (e.y1 + e.y2) / 2;
                    return (
                        <path
                            key={i}
                            d={`M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="text-border"
                            opacity={0.6}
                        />
                    );
                })}

                {/* nodes */}
                {nodes.map(({ node, x, y, expanded }) => {
                    if (node.id === '__root__' && roots.length === 1) return null; // hide phantom root for single root
                    const hasChildren = node.children.length > 0;
                    const isVirtual = node.id === '__root__';
                    const opacity = node.isClosed ? 0.5 : 1;

                    return (
                        <g
                            key={node.id}
                            transform={`translate(${x},${y})`}
                            style={{ cursor: hasChildren ? 'pointer' : node.url ? 'pointer' : 'default' }}
                            onClick={e => {
                                e.stopPropagation();
                                if (hasChildren) {
                                    toggleNode(node.id);
                                } else if (node.url) {
                                    window.open(node.url, '_blank', 'noreferrer');
                                }
                            }}
                            onMouseEnter={e => {
                                if (!isVirtual) {
                                    const svgRect = svgRef.current?.getBoundingClientRect();
                                    setTooltip({ node, x: e.clientX - (svgRect?.left ?? 0), y: e.clientY - (svgRect?.top ?? 0) });
                                }
                            }}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            {/* shadow */}
                            <circle r={NODE_R + 2} fill="black" opacity={0.12} cy={3} />
                            {/* main circle */}
                            <circle
                                r={NODE_R}
                                fill={node.color}
                                opacity={opacity}
                                stroke={node.isClosed ? 'none' : 'white'}
                                strokeWidth={node.isClosed ? 0 : 1.5}
                                strokeOpacity={0.3}
                            />
                            {/* progress ring for epics with issues */}
                            {node.isEpic && node.totalIssues && node.totalIssues > 0 && (
                                <circle
                                    r={NODE_R - 3}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.5)"
                                    strokeWidth={3}
                                    strokeDasharray={`${((node.closedIssues ?? 0) / node.totalIssues) * 2 * Math.PI * (NODE_R - 3)} ${2 * Math.PI * (NODE_R - 3)}`}
                                    strokeLinecap="round"
                                    transform="rotate(-90)"
                                    opacity={opacity}
                                />
                            )}
                            {/* label */}
                            <text
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize={node.isEpic ? 11 : 9}
                                fontWeight="700"
                                opacity={opacity}
                                style={{ userSelect: 'none', pointerEvents: 'none' }}
                            >
                                {node.label.length > 5 ? node.label.slice(0, 4) + '…' : node.label}
                            </text>
                            {/* collapse indicator */}
                            {hasChildren && !expanded && (
                                <text
                                    y={NODE_R + 11}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fill="currentColor"
                                    className="text-muted-foreground"
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                                >
                                    +{node.children.length}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="absolute z-50 pointer-events-none rounded-lg bg-popover border border-border shadow-lg px-3 py-2 text-xs max-w-56"
                    style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
                >
                    <p className="font-semibold text-foreground mb-1">{tooltip.node.title}</p>
                    {tooltip.node.isEpic && tooltip.node.totalIssues !== undefined && (
                        <p className="text-muted-foreground">
                            {tooltip.node.closedIssues}/{tooltip.node.totalIssues} Issues geschlossen
                        </p>
                    )}
                    <p className={`mt-1 ${tooltip.node.isClosed ? 'text-muted-foreground' : 'text-primary'}`}>
                        {tooltip.node.isClosed ? 'closed' : 'open'}
                    </p>
                    {!tooltip.node.isEpic && (
                        <p className="text-muted-foreground mt-0.5">Klicken zum Öffnen →</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Root component ────────────────────────────────────────────────────────────

interface EpicGraphProps {
    epics: Epic[];
}

export default function EpicGraph({ epics }: EpicGraphProps) {
    const [view, setView] = useState<'card' | 'tree'>('card');

    const treeRoots = epics.map(e => epicToTreeNode(e, 0));

    return (
        <CollapsibleCard
            title="Epics & Issues"
            extra={
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/40">
                    <button
                        onClick={() => setView('card')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            view === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <List className="w-3.5 h-3.5" /> Karten
                    </button>
                    <button
                        onClick={() => setView('tree')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            view === 'tree' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <GitBranch className="w-3.5 h-3.5" /> Baum
                    </button>
                </div>
            }
        >
            {epics.length === 0 && (
                <p className="text-muted-foreground text-sm">Keine Epics gefunden.</p>
            )}

            {view === 'card' && (
                <div className="space-y-6">
                    {epics.map(epic => <EpicNode key={epic.id} epic={epic} depth={0} />)}
                </div>
            )}

            {view === 'tree' && epics.length > 0 && (
                <SvgTree roots={treeRoots} />
            )}
        </CollapsibleCard>
    );
}
