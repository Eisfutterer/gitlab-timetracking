'use client';

import { useState } from 'react';
import { LeaderboardEntry } from '@/lib/processData';
import { PersonDetail, ProjectMetrics } from '@/types/dashboard';
import CollapsibleCard from './CollapsibleCard';
import PersonDetailModal from './PersonDetailModal';

interface Props {
    leaderboard: LeaderboardEntry[];
    personDetails: PersonDetail[];
    projectMetrics: ProjectMetrics;
}

const RANK_STYLES = [
    'text-amber-500 font-bold',
    'text-zinc-400 font-bold',
    'text-amber-700 font-bold',
];

export default function Leaderboard({ leaderboard, personDetails, projectMetrics }: Props) {
    const max = leaderboard[0]?.hours || 1;
    const [selected, setSelected] = useState<string | null>(null);

    const selectedEntry = leaderboard.find(e => e.name === selected) ?? null;
    const selectedDetail = personDetails.find(d => d.name === selected) ?? null;
    const modalPerson = selectedEntry && selectedDetail
        ? { ...selectedDetail, ...selectedEntry }
        : null;

    return (
        <>
            <CollapsibleCard title="Leaderboard">
                <div className="divide-y divide-border -mx-6 -mb-6">
                    {leaderboard.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Noch keine Zeitbuchungen
                        </p>
                    ) : (
                        leaderboard.map((entry, i) => (
                            <button
                                key={entry.name}
                                onClick={() => setSelected(entry.name)}
                                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                            >
                                <span className={`w-7 shrink-0 text-sm tabular-nums ${RANK_STYLES[i] ?? 'text-muted-foreground'}`}>
                                    {i < 3 ? `#${entry.rank}` : `${entry.rank}`}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                                    <p className="text-xs text-muted-foreground">{entry.issueCount} Issues</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="hidden sm:block w-28 h-1 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-foreground/40 transition-all"
                                            style={{ width: `${Math.min(100, (entry.hours / max) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold tabular-nums text-foreground w-16 text-right">
                                        {entry.hours.toFixed(1)} h
                                    </span>
                                    <span className="hidden sm:block text-xs text-muted-foreground tabular-nums w-10 text-right">
                                        {entry.percentage.toFixed(0)}%
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </CollapsibleCard>

            <PersonDetailModal
                person={modalPerson}
                onClose={() => setSelected(null)}
                sprintData={projectMetrics.sprintData}
            />
        </>
    );
}
