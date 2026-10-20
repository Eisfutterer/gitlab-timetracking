'use client';

import { MemberGamification } from '@/lib/gamification';

interface Props {
    members: MemberGamification[];
}

function TierBadge({ tier, color }: { tier: string; color: string }) {
    return (
        <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: color + '22', color }}
        >
            {tier}
        </span>
    );
}

export default function GamificationCard({ members }: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Gamification</h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m, idx) => (
                    <div
                        key={m.name}
                        className="bg-card border border-border rounded-xl p-4 shadow-sm"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-foreground">{m.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {m.totalHours.toFixed(1)} h · {m.activeWeeks} Wochen
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {idx === 0 && <span className="text-lg">👑</span>}
                                <TierBadge tier={m.levelInfo.tier} color={m.levelInfo.tierColor} />
                                <span className="text-xs font-medium text-muted-foreground">
                                    Lvl {m.levelInfo.level}
                                </span>
                            </div>
                        </div>

                        {/* XP bar */}
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{m.xp} XP</span>
                                <span>+{m.levelInfo.xpForNextLevel - Math.round(m.levelInfo.xpPercent / 100 * m.levelInfo.xpForNextLevel)} für nächstes Level</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${m.levelInfo.xpPercent}%`, backgroundColor: m.levelInfo.tierColor }}
                                />
                            </div>
                        </div>

                        {/* Badges */}
                        {m.badges.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {m.badges.map(badge => (
                                    <span
                                        key={badge.id}
                                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                        title={badge.description}
                                    >
                                        {badge.icon} {badge.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
