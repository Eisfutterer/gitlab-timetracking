import { describe, it, expect } from 'vitest';
import { collectRows } from './GanttViewV2';
import { makeEpic, makeEpicIssue, makeMilestone } from '@/test/fixtures';

const TODAY = new Date('2026-11-22T00:00:00Z');

describe('GanttViewV2 collectRows — milestone date fallback', () => {
    it('uses the issue\'s own startDate/dueDate when present (own dates win)', () => {
        const epic = makeEpic({
            issues: {
                nodes: [makeEpicIssue({
                    iid: '1', startDate: '2026-11-05', dueDate: '2026-11-10',
                    milestone: makeMilestone({ startDate: '2026-11-01', dueDate: '2026-11-20' }),
                })],
            },
        });
        const rows = collectRows(epic, 0, TODAY);
        const issue = rows.find(r => !r.isEpic)!;
        expect(issue.start.toISOString().slice(0, 10)).toBe('2026-11-05');
        expect(issue.end.toISOString().slice(0, 10)).toBe('2026-11-10');
        expect(issue.dateSource).toBe('explicit');
    });

    it('falls back to the milestone dates when the issue has none', () => {
        const epic = makeEpic({
            issues: {
                nodes: [makeEpicIssue({
                    iid: '2', startDate: null, dueDate: null,
                    createdAt: '2026-11-22T08:00:00Z', closedAt: null,
                    milestone: makeMilestone({ startDate: '2026-11-23', dueDate: '2026-11-30' }),
                })],
            },
        });
        const rows = collectRows(epic, 0, TODAY);
        const issue = rows.find(r => !r.isEpic)!;
        expect(issue.start.toISOString().slice(0, 10)).toBe('2026-11-23');
        expect(issue.end.toISOString().slice(0, 10)).toBe('2026-11-30');
        expect(issue.dateSource).toBe('milestone');
        expect(issue.milestoneTitle).toBe('Milestone A');
    });

    it('mixes own start with milestone due (partial own dates)', () => {
        const epic = makeEpic({
            issues: {
                nodes: [makeEpicIssue({
                    iid: '3', startDate: '2026-11-24', dueDate: null,
                    milestone: makeMilestone({ startDate: '2026-11-20', dueDate: '2026-11-28' }),
                })],
            },
        });
        const issue = collectRows(epic, 0, TODAY).find(r => !r.isEpic)!;
        expect(issue.start.toISOString().slice(0, 10)).toBe('2026-11-24'); // own start
        expect(issue.end.toISOString().slice(0, 10)).toBe('2026-11-28');   // milestone due
    });

    it('falls back to createdAt/closedAt when neither own nor milestone dates exist', () => {
        const epic = makeEpic({
            issues: {
                nodes: [makeEpicIssue({
                    iid: '4', startDate: null, dueDate: null, milestone: null,
                    createdAt: '2026-11-10T00:00:00Z', closedAt: '2026-11-12T00:00:00Z',
                })],
            },
        });
        const issue = collectRows(epic, 0, TODAY).find(r => !r.isEpic)!;
        expect(issue.start.toISOString().slice(0, 10)).toBe('2026-11-10');
        expect(issue.end.toISOString().slice(0, 10)).toBe('2026-11-12');
        expect(issue.dateSource).toBe('derived');
    });

    it('extends the epic span to today for open, undated issues', () => {
        // regression: an epic whose children are all open & undated (only createdAt) used to
        // collapse to the createdAt range; now open issues count up to "today".
        const epic = makeEpic({
            title: 'Root Epic Architektur',
            issues: {
                nodes: [
                    makeEpicIssue({ iid: 'o1', state: 'opened', startDate: null, dueDate: null, milestone: null, createdAt: '2026-11-10T00:00:00Z', closedAt: null }),
                    makeEpicIssue({ iid: 'o2', state: 'opened', startDate: null, dueDate: null, milestone: null, createdAt: '2026-11-12T00:00:00Z', closedAt: null }),
                ],
            },
        });
        const epicRow = collectRows(epic, 0, TODAY).find(r => r.isEpic)!;
        expect(epicRow.start.toISOString().slice(0, 10)).toBe('2026-11-10'); // earliest createdAt
        expect(epicRow.end.toISOString().slice(0, 10)).toBe('2026-11-22');   // today, not latest createdAt
    });

    it('propagates the span up to the epic from milestone-dated issues', () => {
        // Professor's scenario: issues carry only milestones; the epic span is derived from them.
        const epic = makeEpic({
            title: 'Timeline-Sub01',
            issues: {
                nodes: [
                    makeEpicIssue({ iid: 'a', startDate: null, dueDate: null, milestone: makeMilestone({ startDate: '2026-11-23', dueDate: '2026-11-27' }) }),
                    makeEpicIssue({ iid: 'b', startDate: null, dueDate: null, milestone: makeMilestone({ startDate: '2026-12-01', dueDate: '2026-12-11' }) }),
                ],
            },
        });
        const epicRow = collectRows(epic, 0, TODAY).find(r => r.isEpic)!;
        expect(epicRow.start.toISOString().slice(0, 10)).toBe('2026-11-23'); // earliest issue start
        expect(epicRow.end.toISOString().slice(0, 10)).toBe('2026-12-11');   // latest issue end
        expect(epicRow.hasExplicitDates).toBe(true);
    });

    it('propagates the span up over nested child epics', () => {
        const root = makeEpic({
            id: 'gid://gitlab/Epic/root', title: 'Timeline-Test',
            issues: { nodes: [] },
            children: {
                nodes: [
                    makeEpic({
                        id: 'gid://gitlab/Epic/sub1', title: 'Timeline-Sub01',
                        issues: { nodes: [makeEpicIssue({ iid: 'x', startDate: null, dueDate: null, milestone: makeMilestone({ startDate: '2026-11-23', dueDate: '2026-11-27' }) })] },
                    }),
                    makeEpic({
                        id: 'gid://gitlab/Epic/sub2', title: 'Timeline-Sub02',
                        issues: { nodes: [makeEpicIssue({ iid: 'y', startDate: null, dueDate: null, milestone: makeMilestone({ startDate: '2026-12-14', dueDate: '2026-12-18' }) })] },
                    }),
                ],
            },
        });
        const rootRow = collectRows(root, 0, TODAY).find(r => r.id === 'gid://gitlab/Epic/root')!;
        expect(rootRow.start.toISOString().slice(0, 10)).toBe('2026-11-23');
        expect(rootRow.end.toISOString().slice(0, 10)).toBe('2026-12-18');
    });

    it('clamps end before start to start (inverted span guard)', () => {
        const epic = makeEpic({
            issues: {
                nodes: [makeEpicIssue({
                    iid: '5', startDate: '2026-11-20', dueDate: '2026-11-10', milestone: null,
                })],
            },
        });
        const issue = collectRows(epic, 0, TODAY).find(r => !r.isEpic)!;
        expect(issue.end.getTime()).toBe(issue.start.getTime());
    });
});
