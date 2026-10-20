'use client';

import { MemberGamification } from '@/lib/gamification';
import CollapsibleCard from './CollapsibleCard';

interface Props {
    members: MemberGamification[];
}

const TIER_CLASSES: Record<string, string> = {
    Bronze:   'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Silber:   'bg-zinc-400/10  text-zinc-500  dark:text-zinc-300',
    Gold:     'bg-yellow-400/10 text-yellow-700 dark:text-yellow-400',
    Legende:  'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

const TIER_BAR: Record<string, string> = {
    Bronze:   'bg-amber-500',
    Silber:   'bg-zinc-400',
    Gold:     'bg-yellow-400',
    Legende:  'bg-purple-500',
};

export default function GamificationCard({ members }: Props) {
    return (
        <CollapsibleCard title="Gamification">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m) => (
                    <div key={m.name} className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col gap-3">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {m.totalHours.toFixed(1)} h &middot; {m.activeWeeks} Wochen
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TIER_CLASSES[m.levelInfo.tier]}`}>
                                    {m.levelInfo.tier}
                                </span>
                                <span className="text-xs text-muted-foreground">Lvl {m.levelInfo.level}</span>
                            </div>
                        </div>

                        {/* XP bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{m.xp} XP</span>
                                <span>+{m.levelInfo.xpForNextLevel - Math.round(m.levelInfo.xpPercent / 100 * m.levelInfo.xpForNextLevel)} XP</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${TIER_BAR[m.levelInfo.tier]}`}
                                    style={{ width: `${m.levelInfo.xpPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Badges */}
                        {m.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {m.badges.map(badge => (
                                    <span
                                        key={badge.id}
                                        title={badge.description}
                                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                    >
                                        {badge.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </CollapsibleCard>
    );
}
