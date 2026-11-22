// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GanttViewV2 from './GanttViewV2';
import { makeEpic, makeEpicIssue, makeMilestone } from '@/test/fixtures';

beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
});

describe('GanttViewV2 render', () => {
    it('renders epic and issue labels from fixtures', () => {
        const epics = [makeEpic({
            title: 'Epic Alpha',
            issues: { nodes: [
                makeEpicIssue({ iid: '1', title: 'Own-dated issue', startDate: '2026-11-03', dueDate: '2026-11-09' }),
                makeEpicIssue({ iid: '2', title: 'Milestone issue', milestone: makeMilestone({ startDate: '2026-11-23', dueDate: '2026-11-30' }) }),
            ] },
        })];
        render(<GanttViewV2 epics={epics} />);
        expect(screen.getAllByText('Epic Alpha').length).toBeGreaterThan(0);
        expect(screen.getByText('Own-dated issue')).toBeInTheDocument();
        expect(screen.getByText('Milestone issue')).toBeInTheDocument();
    });

    it('counts milestone-dated issues as having a date in the filter toggle', async () => {
        const user = userEvent.setup();
        const epics = [makeEpic({
            title: 'Epic Alpha',
            issues: { nodes: [
                makeEpicIssue({ iid: '1', title: 'Own-dated issue', startDate: '2026-11-03', dueDate: '2026-11-09' }),
                makeEpicIssue({ iid: '2', title: 'Milestone issue', milestone: makeMilestone({ startDate: '2026-11-23', dueDate: '2026-11-30' }) }),
                makeEpicIssue({ iid: '3', title: 'Undated issue' }),
            ] },
        })];
        render(<GanttViewV2 epics={epics} />);
        // 2 of 3 issues have a date (own or milestone)
        expect(screen.getByText('2 / 3 Issues mit Datum')).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox'));
        // undated issue is filtered out; milestone issue stays
        expect(screen.queryByText('Undated issue')).not.toBeInTheDocument();
        expect(screen.getByText('Milestone issue')).toBeInTheDocument();
    });

    it('shows empty state when there are no epics', () => {
        render(<GanttViewV2 epics={[]} />);
        expect(screen.getByText('Keine Epics gefunden.')).toBeInTheDocument();
    });

    it('shows a milestone-source tooltip when hovering a milestone-dated issue bar', async () => {
        const user = userEvent.setup();
        const epics = [makeEpic({
            title: 'Epic Alpha',
            issues: { nodes: [
                makeEpicIssue({
                    iid: '2', title: 'Milestone issue', startDate: null, dueDate: null,
                    milestone: makeMilestone({ title: 'Test-MS01', startDate: '2026-11-23', dueDate: '2026-11-30' }),
                }),
            ] },
        })];
        const { container } = render(<GanttViewV2 epics={epics} />);
        // hover a bar group (the <g> elements carry the tooltip handlers)
        const barGroups = container.querySelectorAll('svg g');
        const target = Array.from(barGroups).find(g => g.querySelector('rect[stroke-dasharray]'));
        expect(target).toBeTruthy();
        await user.hover(target as Element);
        expect(screen.getByText(/aus Meilenstein/)).toBeInTheDocument();
        expect(screen.getByText(/Test-MS01/)).toBeInTheDocument();
        await user.unhover(target as Element);
    });

    it('shows a derived-source note when hovering an undated issue bar', async () => {
        const user = userEvent.setup();
        const epics = [makeEpic({
            title: 'Epic Beta',
            issues: { nodes: [makeEpicIssue({ iid: '9', title: 'Undated', startDate: null, dueDate: null, milestone: null })] },
        })];
        const { container } = render(<GanttViewV2 epics={epics} />);
        const g = container.querySelector('svg g:last-of-type');
        await user.hover(g as Element);
        expect(screen.getByText(/aus createdAt\/closedAt abgeleitet/)).toBeInTheDocument();
    });

    it('opens the issue URL when a bar is clicked', async () => {
        const user = userEvent.setup();
        const openSpy = vi.fn();
        vi.stubGlobal('open', openSpy);
        const epics = [makeEpic({
            title: 'Epic Gamma',
            issues: { nodes: [makeEpicIssue({ iid: '7', title: 'Clickable', webUrl: 'https://gitlab.com/x/-/issues/7', startDate: '2026-11-03', dueDate: '2026-11-09' })] },
        })];
        const { container } = render(<GanttViewV2 epics={epics} />);
        const groups = container.querySelectorAll('svg g');
        const clickable = Array.from(groups).filter(g => (g as HTMLElement).style.cursor === 'pointer');
        // last clickable is the issue bar; click it
        await user.click(clickable[clickable.length - 1] as Element);
        expect(openSpy).toHaveBeenCalledWith('https://gitlab.com/x/-/issues/7', '_blank');
    });

    it('opens the epic URL when an epic bar is clicked', async () => {
        const user = userEvent.setup();
        const openSpy = vi.fn();
        vi.stubGlobal('open', openSpy);
        const epics = [makeEpic({
            id: 'gid://gitlab/Epic/42', title: 'Linkable Epic', webUrl: 'https://gitlab.com/group/-/epics/42',
            issues: { nodes: [makeEpicIssue({ iid: '1', startDate: '2026-11-03', dueDate: '2026-11-09' })] },
        })];
        const { container } = render(<GanttViewV2 epics={epics} />);
        // the epic bar group is the first clickable <g> with a pointer cursor
        const groups = container.querySelectorAll('svg g');
        const clickable = Array.from(groups).filter(g => (g as HTMLElement).style.cursor === 'pointer');
        await user.click(clickable[0] as Element);
        expect(openSpy).toHaveBeenCalledWith('https://gitlab.com/group/-/epics/42', '_blank');
    });
});
