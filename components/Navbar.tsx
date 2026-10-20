'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
];

interface NavbarProps {
    activeSection: string;
    onSectionChange: (id: string) => void;
}

export default function Navbar({ activeSection, onSectionChange }: NavbarProps) {
    const { theme, setTheme } = useTheme();

    return (
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-950/95">
            <div className="mx-auto max-w-screen-2xl px-4">
                <div className="flex h-14 items-center gap-4">
                    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <BarChart2 className="h-5 w-5 text-orange-500" />
                        Time Tracking
                    </div>

                    <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => onSectionChange(s.id)}
                                className={cn(
                                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                    activeSection === s.id
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        aria-label="Toggle dark mode"
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </nav>
    );
}
