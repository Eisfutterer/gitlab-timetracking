import { describe, it, expect } from 'vitest';
import { milestoneUrl, buildGroups, groupsToRows } from './MilestoneGanttView';
import { makeIssue, makeMilestone, labels } from '@/test/fixtures';

describe('milestoneUrl', () => {
    it('resolves a relative webPath against an issue origin', () => {
        const issues = [
            makeIssue({
                webUrl: 'https://gitlab.com/group/project/-/issues/1',
                milestone: makeMilestone({ webPath: '/group/-/milestones/3' }),
            }),
        ];
        expect(milestoneUrl(issues)).toBe('https://gitlab.com/group/-/milestones/3');
    });

    it('returns null when the milestone has no webPath', () => {
        const issues = [makeIssue({ milestone: makeMilestone({ webPath: null }) })];
        expect(milestoneUrl(issues)).toBeNull();
    });

    it('returns null when there is no milestone', () => {
        const issues = [makeIssue({ milestone: null })];
        expect(milestoneUrl(issues)).toBeNull();
    });

    it('returns null when no issue has a referenceable webUrl', () => {
        const issues = [
            makeIssue({
                webUrl: '',
                milestone: makeMilestone({ webPath: '/group/-/milestones/3' }),
            }),
        ];
        expect(milestoneUrl(issues)).toBeNull();
    });

    it('returns null when the reference URL is unparseable (try/catch)', () => {
        const issues = [
            makeIssue({
                webUrl: 'not a valid url',
                milestone: makeMilestone({ webPath: '/group/-/milestones/3' }),
            }),
        ];
        expect(milestoneUrl(issues)).toBeNull();
    });
});

describe('buildGroups', () => {
    it('dedupes issues by webUrl', () => {
        const dup = makeIssue({ webUrl: 'https://gitlab.com/x/-/issues/9', milestone: null });
        const groups = buildGroups([dup, { ...dup }]);
        const undated = groups.find(g => g.title === 'Ohne Meilenstein');
        expect(undated!.issues).toHaveLength(1);
    });

    it('groups issues by milestone.title and maps the undated key to a German label', () => {
        const a = makeIssue({ webUrl: 'u1', milestone: makeMilestone({ title: 'M1' }) });
        const b = makeIssue({ webUrl: 'u2', milestone: makeMilestone({ title: 'M1' }) });
        const c = makeIssue({ webUrl: 'u3', milestone: null });
        const groups = buildGroups([a, b, c]);
        const m1 = groups.find(g => g.title === 'M1');
        const none = groups.find(g => g.title === 'Ohne Meilenstein');
        expect(m1!.issues).toHaveLength(2);
        expect(none).toBeTruthy();
        expect(none!.dated).toBe(false);
        expect(none!.webUrl).toBeNull();
    });

    it('falls back start=s??e / end=e??s when only one bound is set', () => {
        const onlyStart = makeIssue({
            webUrl: 's1',
            milestone: makeMilestone({ title: 'Start only', startDate: '2026-11-03', dueDate: null }),
        });
        const onlyEnd = makeIssue({
            webUrl: 'e1',
            milestone: makeMilestone({ title: 'End only', startDate: null, dueDate: '2026-11-09' }),
        });
        const groups = buildGroups([onlyStart, onlyEnd]);
        const s = groups.find(g => g.title === 'Start only')!;
        const e = groups.find(g => g.title === 'End only')!;
        expect(s.start!.getTime()).toBe(s.end!.getTime());
        expect(e.start!.getTime()).toBe(e.end!.getTime());
        expect(s.dated).toBe(true);
        expect(e.dated).toBe(true);
    });

    it('marks a milestone undated when it has no dates at all', () => {
        const none = makeIssue({
            webUrl: 'n1',
            milestone: makeMilestone({ title: 'No dates', startDate: null, dueDate: null }),
        });
        const groups = buildGroups([none]);
        const g = groups.find(x => x.title === 'No dates')!;
        expect(g.dated).toBe(false);
        expect(g.start).toBeNull();
        expect(g.end).toBeNull();
    });

    it('sorts dated groups first by start, undated last by title', () => {
        const later = makeIssue({ webUrl: 'l', milestone: makeMilestone({ title: 'Later', startDate: '2026-11-10', dueDate: '2026-11-12' }) });
        const earlier = makeIssue({ webUrl: 'e', milestone: makeMilestone({ title: 'Earlier', startDate: '2026-11-01', dueDate: '2026-11-03' }) });
        const undatedB = makeIssue({ webUrl: 'ub', milestone: makeMilestone({ title: 'B undated', startDate: null, dueDate: null }) });
        const undatedA = makeIssue({ webUrl: 'ua', milestone: makeMilestone({ title: 'A undated', startDate: null, dueDate: null }) });
        const groups = buildGroups([later, undatedB, earlier, undatedA]);
        const titles = groups.map(g => g.title);
        expect(titles).toEqual(['Earlier', 'Later', 'A undated', 'B undated']);
    });
});

