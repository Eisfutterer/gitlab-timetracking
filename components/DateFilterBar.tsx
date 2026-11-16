'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function toDateStr(d: Date) {
    return d.toISOString().slice(0, 10);
}

function isoWeek(d: Date): number {
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface WeekOption {
    label: string;
    value: string;
    from: string;
    to: string;
}

function buildWeekOptions(projectStart: Date, today: Date): WeekOption[] {
    const options: WeekOption[] = [];
    const cur = new Date(projectStart);
    const day = cur.getUTCDay() || 7;
    cur.setUTCDate(cur.getUTCDate() - (day - 1));

    while (cur <= today) {
        const year = cur.getUTCFullYear();
        const week = isoWeek(cur);
        const sunday = new Date(cur);
        sunday.setUTCDate(sunday.getUTCDate() + 6);
        options.push({
            label: `KW ${String(week).padStart(2, '0')} / ${year}`,
            value: `${year}-${String(week).padStart(2, '0')}`,
            from: toDateStr(cur),
            to: toDateStr(sunday),
        });
        cur.setUTCDate(cur.getUTCDate() + 7);
    }
    return options.reverse();
}

function buildVlwOptions(projectStart: Date, today: Date): WeekOption[] {
    const options: WeekOption[] = [];
    // find the first Tuesday on or after projectStart
    const cur = new Date(projectStart);
    const dow = cur.getUTCDay(); // 0=Sun,1=Mon,2=Tue,...
    const daysToTue = dow <= 2 ? 2 - dow : 9 - dow; // forward to next Tuesday
    cur.setUTCDate(cur.getUTCDate() + daysToTue);

    let counter = 1;
    while (cur <= today) {
        const monday = new Date(cur);
        monday.setUTCDate(monday.getUTCDate() + 6); // Di + 6 = Mo
        options.push({
            label: `VLW ${String(counter).padStart(2, '0')} · Di ${toDateStr(cur).slice(5).split('-').reverse().join('.')} – Mo ${toDateStr(monday).slice(5).split('-').reverse().join('.')}`,
            value: `vlw-${counter}`,
            from: toDateStr(cur),
            to: toDateStr(monday),
        });
        cur.setUTCDate(cur.getUTCDate() + 7);
        counter++;
    }
    return options.reverse();
}



const PROJECT_START = new Date('2026-09-14');

interface GroupOption {
    name: string;
    fullPath: string;
}

export default function DateFilterBar() {
    const router = useRouter();
    const params = useSearchParams();
    const [pending, startTransition] = useTransition();
    const [groups, setGroups] = useState<GroupOption[]>([]);
    const [mode, setMode] = useState<'kw' | 'vlw' | 'custom'>('kw');

    const currentFrom  = params.get('from')  ?? '';
    const currentTo    = params.get('to')    ?? '';
    const currentGroup = params.get('group') ?? '';

    const today = new Date();
    const yearEnd = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));
    const weekOptions = buildWeekOptions(PROJECT_START, yearEnd);
    const vlwOptions  = buildVlwOptions(PROJECT_START, yearEnd);

    const activeKw  = weekOptions.find(w => w.from === currentFrom && w.to === currentTo)?.value ?? '';
    const activeVlw = vlwOptions.find(w => w.from === currentFrom && w.to === currentTo)?.value ?? '';
    const currentKw = `${today.getUTCFullYear()}-${String(isoWeek(today)).padStart(2, '0')}`;
    const todayStr  = toDateStr(today);
    const currentVlw = vlwOptions.find(w => w.from <= todayStr && w.to >= todayStr)?.value ?? '';
    useEffect(() => {
        fetch('/api/groups')
            .then(r => r.json())
            .then((data: GroupOption[]) => {
                if (Array.isArray(data)) setGroups(data);
            })
            .catch(() => {});
    }, []);

    function navigate(updates: Record<string, string | null>) {
        const sp = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(updates)) {
            if (v === null) sp.delete(k);
            else sp.set(k, v);
        }
        startTransition(() => router.push(`/?${sp.toString()}`));
    }

    function handleKwChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const val = e.target.value;
        if (!val) {
            navigate({ from: null, to: null });
            return;
        }
        const opt = weekOptions.find(w => w.value === val);
        if (opt) navigate({ from: opt.from, to: opt.to });
    }

    function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
        navigate({ group: e.target.value || null });
    }

    function handleFrom(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.value) navigate({ from: e.target.value });
    }

    function handleTo(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.value) navigate({ to: e.target.value });
    }

    function switchMode(next: 'kw' | 'vlw' | 'custom') {
        setMode(next);
        navigate({ from: null, to: null });
    }

    const selectCls = 'h-7 w-full rounded-md bg-input px-2 text-xs text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer';
    const labelCls  = 'text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1';

    return (
        <div className={cn('space-y-3', pending && 'opacity-60 pointer-events-none')}>

            {/* Mode toggle */}
            <div className="flex rounded-md overflow-hidden border border-border text-xs">
                <button
                    onClick={() => switchMode('kw')}
                    className={cn(
                        'flex-1 py-1 transition-colors',
                        mode === 'kw'
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    )}
                >
                    KW
                </button>
                <button
                    onClick={() => switchMode('vlw')}
                    className={cn(
                        'flex-1 py-1 transition-colors border-l border-border',
                        mode === 'vlw'
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    )}
                >
                    VLW
                </button>
                <button
                    onClick={() => switchMode('custom')}
                    className={cn(
                        'flex-1 py-1 transition-colors border-l border-border',
                        mode === 'custom'
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    )}
                >
                    Zeitraum
                </button>
            </div>

            {/* KW dropdown */}
            {mode === 'kw' && (
                <div>
                    <p className={labelCls}>Kalenderwoche</p>
                    <select value={activeKw} onChange={handleKwChange} className={selectCls}>
                        <option value="">Alle KWs</option>
                        {weekOptions.map(w => (
                            <option key={w.value} value={w.value}>
                                {w.label}{w.value === currentKw ? '  ← aktuell' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* VLW dropdown (Di–Mo) */}
            {mode === 'vlw' && (
                <div>
                    <p className={labelCls}>Vorlesungswoche (Di – Mo)</p>
                    <select
                        value={activeVlw}
                        onChange={e => {
                            const opt = vlwOptions.find(w => w.value === e.target.value);
                            if (opt) navigate({ from: opt.from, to: opt.to });
                            else navigate({ from: null, to: null });
                        }}
                        className={selectCls}
                    >
                        <option value="">Alle VLWs</option>
                        {vlwOptions.map(w => (
                            <option key={w.value} value={w.value}>
                                {w.label}{w.value === currentVlw ? '  ← aktuell' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Custom date range */}
            {mode === 'custom' && (
                <div>
                    <p className={labelCls}>Zeitraum</p>
                    <div className="flex flex-col gap-1">
                        <input
                            type="date"
                            value={currentFrom}
                            onChange={handleFrom}
                            className={selectCls}
                        />
                        <input
                            type="date"
                            value={currentTo}
                            onChange={handleTo}
                            className={selectCls}
                        />
                    </div>
                </div>
            )}

            {/* Group selector */}
            {groups.length > 0 && (
                <div>
                    <p className={labelCls}>Gruppe</p>
                    <select value={currentGroup} onChange={handleGroupChange} className={selectCls}>
                        <option value="">Alle Gruppen</option>
                        {groups.map(g => (
                            <option key={g.fullPath} value={g.fullPath}>{g.name}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
