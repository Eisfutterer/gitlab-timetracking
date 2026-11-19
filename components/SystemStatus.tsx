'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { SystemStatus as Status } from '@/app/api/status/route';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, WifiOff, Server, Clock, Database, GitCommit, RefreshCw, X, Users } from 'lucide-react';

const REFRESH_MS = 30_000;

function fmtTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SystemStatus({ onClose }: { onClose: () => void }) {
    const searchParams = useSearchParams();
    const group = searchParams.get('group') ?? '';
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const qs = group ? `?group=${encodeURIComponent(group)}` : '';
            const res = await fetch(`/api/status${qs}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: Status = await res.json();
            setStatus(data);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [group]);

    useEffect(() => {
        fetchStatus();
        const id = setInterval(fetchStatus, REFRESH_MS);
        return () => clearInterval(id);
    }, [fetchStatus]);

    // close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const online = status?.gitlab.reachable && status.gitlab.tokenValid;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="System-Status"
        >
            <div
                className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* header */}
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">System-Status</h2>
                    <button
                        type="button"
                        onClick={fetchStatus}
                        disabled={loading}
                        className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Jetzt aktualisieren"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        aria-label="Schließen"
                        title="Schließen"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* body */}
                <div className="p-5">
                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
                            Status konnte nicht geladen werden: {error}
                        </div>
                    )}

                    {!status && loading ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : status ? (
                        <div className="space-y-4">
                            <div
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ${
                                    online
                                        ? 'bg-emerald-500/10 ring-emerald-500/30 text-emerald-400'
                                        : 'bg-destructive/10 ring-destructive/30 text-destructive'
                                }`}
                            >
                                {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                                <span className="font-semibold">
                                    {online ? 'Betriebsbereit' : status.gitlab.reachable ? 'Eingeschränkt' : 'Offline'}
                                </span>
                                <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    Geprüft {fmtTime(status.app.checkedAt)}
                                </span>
                            </div>

                            {/* scope: which group the counts below refer to */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                Kennzahlen für: <span className="font-medium text-foreground">{status.scope.label}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <StatusTile
                                    icon={<Server className="h-4 w-4" />}
                                    label="GitLab-API"
                                    value={status.gitlab.reachable ? 'Erreichbar' : 'Nicht erreichbar'}
                                    sub={status.gitlab.responseMs != null ? `${status.gitlab.responseMs} ms` : undefined}
                                    ok={status.gitlab.reachable}
                                />
                                <StatusTile
                                    icon={<Wifi className="h-4 w-4" />}
                                    label="Token"
                                    value={status.gitlab.tokenValid ? 'Gültig' : 'Ungültig'}
                                    sub={status.gitlab.httpStatus != null ? `HTTP ${status.gitlab.httpStatus}` : undefined}
                                    ok={status.gitlab.tokenValid}
                                />
                                <StatusTile
                                    icon={<Database className="h-4 w-4" />}
                                    label="Issues"
                                    value={status.data.issues != null ? String(status.data.issues) : '–'}
                                    ok={status.data.issues != null}
                                />
                                <StatusTile
                                    icon={<Database className="h-4 w-4" />}
                                    label="Epics"
                                    value={status.data.epics != null ? String(status.data.epics) : '–'}
                                    ok={status.data.epics != null}
                                />
                                <StatusTile
                                    icon={<Database className="h-4 w-4" />}
                                    label="Mitglieder"
                                    value={status.data.members != null ? String(status.data.members) : '–'}
                                    ok={status.data.members != null}
                                />
                                <StatusTile
                                    icon={<GitCommit className="h-4 w-4" />}
                                    label="Version"
                                    value={status.app.commit ?? status.app.environment}
                                    sub={`Node ${status.app.nodeVersion}`}
                                    ok
                                />
                            </div>

                            {status.error && (
                                <p className="text-xs text-muted-foreground">Details: {status.error}</p>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function StatusTile({
    icon, label, value, sub, ok,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    ok: boolean;
}) {
    return (
        <div className="rounded-xl bg-background ring-1 ring-foreground/10 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {icon}
                <span>{label}</span>
                <span
                    className={`ml-auto h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-destructive'}`}
                    aria-hidden
                />
            </div>
            <p className="mt-1.5 text-lg font-semibold text-foreground truncate" title={value}>
                {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
    );
}
