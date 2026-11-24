import { describe, it, expect } from 'vitest';
import {
    processLeaderboard,
    parseSpendNotes,
    resolveCategory,
    resolveSingleLabel,
    parseDuration,
    processChartData,
    processCFD,
    processLabelsTimeline,
    processUserCategoryMatrix,
    topCategory,
    processPersonDetails,
} from '@/lib/processData';
import { makeIssue, makeTimelog, labels } from '@/test/fixtures';
import type { Timelog } from '@/types/dashboard';
import type { ProjectMetrics } from '@/types/dashboard';

// ---------------------------------------------------------------------------
// processLeaderboard
// ---------------------------------------------------------------------------
describe('processLeaderboard', () => {
    it('empty input → []', () => {
        expect(processLeaderboard([])).toEqual([]);
    });

    it('pads knownMembers with zero entries', () => {
        const result = processLeaderboard([], ['Alice', 'Bob']);
        expect(result).toHaveLength(2);
        result.forEach(e => {
            expect(e.hours).toBe(0);
            expect(e.issueCount).toBe(0);
            expect(e.percentage).toBe(0);
        });
    });

    it('division-by-zero guard: all-zero hours → 0% each (no NaN)', () => {
        const result = processLeaderboard([], ['Alice']);
        expect(result[0].percentage).toBe(0);
        expect(Number.isNaN(result[0].percentage)).toBe(false);
    });

    it('aggregates seconds to hours, counts distinct issues, ignores null iid', () => {
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels(), timeEstimate: 0, totalTimeSpent: 0 } }),
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels(), timeEstimate: 0, totalTimeSpent: 0 } }),
            // iid empty string → falsy → not counted
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 1800, issue: { title: 't', iid: '', webUrl: '', labels: labels(), timeEstimate: 0, totalTimeSpent: 0 } }),
            // issue null → not counted
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 1800, issue: null }),
        ];
        const result = processLeaderboard(logs);
        expect(result).toHaveLength(1);
        expect(result[0].hours).toBeCloseTo((3600 + 3600 + 1800 + 1800) / 3600);
        expect(result[0].issueCount).toBe(1); // only iid '1'
    });

    it('sorts by hours desc and assigns rank + percentage', () => {
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600 }),   // 1h
            makeTimelog({ user: { name: 'Bob' }, timeSpent: 3 * 3600 }), // 3h
        ];
        const result = processLeaderboard(logs);
        expect(result.map(e => e.name)).toEqual(['Bob', 'Alice']);
        expect(result[0].rank).toBe(1);
        expect(result[1].rank).toBe(2);
        expect(result[0].percentage).toBeCloseTo(75);
        expect(result[1].percentage).toBeCloseTo(25);
    });
});