describe('groupsToRows', () => {
    const datedIssue = makeIssue({
        webUrl: 'd1', state: 'opened', labels: labels('Implementierung'),
        milestone: makeMilestone({ title: 'Dated', startDate: '2026-11-03', dueDate: '2026-11-09' }),
    });
    const undatedIssue = makeIssue({
        webUrl: 'u1', state: 'opened',
        milestone: makeMilestone({ title: 'Undated', startDate: null, dueDate: null }),
    });

    it('filters out undated groups when showUndated is false', () => {
        const groups = buildGroups([datedIssue, undatedIssue]);
        const rows = groupsToRows(groups, false, new Set());
        expect(rows.some(r => r.milestoneTitle === 'Undated')).toBe(false);
        expect(rows.some(r => r.milestoneTitle === 'Dated')).toBe(true);
    });

    it('includes undated groups when showUndated is true', () => {
        const groups = buildGroups([datedIssue, undatedIssue]);
        const rows = groupsToRows(groups, true, new Set());
        expect(rows.some(r => r.milestoneTitle === 'Undated')).toBe(true);
    });

    it('skips issue rows for collapsed milestones but keeps the milestone row', () => {
        const groups = buildGroups([datedIssue]);
        const rows = groupsToRows(groups, false, new Set(['Dated']));
        const msRows = rows.filter(r => r.isMilestone);
        const issueRows = rows.filter(r => !r.isMilestone);
        expect(msRows).toHaveLength(1);
        expect(issueRows).toHaveLength(0);
        expect(msRows[0].issueCount).toBe(1);
    });

    it('marks a milestone closed only when ALL issues are closed', () => {
        const openIssue = makeIssue({ webUrl: 'o', state: 'opened', milestone: makeMilestone({ title: 'Mix', startDate: '2026-11-03', dueDate: '2026-11-09' }) });
        const closedIssue = makeIssue({ webUrl: 'c', state: 'closed', milestone: makeMilestone({ title: 'Mix', startDate: '2026-11-03', dueDate: '2026-11-09' }) });
        const mixed = groupsToRows(buildGroups([openIssue, closedIssue]), false, new Set());
        expect(mixed.find(r => r.isMilestone)!.state).toBe('opened');

        const allClosed = groupsToRows(buildGroups([{ ...closedIssue, webUrl: 'c2' }, closedIssue]), false, new Set());
        expect(allClosed.find(r => r.isMilestone)!.state).toBe('closed');
    });

    it('lets issues inherit the full milestone span when created before and still open', () => {
        // createdAt before milestone start, no closedAt → full milestone span
        const issue = makeIssue({
            webUrl: 'full', state: 'opened', createdAt: '2026-10-01T00:00:00Z', closedAt: null,
            milestone: makeMilestone({ title: 'Full', startDate: '2026-11-03', dueDate: '2026-11-09' }),
        });
        const rows = groupsToRows(buildGroups([issue]), false, new Set());
        const ms = rows.find(r => r.isMilestone)!;
        const row = rows.find(r => !r.isMilestone)!;
        expect(row.start!.getTime()).toBe(ms.start!.getTime());
        expect(row.end!.getTime()).toBe(ms.end!.getTime());
    });

    it('starts the issue bar at createdAt when it falls inside the milestone window', () => {
        const issue = makeIssue({
            webUrl: 'cin', state: 'opened', createdAt: '2026-11-05T00:00:00Z', closedAt: null,
            milestone: makeMilestone({ title: 'CreatedInside', startDate: '2026-11-03', dueDate: '2026-11-09' }),
        });
        const row = groupsToRows(buildGroups([issue]), false, new Set()).find(r => !r.isMilestone)!;
        expect(row.start!.toISOString().slice(0, 10)).toBe('2026-11-05');
        // end stays at milestone due date (still open)
        expect(row.end!.toISOString().slice(0, 10)).toBe('2026-11-09');
    });

    it('ends the issue bar at closedAt when it falls inside the milestone window', () => {
        const issue = makeIssue({
            webUrl: 'cout', state: 'closed', createdAt: '2026-10-01T00:00:00Z', closedAt: '2026-11-06T00:00:00Z',
            milestone: makeMilestone({ title: 'ClosedInside', startDate: '2026-11-03', dueDate: '2026-11-09' }),
        });
        const row = groupsToRows(buildGroups([issue]), false, new Set()).find(r => !r.isMilestone)!;
        expect(row.start!.toISOString().slice(0, 10)).toBe('2026-11-03'); // created before → milestone start
        expect(row.end!.toISOString().slice(0, 10)).toBe('2026-11-06');   // closed inside → closedAt
    });

    it('clamps both ends when created and closed both fall inside the window', () => {
        const issue = makeIssue({
            webUrl: 'both', state: 'closed', createdAt: '2026-11-04T00:00:00Z', closedAt: '2026-11-07T00:00:00Z',
            milestone: makeMilestone({ title: 'Both', startDate: '2026-11-03', dueDate: '2026-11-09' }),
        });
        const row = groupsToRows(buildGroups([issue]), false, new Set()).find(r => !r.isMilestone)!;
        expect(row.start!.toISOString().slice(0, 10)).toBe('2026-11-04');
        expect(row.end!.toISOString().slice(0, 10)).toBe('2026-11-07');
    });

    it('ignores createdAt/closedAt that fall outside the milestone window', () => {
        const issue = makeIssue({
            webUrl: 'outside', state: 'closed', createdAt: '2026-10-01T00:00:00Z', closedAt: '2026-12-01T00:00:00Z',
            milestone: makeMilestone({ title: 'Outside', startDate: '2026-11-03', dueDate: '2026-11-09' }),
        });
        const row = groupsToRows(buildGroups([issue]), false, new Set()).find(r => !r.isMilestone)!;
        // both out of range → full milestone span
        expect(row.start!.toISOString().slice(0, 10)).toBe('2026-11-03');
        expect(row.end!.toISOString().slice(0, 10)).toBe('2026-11-09');
    });
});
