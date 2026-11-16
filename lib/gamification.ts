import { format, startOfWeek } from 'date-fns';
import { Timelog } from '@/types/dashboard';

export type TierLabel = 'Bronze' | 'Silber' | 'Gold' | 'Legende';

export interface LevelInfo {
    level: number;
    tier: TierLabel;
    tierColor: string;
    xp: number;
    xpForNextLevel: number;
    xpPercent: number;
}

export interface GamificationBadge {
    id: string;
    label: string;
    description: string;
    icon: string;
}

export interface MemberGamification {
    name: string;
    xp: number;
    levelInfo: LevelInfo;
    badges: GamificationBadge[];
    totalHours: number;
    activeWeeks: number;
    peakWeekHours: number;
}

const BADGES: Array<{
    id: string;
    label: string;
    description: string;
    icon: string;
    test: (hours: number, activeWeeks: number, peakWeekHours: number) => boolean;
}> = [
    { id: 'early_bird',    label: 'Früher Vogel',  description: 'Erste 10 Stunden geloggt',       icon: '🐦', test: (h) => h >= 10 },
    { id: 'grinder',       label: 'Grinder',        description: '50+ Stunden geloggt',            icon: '⚙️', test: (h) => h >= 50 },
    { id: 'apex',          label: 'Apex Contributor', description: '150+ Stunden geloggt',         icon: '🏆', test: (h) => h >= 150 },
    { id: 'consistent',    label: 'Beständig',      description: '4+ aktive Wochen',               icon: '📅', test: (_, w) => w >= 4 },
    { id: 'marathon',      label: 'Marathon',       description: '8+ aktive Wochen',               icon: '🏃', test: (_, w) => w >= 8 },
    { id: 'sprinter',      label: 'Sprinter',       description: '10+ Stunden in einer Woche',     icon: '⚡', test: (_, _w, p) => p >= 10 },
    { id: 'unstoppable',   label: 'Unaufhaltbar',   description: '20+ Stunden in einer Woche',     icon: '🚀', test: (_, _w, p) => p >= 20 },
];

function computeLevelInfo(xp: number): LevelInfo {
    let level = 1;
    let remaining = xp;

    const tiers: Array<{ max: number; xpPerLevel: number; tier: TierLabel; color: string }> = [
        { max: 9,  xpPerLevel: 200, tier: 'Bronze',  color: '#CD7F32' },
        { max: 19, xpPerLevel: 300, tier: 'Silber',  color: '#C0C0C0' },
        { max: 29, xpPerLevel: 400, tier: 'Gold',    color: '#FFD700' },
        { max: Infinity, xpPerLevel: 500, tier: 'Legende', color: '#A855F7' },
    ];

    for (const tier of tiers) {
        const levelsInTier = tier.max === Infinity ? Infinity : tier.max - level + 1;
        const xpForTier = levelsInTier === Infinity ? Infinity : levelsInTier * tier.xpPerLevel;

        if (remaining < xpForTier || tier.max === Infinity) {
            const levelsGained = tier.max === Infinity
                ? Math.floor(remaining / tier.xpPerLevel)
                : Math.min(Math.floor(remaining / tier.xpPerLevel), levelsInTier);
            level += levelsGained;
            const leftover = remaining - levelsGained * tier.xpPerLevel;

            return {
                level,
                tier: tier.tier,
                tierColor: tier.color,
                xp,
                xpForNextLevel: tier.xpPerLevel,
                xpPercent: Math.min(100, Math.round((leftover / tier.xpPerLevel) * 100)),
            };
        }

        remaining -= xpForTier;
        level = tier.max + 1;
    }

    return { level, tier: 'Legende', tierColor: '#A855F7', xp, xpForNextLevel: 500, xpPercent: 0 };
}

export function calculateGamification(timelogs: Timelog[]): MemberGamification[] {
    const memberMap: Record<string, { seconds: number; weeklyHours: Record<string, number> }> = {};

    timelogs.forEach(log => {
        const name = log.user.name;
        if (!memberMap[name]) memberMap[name] = { seconds: 0, weeklyHours: {} };
        memberMap[name].seconds += log.timeSpent;

        const date = new Date(log.spentAt);
        // key by ISO week Monday using date-fns local time (consistent with processData.ts)
        const monday = startOfWeek(date, { weekStartsOn: 1 });
        const weekKey = format(monday, 'yyyy-MM-dd');
        if (!memberMap[name].weeklyHours[weekKey]) memberMap[name].weeklyHours[weekKey] = 0;
        memberMap[name].weeklyHours[weekKey] += log.timeSpent / 3600;
    });

    return Object.entries(memberMap).map(([name, data]) => {
        const totalHours = data.seconds / 3600;
        const weekValues = Object.values(data.weeklyHours);
        const activeWeeks = weekValues.filter(h => h > 0).length;
        const peakWeekHours = weekValues.length > 0 ? Math.max(...weekValues) : 0;

        // XP: 20 per hour + 25 per active week
        const xp = Math.floor(totalHours * 20 + activeWeeks * 25);

        const badges = BADGES
            .filter(b => b.test(totalHours, activeWeeks, peakWeekHours))
            .map(({ id, label, description, icon }) => ({ id, label, description, icon }));

        return {
            name,
            xp,
            levelInfo: computeLevelInfo(xp),
            badges,
            totalHours,
            activeWeeks,
            peakWeekHours,
        };
    }).sort((a, b) => b.xp - a.xp);
}
