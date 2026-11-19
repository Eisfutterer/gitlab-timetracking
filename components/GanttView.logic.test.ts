import { describe, it, expect } from 'vitest';
import { collectRows } from './GanttView';
import { makeEpic, makeEpicIssue, labels } from '@/test/fixtures';
import { COLORS } from '@/config/dashboardConfig';

const today = new Date('2026-11-15T00:00:00Z');

describe('collectRows', () => {
    it('produces an epic row followed by its issue rows', () => {
        const epic = makeEpic({
            id: 'gid://gitlab/Epic/1',
            issues: { nodes: [
                makeEpicIssue({ iid: '1', title: 'Issue 1' }),
                makeEpicIssue({ iid: '2', title: 'Issue 2' }),
            ] },
        });
        const rows = collectRows(epic, 0, today);
        expect(rows[0].isEpic).toBe(true);
        expect(rows[0].id).toBe('gid://gitlab/Epic/1');
        expect(rows.filter(r => !r.isEpic)).toHaveLength(2);
        expect(rows[1].id).toBe('issue-gid://gitlab/Epic/1-1');
    });

    it('recurses over child epics with increasing depth', () => {
        const child = makeEpic({ id: 'gid://gitlab/Epic/2', title: 'Child' });
        const epic = makeEpic({ id: 'gid://gitlab/Epic/1', children: { nodes: [child] } });
        const rows = collectRows(epic, 0, today);
        const childRow = rows.find(r => r.id === 'gid://gitlab/Epic/2')!;
        expect(childRow.depth).toBe(1);
        expect(rows[0].depth).toBe(0);
    });

    it('derives the epic color from the dominant issue category', () => {
        const epic = makeEpic({
            issues: { nodes: [
                makeEpicIssue({ iid: '1', labels: labels('Implementierung') }),
                makeEpicIssue({ iid: '2', labels: labels('Implementierung') }),
                makeEpicIssue({ iid: '3', labels: labels('Projektmanagement') }),
            ] },
        });
        const rows = collectRows(epic, 0, today);
        expect(rows[0].color).toBe(COLORS.CATEGORY['Implementierung']);
    });

    it('falls back to a neutral color when there are no categorized issues', () => {
        const epic = makeEpic({ issues: { nodes: [makeEpicIssue({ labels: labels() })] } });
        const rows = collectRows(epic, 0, today);
        expect(rows[0].color).toBe('#94a3b8');
    });

    it('spans the epic across min/max of all issue dates', () => {
        const epic = makeEpic({
            issues: { nodes: [
                makeEpicIssue({ iid: '1', startDate: '2026-11-03', dueDate: '2026-11-05' }),
                makeEpicIssue({ iid: '2', startDate: '2026-11-10', dueDate: '2026-11-12' }),
            ] },
        });
        const rows = collectRows(epic, 0, today);
        expect(rows[0].start.getTime()).toBe(new Date('2026-11-03').getTime());
        expect(rows[0].end.getTime()).toBe(new Date('2026-11-12').getTime());
    });

    it('falls back to epic createdAt/closedAt when no issues carry dates', () => {
        const epic = makeEpic({ createdAt: '2026-10-01T00:00:00Z', closedAt: '2026-10-20T00:00:00Z', issues: { nodes: [] } });
        const rows = collectRows(epic, 0, today);
        expect(rows[0].start.getTime()).toBe(new Date('2026-10-01T00:00:00Z').getTime());
        expect(rows[0].end.getTime()).toBe(new Date('2026-10-20T00:00:00Z').getTime());
    });

    it('computes progress as closed/total across the whole subtree', () => {
        const epic = makeEpic({
            issues: { nodes: [
                makeEpicIssue({ iid: '1', state: 'closed' }),
                makeEpicIssue({ iid: '2', state: 'opened' }),
            ] },
            children: { nodes: [ makeEpic({ id: 'c', issues: { nodes: [ makeEpicIssue({ iid: '3', state: 'closed' }) ] } }) ] },
        });
        const rows = collectRows(epic, 0, today);
        // 2 of 3 closed
        expect(rows[0].progress).toBeCloseTo(2 / 3);
    });

    it('issue start=startDate??createdAt, end=dueDate??closedAt??today', () => {
        const epic = makeEpic({
            issues: { nodes: [
                makeEpicIssue({ iid: '1', startDate: null, createdAt: '2026-11-02T00:00:00Z', dueDate: null, closedAt: null }),
            ] },
        });
        const rows = collectRows(epic, 0, today);
        const issue = rows.find(r => !r.isEpic)!;
        expect(issue.start.getTime()).toBe(new Date('2026-11-02T00:00:00Z').getTime());
        expect(issue.end.getTime()).toBe(today.getTime());
        expect(issue.hasExplicitDates).toBe(false);
    });

    it('marks hasExplicitDates when startDate or dueDate is present', () => {
        const epic = makeEpic({ issues: { nodes: [ makeEpicIssue({ iid: '1', dueDate: '2026-11-09' }) ] } });
        const issue = collectRows(epic, 0, today).find(r => !r.isEpic)!;
        expect(issue.hasExplicitDates).toBe(true);
    });

    it('clamps issue end to start when end < start', () => {
        const epic = makeEpic({
            issues: { nodes: [
                makeEpicIssue({ iid: '1', startDate: '2026-11-10', dueDate: '2026-11-05' }),
            ] },
        });
        const issue = collectRows(epic, 0, today).find(r => !r.isEpic)!;
        expect(issue.start.getTime()).toBe(new Date('2026-11-10').getTime());
        expect(issue.end.getTime()).toBe(issue.start.getTime());
    });
});
