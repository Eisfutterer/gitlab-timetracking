import { describe, it, expect } from 'vitest';
import { calculateGamification, computeLevelInfo, BADGES } from '@/lib/gamification';
import { makeTimelog } from '@/test/fixtures';

describe('computeLevelInfo', () => {
    it('xp=0 → level 1, Bronze, 0%', () => {
        const info = computeLevelInfo(0);
        expect(info.level).toBe(1);
        expect(info.tier).toBe('Bronze');
        expect(info.tierColor).toBe('#CD7F32');
        expect(info.xp).toBe(0);
        expect(info.xpForNextLevel).toBe(200);
        expect(info.xpPercent).toBe(0);
    });

    it('Bronze: 200 xp → level 2, leftover 0', () => {
        const info = computeLevelInfo(200);
        expect(info.level).toBe(2);
        expect(info.tier).toBe('Bronze');
        expect(info.xpPercent).toBe(0);
    });

    it('Bronze: partial level progress rounds percent and caps at 100', () => {
        const info = computeLevelInfo(199); // leftover 199/200 = 99.5 → round 100
        expect(info.level).toBe(1);
        expect(info.tier).toBe('Bronze');
        expect(info.xpPercent).toBe(100);
    });

    it('Bronze: mid-level percent', () => {
        const info = computeLevelInfo(250); // level 2, leftover 50 → 25%
        expect(info.level).toBe(2);
        expect(info.xpPercent).toBe(25);
    });

    it('Bronze upper boundary: 1799 xp stays Bronze at level 9', () => {
        const info = computeLevelInfo(1799); // floor(1799/200)=8 → level 9
        expect(info.level).toBe(9);
        expect(info.tier).toBe('Bronze');
    });

    it('Silber boundary: 1800 xp → level 10, Silber', () => {
        const info = computeLevelInfo(1800);
        expect(info.level).toBe(10);
        expect(info.tier).toBe('Silber');
        expect(info.tierColor).toBe('#C0C0C0');
        expect(info.xpForNextLevel).toBe(300);
        expect(info.xpPercent).toBe(0);
    });

    it('Silber mid: level and leftover computed with 300 per level', () => {
        const info = computeLevelInfo(1800 + 300 + 150); // level 11, leftover 150 → 50%
        expect(info.level).toBe(11);
        expect(info.tier).toBe('Silber');
        expect(info.xpPercent).toBe(50);
    });

    it('Silber upper boundary: just below Gold stays level 19', () => {
        const info = computeLevelInfo(1800 + 3000 - 1); // 4799
        expect(info.level).toBe(19);
        expect(info.tier).toBe('Silber');
    });

    it('Gold boundary: 4800 xp → level 20, Gold', () => {
        const info = computeLevelInfo(4800);
        expect(info.level).toBe(20);
        expect(info.tier).toBe('Gold');
        expect(info.tierColor).toBe('#FFD700');
        expect(info.xpForNextLevel).toBe(400);
    });

    it('Gold upper boundary: just below Legende stays level 29', () => {
        const info = computeLevelInfo(4800 + 4000 - 1); // 8799
        expect(info.level).toBe(29);
        expect(info.tier).toBe('Gold');
    });

    it('Legende boundary: 8800 xp → level 30, Legende, 0%', () => {
        const info = computeLevelInfo(8800);
        expect(info.level).toBe(30);
        expect(info.tier).toBe('Legende');
        expect(info.tierColor).toBe('#A855F7');
        expect(info.xpForNextLevel).toBe(500);
        expect(info.xpPercent).toBe(0);
    });

    it('Legende grows by 500 xp per level with leftover percent', () => {
        const info = computeLevelInfo(8800 + 500 * 3 + 250); // level 33, leftover 250 → 50%
        expect(info.level).toBe(33);
        expect(info.tier).toBe('Legende');
        expect(info.xpPercent).toBe(50);
    });
});

