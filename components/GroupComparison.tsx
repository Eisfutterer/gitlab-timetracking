'use client';

import { useState, useEffect } from 'react';
import { GroupSummary } from '@/app/api/groups/route';
import { Skeleton } from '@/components/ui/skeleton';
import CollapsibleCard from './CollapsibleCard';

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
        <CollapsibleCard title="Gruppen-Vergleich">

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Fehler: {error}
                </div>
            )}

            <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
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
                            return (
                                <div
                                    key={g.fullPath}
                                    className="flex items-center gap-4 px-4 py-3"
                                >
                                    <span className="w-6 shrink-0 text-right text-sm font-medium text-muted-foreground">
                                        #{i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate text-foreground">
                                            {g.name}
                                        </p>
                                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-muted-foreground/40"
                                                style={{ width: `${Math.min(100, (g.totalHours / maxHours) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-semibold text-foreground">
                                            {g.totalHours.toFixed(1)} h
                                        </p>
                                        {g.memberCount > 0 && (
                                            <p className="text-xs text-muted-foreground">{g.memberCount} Mitglieder</p>
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
        </CollapsibleCard>
    );
}
