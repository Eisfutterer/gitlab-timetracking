'use client';

import { LeaderboardEntry } from '@/lib/processData';

interface Props {
    leaderboard: LeaderboardEntry[];
}

const RANK_STYLES = [
    'text-amber-500 font-bold',
    'text-zinc-400 font-bold',
    'text-amber-700 font-bold',
];

export default function Leaderboard({ leaderboard }: Props) {
    const max = leaderboard[0]?.hours || 1;

    return (
        <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Leaderboard</h2>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 divide-y divide-border">
                {leaderboard.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Noch keine Zeitbuchungen
                    </p>
                ) : (
                    leaderboard.map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-4 px-4 py-3">
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
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