describe('calculateGamification', () => {
    it('empty input → []', () => {
        expect(calculateGamification([])).toEqual([]);
    });

    it('XP = floor(totalHours*20 + activeWeeks*25)', () => {
        // 1 log of 3600s = 1 hour in a single week → 1 active week
        const result = calculateGamification([makeTimelog({ timeSpent: 3600 })]);
        expect(result).toHaveLength(1);
        expect(result[0].totalHours).toBe(1);
        expect(result[0].activeWeeks).toBe(1);
        // floor(1*20 + 1*25) = 45
        expect(result[0].xp).toBe(45);
        expect(result[0].peakWeekHours).toBe(1);
    });

    it('buckets weeks by Monday (two separate weeks → 2 active weeks)', () => {
        const result = calculateGamification([
            makeTimelog({ spentAt: '2026-11-03T08:00:00Z', timeSpent: 3600 }), // Tue KW45
            makeTimelog({ spentAt: '2026-11-10T08:00:00Z', timeSpent: 3600 }), // Tue KW46
        ]);
        expect(result[0].activeWeeks).toBe(2);
        expect(result[0].peakWeekHours).toBe(1);
        expect(result[0].totalHours).toBe(2);
        // floor(2*20 + 2*25) = 90
        expect(result[0].xp).toBe(90);
    });

    it('two logs in the same week accumulate into one week', () => {
        const result = calculateGamification([
            makeTimelog({ spentAt: '2026-11-03T08:00:00Z', timeSpent: 3600 }),
            makeTimelog({ spentAt: '2026-11-04T08:00:00Z', timeSpent: 3600 }),
        ]);
        expect(result[0].activeWeeks).toBe(1);
        expect(result[0].peakWeekHours).toBe(2);
    });

    it('sorts members by xp descending', () => {
        const result = calculateGamification([
            makeTimelog({ user: { name: 'Low' }, timeSpent: 3600 }),
            makeTimelog({ user: { name: 'High' }, timeSpent: 3600 * 100 }),
        ]);
        expect(result.map(r => r.name)).toEqual(['High', 'Low']);
    });

    it('awards early_bird badge at exactly 10 hours', () => {
        const result = calculateGamification([makeTimelog({ timeSpent: 3600 * 10 })]);
        const ids = result[0].badges.map(b => b.id);
        expect(ids).toContain('early_bird');
        expect(ids).not.toContain('grinder');
    });

    it('awards grinder at 50h and sprinter/unstoppable by peak week', () => {
        // single week, 50 hours → early_bird, grinder, sprinter (>=10), unstoppable (>=20)
        const result = calculateGamification([makeTimelog({ timeSpent: 3600 * 50 })]);
        const ids = result[0].badges.map(b => b.id);
        expect(ids).toEqual(
            expect.arrayContaining(['early_bird', 'grinder', 'sprinter', 'unstoppable']),
        );
        expect(ids).not.toContain('apex');
    });

    it('awards apex at 150+ hours', () => {
        const result = calculateGamification([makeTimelog({ timeSpent: 3600 * 150 })]);
        expect(result[0].badges.map(b => b.id)).toContain('apex');
    });

    it('awards consistent (4 weeks) and marathon (8 weeks) by active-week count', () => {
        const mondays = [
            '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26',
            '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23',
        ];
        const logs = mondays.map(d => makeTimelog({ spentAt: `${d}T08:00:00Z`, timeSpent: 60 }));
        const result = calculateGamification(logs);
        expect(result[0].activeWeeks).toBe(8);
        const ids = result[0].badges.map(b => b.id);
        expect(ids).toContain('consistent');
        expect(ids).toContain('marathon');
    });

    it('no badges for tiny contribution', () => {
        const result = calculateGamification([makeTimelog({ timeSpent: 60 })]);
        expect(result[0].badges).toEqual([]);
    });

    it('BADGES export is the full predicate list', () => {
        expect(BADGES).toHaveLength(7);
        expect(BADGES.map(b => b.id)).toEqual([
            'early_bird', 'grinder', 'apex', 'consistent', 'marathon', 'sprinter', 'unstoppable',
        ]);
    });
});
