'use client';

import { useState, useEffect } from 'react';
import { GroupSummary } from '@/app/api/groups/route';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function GroupComparison() {
    const [groups, setGroups] = useState<GroupSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    const fetchGroups = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/groups');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setGroups(data);
            setLoaded(true);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const maxHours = groups[0]?.totalHours ?? 1;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Gruppen-Vergleich</h2>
                <Button variant="outline" size="sm" onClick={fetchGroups} disabled={loading}>
                    {loading ? 'Lädt…' : 'Aktualisieren'}
                </Button>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    Fehler: {error}
                </div>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {loading && !loaded ? (
                    <div className="divide-y divide-border">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3">
                                <Skeleton className="h-4 w-4 shrink-0" />
                                <Skeleton className="h-4 flex-1" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {groups.map((g, i) => {
                            const isOurs = g.fullPath === 'dhbw-se/software-engineering-i-tinf25b6/g4-mergeconflict';
                            return (
                                <div
                                    key={g.fullPath}
                                    className={`flex items-center gap-4 px-4 py-3 ${isOurs ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <span className="w-6 shrink-0 text-right text-sm font-medium text-gray-400">
                                        #{i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium truncate ${isOurs ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                                            {g.name} {isOurs && '← unsere Gruppe'}
                                        </p>
                                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isOurs ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-600'}`}
                                                style={{ width: `${Math.min(100, (g.totalHours / maxHours) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-semibold text-foreground">
                                            {g.totalHours.toFixed(1)} h
                                        </p>
                                        {g.memberCount > 0 && (
                                            <p className="text-xs text-gray-400">{g.memberCount} Mitglieder</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {groups.length === 0 && loaded && (
                            <p className="px-4 py-6 text-center text-sm text-gray-400">Keine Gruppen gefunden</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
