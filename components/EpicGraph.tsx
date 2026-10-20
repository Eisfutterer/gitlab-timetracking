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
            className="flex items-start gap-2 px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition-all text-sm"
        >
            <span
                className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
                <p className={`truncate font-medium ${isClosed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                    #{issue.iid} {issue.title}
                </p>
                {label && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
                )}
            </div>
            <span className={`ml-auto flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${isClosed ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
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
                <span className="text-gray-400 dark:text-gray-500 text-xs w-4">
                    {(hasChildren || hasIssues) ? (expanded ? '▾' : '▸') : ''}
                </span>
                <h3 className={`font-semibold ${depth === 0 ? 'text-base' : 'text-sm'} ${isClosed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'} group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
                    {epic.title}
                </h3>
                {totalIssues > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        {closedIssues}/{totalIssues} Issues
                    </span>
                )}
                {totalIssues > 0 && (
                    <div className="flex-1 max-w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-400 rounded-full"
                            style={{ width: `${(closedIssues / totalIssues) * 100}%` }}
                        />
                    </div>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${isClosed ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
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
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100">Epics & Issues</h2>
            <div className="space-y-6">
                {epics.map(epic => (
                    <EpicNode key={epic.id} epic={epic} depth={0} />
                ))}
                {epics.length === 0 && (
                    <p className="text-gray-400 text-sm">Keine Epics gefunden.</p>
                )}
            </div>
        </div>
    );
}