// ---------------------------------------------------------------------------
// parseDuration (exported helper)
// ---------------------------------------------------------------------------
describe('parseDuration', () => {
    it('converts units to seconds', () => {
        expect(parseDuration(2, 'h')).toBe(2 * 3600);
        expect(parseDuration(30, 'm')).toBe(30 * 60);
        expect(parseDuration(1, 'd')).toBe(8 * 3600);
        expect(parseDuration(1, 'w')).toBe(5 * 8 * 3600);
    });
    it('is case-insensitive', () => {
        expect(parseDuration(1, 'H')).toBe(3600);
    });
    it('unknown unit → 0', () => {
        expect(parseDuration(5, 'x')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// parseSpendNotes
// ---------------------------------------------------------------------------
describe('parseSpendNotes', () => {
    const issue = {
        title: 'T', iid: '5', webUrl: 'http://x', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0,
    };
    const note = (body: string) => ({ body, createdAt: '2026-11-03T08:00:00Z', author: { username: 'alice', name: 'Alice' } });

    it('parses /spend with h/m/d/w units', () => {
        const logs = parseSpendNotes([note('/spend 2h'), note('/spend 30m'), note('/spend 1d'), note('/spend 1w')], issue);
        expect(logs.map(l => l.timeSpent)).toEqual([2 * 3600, 30 * 60, 8 * 3600, 5 * 8 * 3600]);
        expect(logs[0].user.name).toBe('Alice');
        expect(logs[0].issue?.iid).toBe('5');
    });

    it('handles multiple matches within one note (global regex)', () => {
        const logs = parseSpendNotes([note('/spend 1h and later /spend 2h')], issue);
        expect(logs).toHaveLength(2);
        expect(logs.map(l => l.timeSpent)).toEqual([3600, 7200]);
    });

    it('resets lastIndex between notes (second note still matches)', () => {
        const logs = parseSpendNotes([note('/spend 1h'), note('/spend 2h')], issue);
        expect(logs).toHaveLength(2);
    });

    it('supports decimal values', () => {
        const logs = parseSpendNotes([note('/spend 1.5h')], issue);
        expect(logs[0].timeSpent).toBe(1.5 * 3600);
    });

    it('issue=null → timelog issue is null, webUrl fallback for defined issue', () => {
        const nullLogs = parseSpendNotes([note('/spend 1h')], null);
        expect(nullLogs[0].issue).toBeNull();

        const noUrl = { title: 'T', iid: '9', labels: labels(), timeEstimate: 0, totalTimeSpent: 0 };
        const logs = parseSpendNotes([note('/spend 1h')], noUrl as never);
        expect(logs[0].issue?.webUrl).toBe('');
    });

    it('notes without /spend produce nothing', () => {
        expect(parseSpendNotes([note('just a comment')], issue)).toEqual([]);
    });

    it('duration ≤ 0 is skipped (0 value)', () => {
        const logs = parseSpendNotes([note('/spend 0h')], issue);
        expect(logs).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// resolveCategory / resolveSingleLabel
// ---------------------------------------------------------------------------
describe('resolveCategory', () => {
    it('empty array → Sonstige', () => {
        expect(resolveCategory([])).toBe('Sonstige');
    });
    it('exact canonical match (case-insensitive)', () => {
        expect(resolveCategory(['implementierung'])).toBe('Implementierung');
    });
    it('alias map match', () => {
        expect(resolveCategory(['architecture'])).toBe('Architektur & Design');
    });
    it('namespaced label: strips "namespace::" prefix for alias', () => {
        expect(resolveCategory(['category::project-management'])).toBe('Projektmanagement');
    });
    it('regex fallback', () => {
        expect(resolveCategory(['frontend'])).toBe('Implementierung');
    });
    it('unknown → Sonstige', () => {
        expect(resolveCategory(['totally-unknown-xyz'])).toBe('Sonstige');
    });
    it('namespaced exact canonical match', () => {
        expect(resolveCategory(['x::Implementierung'])).toBe('Implementierung');
    });
});

describe('resolveSingleLabel', () => {
    it('known label → canonical', () => {
        expect(resolveSingleLabel('frontend')).toBe('Implementierung');
    });
    it('unknown label → null (Sonstige mapped to null)', () => {
        expect(resolveSingleLabel('totally-unknown-xyz')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// processCFD
// ---------------------------------------------------------------------------
describe('processCFD', () => {
    it('empty issues, no selection → []', () => {
        expect(processCFD([])).toEqual([]);
    });

    it('accumulates cumulative opened/closed per week', () => {
        const issues = [
            makeIssue({ createdAt: '2026-11-03T08:00:00Z', state: 'opened' }),
            makeIssue({ createdAt: '2026-11-04T08:00:00Z', state: 'closed' }),
        ];
        const cfd = processCFD(issues);
        expect(cfd).toHaveLength(1);
        expect(cfd[0].opened).toBe(2);
        expect(cfd[0].closed).toBe(1);
        expect(cfd[0].total).toBe(2);
        expect(cfd[0].date).toMatch(/^KW \d+ \(\d{2}\.\d{2}\.\d{4}\)$/);
    });

    it('cumulative across multiple weeks', () => {
        const issues = [
            makeIssue({ createdAt: '2026-11-03T08:00:00Z', state: 'closed' }),
            makeIssue({ createdAt: '2026-11-10T08:00:00Z', state: 'opened' }),
        ];
        const cfd = processCFD(issues);
        expect(cfd).toHaveLength(2);
        expect(cfd[1].opened).toBe(2); // cumulative
        expect(cfd[1].closed).toBe(1);
    });

    it('selectedFrom creates prev/selected/next empty week slots', () => {
        const cfd = processCFD([], 1, new Date('2026-11-10T00:00:00Z'));
        expect(cfd).toHaveLength(3);
        cfd.forEach(p => { expect(p.opened).toBe(0); expect(p.closed).toBe(0); });
    });

    it('groups by Tuesday-start weeks and uses VLW labels when weekStartsOn=2', () => {
        const issues = [
            // Tue 2026-11-24 and the following Mon 2026-11-30 belong to the SAME VLW week
            makeIssue({ iid: '1', state: 'opened', createdAt: '2026-11-24T09:00:00Z' }),
            makeIssue({ iid: '2', state: 'closed', createdAt: '2026-11-30T09:00:00Z' }),
            // Tue 2026-12-01 starts the NEXT VLW week
            makeIssue({ iid: '3', state: 'opened', createdAt: '2026-12-01T09:00:00Z' }),
        ];
        const cfd = processCFD(issues, 2);
        expect(cfd).toHaveLength(2); // two Di–Mo buckets, not three Monday buckets
        expect(cfd[0].date).toMatch(/^VLW /);
        expect(cfd[0].opened).toBe(2); // the Tue + the Mon fall in one bucket
    });
});

// ---------------------------------------------------------------------------
// processLabelsTimeline
// ---------------------------------------------------------------------------
describe('processLabelsTimeline', () => {
    it('empty logs → empty points, all 4 category keys', () => {
        const { points, keys } = processLabelsTimeline([]);
        expect(points).toEqual([]);
        expect(keys).toEqual(['Projektmanagement', 'Requirements Engineering', 'Implementierung', 'Architektur & Design']);
    });

    it('buckets hours per week per category (weekStartsOn=1 → "KW nn")', () => {
        const log = makeTimelog({ spentAt: '2026-11-03T08:00:00Z', timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } });
        const { points } = processLabelsTimeline([log], 1);
        expect(points).toHaveLength(1);
        expect(points[0].week).toMatch(/^KW \d+ /);
        expect(points[0]['Implementierung']).toBe(1);
    });

    it('weekStartsOn=2 → "VLW" label prefix', () => {
        const log = makeTimelog({ spentAt: '2026-11-03T08:00:00Z' });
        const { points } = processLabelsTimeline([log], 2);
        expect(points[0].week).toMatch(/^VLW \(/);
    });

    it('weekStartsOn=0 vs 1 can produce different KW labels', () => {
        const log = makeTimelog({ spentAt: '2026-11-01T08:00:00Z' }); // Sunday
        const p0 = processLabelsTimeline([log], 0).points[0].week;
        const p1 = processLabelsTimeline([log], 1).points[0].week;
        expect(p0).not.toBe(p1);
    });

    it('selectedFrom pads prev/selected/next slots (weekStartsOn 1)', () => {
        const { points } = processLabelsTimeline([], 1, new Date('2026-11-10T00:00:00Z'));
        expect(points).toHaveLength(3);
    });

    it('selectedFrom padding also uses VLW label for weekStartsOn=2', () => {
        const { points } = processLabelsTimeline([], 2, new Date('2026-11-10T00:00:00Z'));
        expect(points).toHaveLength(3);
        points.forEach(p => expect(p.week).toMatch(/^VLW \(/));
    });

    it('log with null issue → category Sonstige (not in keys, stays 0 across keys)', () => {
        const log = makeTimelog({ issue: null });
        const { points } = processLabelsTimeline([log], 1);
        expect(points).toHaveLength(1);
        // all canonical keys default to 0
        expect(points[0]['Implementierung']).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// processUserCategoryMatrix
// ---------------------------------------------------------------------------
describe('processUserCategoryMatrix', () => {
    it('empty + no members → no rows, 4 keys', () => {
        const { rows, keys } = processUserCategoryMatrix([]);
        expect(rows).toEqual([]);
        expect(keys).toHaveLength(4);
    });

    it('pads known members with zero rows and 0% (grandTotal=0 guard)', () => {
        const { rows } = processUserCategoryMatrix([], ['Alice', 'Bob']);
        expect(rows).toHaveLength(2);
        rows.forEach(r => {
            expect(r.total).toBe(0);
            expect(r.percentage).toBe(0);
        });
    });

    it('aggregates hours per category and computes percentage, sorted by total desc', () => {
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
            makeTimelog({ user: { name: 'Bob' }, timeSpent: 3 * 3600, issue: { title: 't', iid: '2', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const { rows } = processUserCategoryMatrix(logs);
        expect(rows.map(r => r.name)).toEqual(['Bob', 'Alice']);
        expect(rows[0].total).toBe(3);
        expect(rows[0].percentage).toBe(75);
        expect(rows[1].percentage).toBe(25);
        expect(rows[0]['Implementierung']).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// topCategory
// ---------------------------------------------------------------------------
describe('topCategory', () => {
    it('empty → Sonstige', () => {
        expect(topCategory({})).toBe('Sonstige');
    });
    it('returns category with most hours', () => {
        expect(topCategory({ A: 1, B: 5, C: 2 })).toBe('B');
    });
    it('all zero → Sonstige (nothing beats 0)', () => {
        expect(topCategory({ A: 0, B: 0 })).toBe('Sonstige');
    });
});

// ---------------------------------------------------------------------------
// processPersonDetails
// ---------------------------------------------------------------------------
describe('processPersonDetails', () => {
    const sprint = (o: Partial<ProjectMetrics['sprintData'][number]>): ProjectMetrics['sprintData'][number] => ({
        sprintStart: 'KW 45 (02.11.2026)',
        sprintEnd: '09.11.2026',
        totalHours: 0,
        categoryHours: {},
        userHours: {},
        sprintNumber: 1,
        ...o,
    });

    it('empty logs → []', () => {
        expect(processPersonDetails([], [])).toEqual([]);
    });

    it('builds categoryHours and hoursBySprintNumber from sprintData.userHours', () => {
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, spentAt: '2026-11-03T08:00:00Z', issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const sprintData = [sprint({ sprintStart: 'KW 45 (02.11.2026)', userHours: { Alice: 5 }, sprintNumber: 1 })];
        const details = processPersonDetails(logs, sprintData);
        expect(details).toHaveLength(1);
        expect(details[0].name).toBe('Alice');
        expect(details[0].categoryHours['Implementierung']).toBe(1);
        expect(details[0].hoursBySprintNumber).toEqual([5]);
    });

    it('focusThisCycle uses parseSprintDate matching the current (last) sprint week', () => {
        // sprint "KW 45 (02.11.2026)" → Monday 02.11.2026; log on 2026-11-03 is within that week
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, spentAt: '2026-11-03T08:00:00Z', issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const sprintData = [sprint({ sprintStart: 'KW 45 (02.11.2026)', userHours: { Alice: 1 } })];
        const details = processPersonDetails(logs, sprintData);
        expect(details[0].focusThisCycle).toBe('Implementierung');
    });

    it('focusThisCycle/LastCycle fall back to overall topCategory when no matching sprint logs', () => {
        // sprint week is far from the log week → no this/last-cycle logs → fallback
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, spentAt: '2026-11-03T08:00:00Z', issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const sprintData = [
            sprint({ sprintStart: 'KW 01 (05.01.2026)', userHours: { Alice: 0 }, sprintNumber: 1 }),
            sprint({ sprintStart: 'KW 02 (12.01.2026)', userHours: { Alice: 0 }, sprintNumber: 2 }),
        ];
        const details = processPersonDetails(logs, sprintData);
        expect(details[0].focusThisCycle).toBe('Implementierung');
        expect(details[0].focusLastCycle).toBe('Implementierung');
    });

    it('parseSprintDate handles a plain date string without parens', () => {
        // sprintStart without parens → falls back to splitting the raw string
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, spentAt: '2026-11-03T08:00:00Z', issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const sprintData = [sprint({ sprintStart: '02.11.2026', userHours: { Alice: 1 } })];
        const details = processPersonDetails(logs, sprintData);
        expect(details[0].focusThisCycle).toBe('Implementierung');
    });

    it('uses prev sprint (prevIdx) for focusLastCycle when ≥2 sprints', () => {
        const logs: Timelog[] = [
            // week of 02.11.2026 (prev sprint) → Architektur
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, spentAt: '2026-11-03T08:00:00Z', issue: { title: 't', iid: '1', webUrl: '', labels: labels('design'), timeEstimate: 0, totalTimeSpent: 0 } }),
            // week of 09.11.2026 (last sprint) → Implementierung
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, spentAt: '2026-11-10T08:00:00Z', issue: { title: 't', iid: '2', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const sprintData = [
            sprint({ sprintStart: 'KW 45 (02.11.2026)', userHours: { Alice: 1 }, sprintNumber: 1 }),
            sprint({ sprintStart: 'KW 46 (09.11.2026)', userHours: { Alice: 1 }, sprintNumber: 2 }),
        ];
        const details = processPersonDetails(logs, sprintData);
        expect(details[0].focusThisCycle).toBe('Implementierung');
        expect(details[0].focusLastCycle).toBe('Architektur & Design');
    });
});

// ---------------------------------------------------------------------------
// processChartData (public API; covers remaining branches)
// ---------------------------------------------------------------------------
describe('processChartData', () => {
    it('empty input produces empty-friendly structure with heatmap fallback', () => {
        const data = processChartData([], []);
        // heatmap uses now-based 6-month fallback → non-empty grid
        expect(data.heatmapData.length).toBeGreaterThan(0);
        expect(data.heatmapData[0]).toHaveLength(7);
        expect(data.pieData).toHaveLength(4); // 4 categories seeded at 0
        expect(data.lineData).toEqual([]);
        expect(data.barData).toEqual([]);
        expect(data.projectMetrics.totalSprints).toBe(0);
        expect(data.projectMetrics.averageVelocity).toBe(0); // 0-sprint guard
        // categoryDistribution hours all 0 (0-sprint guard)
        data.projectMetrics.categoryDistribution.forEach(c => expect(c.hours).toBe(0));
    });

    it('buckets a late-Monday UTC log on Monday in the heatmap (UTC, no Tuesday leak)', () => {
        // regression: a Monday 23:30 UTC log must land on the Monday cell, not leak to
        // Tuesday in a UTC+x server timezone (VLW weeks end Monday).
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, spentAt: '2026-11-09T23:30:00Z' }),
        ];
        const data = processChartData([], logs, undefined, undefined, 2);
        // find the cell that carries the activity
        const active = data.heatmapData.flat().filter(c => c.value > 0);
        expect(active).toHaveLength(1);
        expect(active[0].date).toBe('2026-11-09'); // Monday (UTC), not 2026-11-10
    });

    it('aggregates pie/bar/line for a single user with implementation label', () => {
        const issues = [makeIssue({ labels: labels('Implementierung') })];
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const data = processChartData(issues, logs);
        const impl = data.pieData.find(p => p.name === 'Implementierung');
        expect(impl?.value).toBe(1);
        expect(data.barData.find(b => b.name === 'Alice')?.value).toBe(1);
        expect(data.lineData).toHaveLength(1);
        expect(data.lineData[0].Alice).toBe(1);
        expect(data.projectMetrics.totalSprints).toBe(1);
        expect(data.projectMetrics.averageVelocity).toBeCloseTo(1);
    });

    it('pads absent known members with 0 in bar and line data', () => {
        const logs: Timelog[] = [makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } })];
        const data = processChartData([], logs, undefined, undefined, 1, ['Alice', 'Ghost']);
        expect(data.barData.find(b => b.name === 'Ghost')?.value).toBe(0);
        expect(data.lineData[0].Ghost).toBe(0);
        // sprint userHours padded with absent members
        expect(data.projectMetrics.sprintData[0].userHours.Ghost).toBe(0);
    });

    it('weekStartsOn=2 produces VLW line labels', () => {
        const logs: Timelog[] = [makeTimelog({ spentAt: '2026-11-03T08:00:00Z', issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } })];
        const data = processChartData([], logs, undefined, undefined, 2);
        expect(String(data.lineData[0].week)).toMatch(/^VLW \(/);
        expect(data.projectMetrics.sprintData[0].sprintStart).toMatch(/^VLW \(/);
    });

    it('selectedFrom + contextTimelogs create ±1 KW context slots (3 line points, 3 sprints)', () => {
        const ctx: Timelog[] = [
            makeTimelog({ spentAt: '2026-11-10T08:00:00Z', timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const data = processChartData([], ctx, ctx, new Date('2026-11-10T00:00:00Z'), 1);
        expect(data.lineData.length).toBe(3);
        // sprint loop starts at the series week; selected + next empty slot are kept
        expect(data.projectMetrics.sprintData.length).toBe(2);
        // the data week carries hours, the context slot is an empty (0h) slot
        expect(data.projectMetrics.sprintData.some(s => s.totalHours === 0)).toBe(true);
    });

    it('selectedFrom + contextTimelogs with weekStartsOn=2 pads VLW context slots', () => {
        const ctx: Timelog[] = [
            makeTimelog({ spentAt: '2026-11-10T08:00:00Z', timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const data = processChartData([], ctx, ctx, new Date('2026-11-10T00:00:00Z'), 2);
        expect(data.lineData.length).toBe(3);
        data.lineData.forEach(row => expect(String(row.week)).toMatch(/^VLW \(/));
    });

    it('matchCategory via alias and namespaced label contributes to pie', () => {
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('category::architecture'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const data = processChartData([], logs);
        expect(data.pieData.find(p => p.name === 'Architektur & Design')?.value).toBe(1);
    });

    it('unmatched labels do not add to any pie category', () => {
        const logs: Timelog[] = [
            makeTimelog({ timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('totally-unknown-xyz'), timeEstimate: 0, totalTimeSpent: 0 } }),
        ];
        const data = processChartData([], logs);
        expect(data.pieData.reduce((s, p) => s + p.value, 0)).toBe(0);
    });

    it('builds collaboration, complexity and average-team-member data for multi-user issue', () => {
        const sharedIssue = { title: 't', iid: '42', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 };
        const logs: Timelog[] = [
            makeTimelog({ user: { name: 'Alice' }, timeSpent: 3600, issue: { ...sharedIssue } }),
            makeTimelog({ user: { name: 'Bob' }, timeSpent: 3600, issue: { ...sharedIssue } }),
        ];
        const data = processChartData([], logs);
        expect(data.collaborationData[0]).toMatchObject({ source: 'Alice', target: 'Bob', value: 1 });
        const impl = data.averageTeamMembersData.find(a => a.category === 'Implementierung');
        expect(impl?.totalMembers).toBe(2);
        expect(impl?.averageMembers).toBe(2);
        const cx = data.issueComplexityData.find(c => c.category === 'Implementierung');
        expect(cx?.totalIssues).toBe(1);
    });

    it('productivity patterns compute hourly/weekly buckets and peaks', () => {
        const logs: Timelog[] = [makeTimelog({ spentAt: '2026-11-03T08:00:00Z', timeSpent: 3600, issue: { title: 't', iid: '1', webUrl: '', labels: labels('Implementierung'), timeEstimate: 0, totalTimeSpent: 0 } })];
        const data = processChartData([], logs);
        expect(data.productivityPatterns.hourlyData).toHaveLength(24);
        expect(data.productivityPatterns.weeklyData).toHaveLength(7);
        expect(data.productivityPatterns.peakHour.value).toBeGreaterThan(0);
        expect(data.productivityPatterns.peakDay.value).toBeGreaterThan(0);
    });
});
