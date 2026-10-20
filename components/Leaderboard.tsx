'use client';

import { LeaderboardEntry } from '@/lib/processData';

const MEDALS = ['🥇', '🥈', '🥉'];

interface Props {
    leaderboard: LeaderboardEntry[];
}

export default function Leaderboard({ leaderboard }: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Leaderboard</h2>

            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {leaderboard.map(entry => (
                        <div key={entry.name} className="flex items-center gap-4 px-4 py-3">
                            <span className="w-8 shrink-0 text-center text-lg">
                                {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{entry.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{entry.issueCount} Issues</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                    {entry.hours.toFixed(1)} h
                                </p>
                                <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-blue-500"
                                        style={{ width: `${Math.min(100, (entry.hours / (leaderboard[0]?.hours || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {leaderboard.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-400">Noch keine Zeitbuchungen</p>
                    )}
                </div>
            </div>
        </div>
    );
}
