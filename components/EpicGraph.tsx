"use client"

import React, { useState } from 'react';
import { Epic, EpicIssue } from '../types/dashboard';
import { GITLAB_CONFIG, CATEGORIES } from '../config/dashboardConfig';

const CATEGORY_COLORS: Record<string, string> = {
    [CATEGORIES.FRONTEND]: '#0088FE',
    [CATEGORIES.BACKEND]: '#00C49F',
    [CATEGORIES.TESTING]: '#FFBB28',
    [CATEGORIES.PROJEKTMANAGEMENT]: '#FF8042',
    [CATEGORIES.DOKUMENTATION]: '#8884D8',
    [CATEGORIES.REQUIREMENTS_ENGINEERING]: '#82CA9D',
};

function getIssueColor(issue: EpicIssue): string {
    const label = issue.labels.nodes.find(l => Object.values(CATEGORIES).includes(l.title as never));
    return label ? (CATEGORY_COLORS[label.title] ?? '#94a3b8') : '#94a3b8';
}

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

interface EpicGraphProps {
    epics: Epic[];
}

export default function EpicGraph({ epics }: EpicGraphProps) {
    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Epics & Issues</h2>
            <div className="space-y-6">
                {epics.map(epic => (
                    <EpicNode key={epic.id} epic={epic} depth={0} />
                ))}
                {epics.length === 0 && (
                    <p className="text-muted-foreground text-sm">Keine Epics gefunden.</p>
                )}
            </div>
        </div>
    );
}
