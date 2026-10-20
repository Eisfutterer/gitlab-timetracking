'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, BarChart2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAutoRefresh } from '@/lib/hooks';

const SECTIONS = [
    { id: 'epics', label: 'Epics & Issues' },
    { id: 'overview', label: 'Übersicht' },
    { id: 'activity', label: 'Aktivität' },
    { id: 'timeseries', label: 'Zeitverlauf' },
    { id: 'team', label: 'Team & Kategorien' },
    { id: 'productivity', label: 'Produktivität' },
    { id: 'collaboration', label: 'Kollaboration' },
    { id: 'issues', label: 'Issues' },
    { id: 'mergerequests', label: 'Merge Requests' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'gamification', label: 'Gamification' },
    { id: 'groups', label: 'Gruppen-Vergleich' },
];

interface NavbarProps {
    activeSection: string;
    onSectionChange: (id: string) => void;
    extraControls?: React.ReactNode;
}

export default function Navbar({ activeSection, onSectionChange, extraControls }: NavbarProps) {
    const { resolvedTheme, setTheme } = useTheme();
    const [autoRefresh, setAutoRefresh] = useState(false);
    const { secondsLeft, manualRefresh } = useAutoRefresh(autoRefresh);

    const mins = Math.floor(secondsLeft / 60);
    const secs = String(secondsLeft % 60).padStart(2, '0');

    return (
        <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-screen-2xl px-4">
                <div className="flex h-14 items-center gap-6">
                    {/* Logo */}
                    <div className="flex shrink-0 items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-foreground" />
                        <span className="text-sm font-semibold tracking-tight text-foreground">
                            Time Tracking
                        </span>
                    </div>

                    {/* Nav tabs */}
                    <div className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => onSectionChange(s.id)}
                                className={cn(
                                    'shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                                    activeSection === s.id
                                        ? 'bg-accent text-accent-foreground font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {extraControls}

                    {/* Auto-refresh indicator + toggle */}
                    <div className="flex shrink-0 items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={manualRefresh}
                            aria-label="Manuell aktualisieren"
                            title="Jetzt aktualisieren"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <button
                            onClick={() => setAutoRefresh(v => !v)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                                autoRefresh
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            )}
                            title={autoRefresh ? 'Auto-Refresh deaktivieren' : 'Auto-Refresh aktivieren'}
                        >
                            <span
                                className={cn(
                                    'h-1.5 w-1.5 rounded-full',
                                    autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                                )}
                            />
                            {autoRefresh ? `${mins}:${secs}` : 'Auto'}
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                        aria-label="Toggle dark mode"
                    >
                        {resolvedTheme === 'dark'
                            ? <Sun className="h-4 w-4" />
                            : <Moon className="h-4 w-4" />
                        }
                    </Button>
                </div>
            </div>
        </nav>
    );
}
