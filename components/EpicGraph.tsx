"use client"

import React, { useState } from 'react';
import { Epic, EpicIssue } from '../types/dashboard';
import { GITLAB_CONFIG, CATEGORIES, COLORS } from '../config/dashboardConfig';
import CollapsibleCard from './CollapsibleCard';
import { List, GitBranch } from 'lucide-react';

function getIssueColor(issue: EpicIssue): string {
    const label = issue.labels.nodes.find(l => Object.values(CATEGORIES).includes(l.title as never));
    return label ? (COLORS.CATEGORY[label.title as keyof typeof COLORS.CATEGORY] ?? '#94a3b8') : '#94a3b8';
}

// ── Card view (original) ──────────────────────────────────────────────────────

function IssueCard({ issue }: { issue: EpicIssue }) {
    const color = getIssueColor(issue);
    const label = issue.labels.nodes[0]?.title;
    const isClosed = issue.state === 'closed';

    return (
        <a
            href={`${GITLAB_CONFIG.ISSUE_BASE_URL}/${issue.iid}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-background border border-border hover:bg-accent/50 transition-colors text-sm"
        >
            <span
                className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
                <p className={`truncate font-medium ${isClosed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    #{issue.iid} {issue.title}
                </p>
                {label && (
                    <span className="text-xs text-muted-foreground">{label}</span>
                )}
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
    const borderColor = borderColors[depth % borderColors.length];

    return (
        <div className={`border-l-4 ${borderColor} pl-4 ${depth > 0 ? 'mt-3' : ''}`}>
            <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setExpanded(e => !e)}
            >
                <span className="text-muted-foreground text-xs w-4">
                    {(hasChildren || hasIssues) ? (expanded ? '▾' : '▸') : ''}
                </span>
                <h3 className={`font-semibold ${depth === 0 ? 'text-base' : 'text-sm'} ${isClosed ? 'text-muted-foreground' : 'text-foreground'} group-hover:text-primary transition-colors`}>
                    {epic.title}
                </h3>
                {totalIssues > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                        {closedIssues}/{totalIssues} Issues
                    </span>
                )}
                {totalIssues > 0 && (
                    <div className="flex-1 max-w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-400 rounded-full"
                            style={{ width: `${(closedIssues / totalIssues) * 100}%` }}
                        />
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
                            {epic.issues.nodes.map(issue => (
                                <IssueCard key={issue.iid} issue={issue} />
                            ))}
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

// ── Tree view ─────────────────────────────────────────────────────────────────

const CONNECTOR_COLOR = 'var(--border, #3f3f46)';
const NODE_HEIGHT = 36; // px per row, used for connector math

interface TreeIssueRowProps {
    issue: EpicIssue;
    isLast: boolean;
}

function TreeIssueRow({ issue, isLast }: TreeIssueRowProps) {
    const color = getIssueColor(issue);
    const isClosed = issue.state === 'closed';

    return (
        <div className="flex items-stretch" style={{ minHeight: NODE_HEIGHT }}>
            {/* vertical + horizontal connector */}
            <div className="relative flex-shrink-0" style={{ width: 24 }}>
                {/* vertical line going down (hidden on last item) */}
                {!isLast && (
                    <div
                        className="absolute"
                        style={{ left: 11, top: NODE_HEIGHT / 2, bottom: 0, width: 2, backgroundColor: CONNECTOR_COLOR }}
                    />
                )}
                {/* vertical line going up */}
                <div
                    className="absolute"
                    style={{ left: 11, top: 0, height: NODE_HEIGHT / 2, width: 2, backgroundColor: CONNECTOR_COLOR }}
                />
                {/* horizontal elbow */}
                <div
                    className="absolute"
                    style={{ left: 11, top: NODE_HEIGHT / 2 - 1, width: 13, height: 2, backgroundColor: CONNECTOR_COLOR }}
                />
            </div>

            {/* issue pill */}
            <a
                href={`${GITLAB_CONFIG.ISSUE_BASE_URL}/${issue.iid}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 my-1 px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-accent/50 transition-colors text-sm flex-1 min-w-0"
            >
                <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className={`truncate font-medium ${isClosed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    #{issue.iid} {issue.title}
                </span>
                <span className={`ml-auto flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                    {isClosed ? 'closed' : 'open'}
                </span>
            </a>
        </div>
    );
}

interface TreeEpicNodeProps {
    epic: Epic;
    depth?: number;
    isLast?: boolean;
}

function TreeEpicNode({ epic, depth = 0, isLast = false }: TreeEpicNodeProps) {
    const [expanded, setExpanded] = useState(true);
    const isClosed = epic.state === 'closed';
    const totalIssues = epic.issues.nodes.length;
    const closedIssues = epic.issues.nodes.filter(i => i.state === 'closed').length;
    const hasChildren = epic.children.nodes.length > 0;
    const hasIssues = epic.issues.nodes.length > 0;
    const hasContent = hasChildren || hasIssues;

    const accentColors = ['#60a5fa', '#a78bfa', '#2dd4bf', '#fb923c'];
    const accent = accentColors[depth % accentColors.length];

    return (
        <div className="flex items-stretch">
            {/* depth indent with vertical line */}
            {depth > 0 && (
                <div className="relative flex-shrink-0" style={{ width: 24 }}>
                    {!isLast && (
                        <div
                            className="absolute"
                            style={{ left: 11, top: 0, bottom: 0, width: 2, backgroundColor: CONNECTOR_COLOR }}
                        />
                    )}
                    <div
                        className="absolute"
                        style={{ left: 11, top: 0, height: NODE_HEIGHT / 2, width: 2, backgroundColor: CONNECTOR_COLOR }}
                    />
                    <div
                        className="absolute"
                        style={{ left: 11, top: NODE_HEIGHT / 2 - 1, width: 13, height: 2, backgroundColor: CONNECTOR_COLOR }}
                    />
                </div>
            )}

            {/* right column: header + children */}
            <div className="flex-1 min-w-0">
                {/* epic header row */}
                <div
                    className="flex items-center gap-2 cursor-pointer group py-1"
                    style={{ minHeight: NODE_HEIGHT }}
                    onClick={() => hasContent && setExpanded(e => !e)}
                >
                    {/* circle node */}
                    <div
                        className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: accent, backgroundColor: isClosed ? 'transparent' : `${accent}33` }}
                    >
                        {isClosed && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />}
                    </div>

                    <span className={`font-semibold ${depth === 0 ? 'text-base' : 'text-sm'} ${isClosed ? 'text-muted-foreground' : 'text-foreground'} group-hover:text-primary transition-colors truncate`}>
                        {epic.title}
                    </span>

                    {totalIssues > 0 && (
                        <>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                {closedIssues}/{totalIssues}
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                                <div className="h-full bg-green-400 rounded-full" style={{ width: `${(closedIssues / totalIssues) * 100}%` }} />
                            </div>
                        </>
                    )}

                    <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0 ${isClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                        {isClosed ? 'closed' : 'open'}
                    </span>

                    {hasContent && (
                        <span className="text-muted-foreground text-xs flex-shrink-0">
                            {expanded ? '▾' : '▸'}
                        </span>
                    )}
                </div>

                {/* children block — indented with a vertical rail */}
                {expanded && hasContent && (
                    <div className="flex items-stretch ml-2">
                        {/* vertical rail connecting all children */}
                        <div className="relative flex-shrink-0" style={{ width: 2 }}>
                            <div className="absolute inset-0" style={{ backgroundColor: CONNECTOR_COLOR }} />
                        </div>

                        {/* children */}
                        <div className="flex-1 min-w-0 pl-4 pb-2">
                            {/* sub-epics */}
                            {epic.children.nodes.map((child, ci) => (
                                <TreeEpicNode
                                    key={child.id}
                                    epic={child}
                                    depth={depth + 1}
                                    isLast={ci === epic.children.nodes.length - 1 && !hasIssues}
                                />
                            ))}
                            {/* issues */}
                            {epic.issues.nodes.map((issue, ii) => (
                                <TreeIssueRow
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

// ── Root component ────────────────────────────────────────────────────────────

interface EpicGraphProps {
    epics: Epic[];
}

export default function EpicGraph({ epics }: EpicGraphProps) {
    const [view, setView] = useState<'card' | 'tree'>('card');

    return (
        <CollapsibleCard
            title="Epics & Issues"
            extra={
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/40">
                    <button
                        onClick={() => setView('card')}
                        title="Kartenansicht"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            view === 'card'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <List className="w-3.5 h-3.5" />
                        Karten
                    </button>
                    <button
                        onClick={() => setView('tree')}
                        title="Baumansicht"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            view === 'tree'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <GitBranch className="w-3.5 h-3.5" />
                        Baum
                    </button>
                </div>
            }
        >
            {epics.length === 0 && (
                <p className="text-muted-foreground text-sm">Keine Epics gefunden.</p>
            )}

            {view === 'card' && (
                <div className="space-y-6">
                    {epics.map(epic => (
                        <EpicNode key={epic.id} epic={epic} depth={0} />
                    ))}
                </div>
            )}

            {view === 'tree' && (
                <div className="space-y-4">
                    {epics.map((epic, i) => (
                        <TreeEpicNode
                            key={epic.id}
                            epic={epic}
                            depth={0}
                            isLast={i === epics.length - 1}
                        />
                    ))}
                </div>
            )}
        </CollapsibleCard>
    );
}
