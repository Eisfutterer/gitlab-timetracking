// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MilestoneGanttView from './MilestoneGanttView';
import { makeIssue, makeMilestone } from '@/test/fixtures';

beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
});

function datedIssues() {
    return [
        makeIssue({
            title: 'Dated issue A',
            iid: '10',
            webUrl: 'https://gitlab.com/group/project/-/issues/10',
            milestone: makeMilestone({
                title: 'Sprint 1',
                startDate: '2026-11-03',
                dueDate: '2026-11-09',
                webPath: '/group/-/milestones/1',
            }),
        }),
    ];
}

describe('MilestoneGanttView render', () => {
    it('renders a milestone row with nested issue rows', () => {
        render(<MilestoneGanttView issues={datedIssues()} />);
        expect(screen.getAllByText('Sprint 1').length).toBeGreaterThan(0);
        expect(screen.getByText('Dated issue A')).toBeInTheDocument();
    });

    it('renders the milestone title as an anchor with the resolved href', () => {
        render(<MilestoneGanttView issues={datedIssues()} />);
        const link = screen.getByRole('link', { name: /Sprint 1/ });
        expect(link).toHaveAttribute('href', 'https://gitlab.com/group/-/milestones/1');
    });

    it('toggle checkbox is unchecked by default and reveals undated items on click', async () => {
        const user = userEvent.setup();
        const issues = [
            ...datedIssues(),
            makeIssue({
                title: 'Undated issue',
                iid: '11',
                webUrl: 'https://gitlab.com/group/project/-/issues/11',
                milestone: makeMilestone({ title: 'Backlog', startDate: null, dueDate: null }),
            }),
        ];
        render(<MilestoneGanttView issues={issues} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        expect(screen.queryByText('Undated issue')).not.toBeInTheDocument();

        await user.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(screen.getByText('Undated issue')).toBeInTheDocument();
    });

    it('collapses a milestone when its row is clicked (issue rows disappear)', async () => {
        const user = userEvent.setup();
        render(<MilestoneGanttView issues={datedIssues()} />);
        expect(screen.getByText('Dated issue A')).toBeInTheDocument();

        // the milestone label column row is clickable; click the milestone title link's row
        const link = screen.getByRole('link', { name: /Sprint 1/ });
        // click the containing row (parent div carries the onClick toggle)
        await user.click(link.parentElement as HTMLElement);
        expect(screen.queryByText('Dated issue A')).not.toBeInTheDocument();
    });

    it('shows the empty state for no issues', () => {
        render(<MilestoneGanttView issues={[]} />);
        expect(screen.getByText(/Keine terminierten Meilensteine gefunden\./)).toBeInTheDocument();
    });

    it('fires hover/click handlers across rows, strip and bars', async () => {
        const openSpy = vi.fn();
        vi.stubGlobal('open', openSpy);
        const { fireEvent } = await import('@testing-library/react');
        const issues = [
            makeIssue({
                title: 'Dated issue A', iid: '10',
                webUrl: 'https://gitlab.com/group/project/-/issues/10',
                state: 'closed',
                milestone: makeMilestone({ title: 'Sprint 1', startDate: '2026-11-01', dueDate: '2026-11-25', webPath: '/group/-/milestones/1' }),
            }),
        ];
        const { container } = render(<MilestoneGanttView issues={issues} />);

        // label rows: hover enter/leave
        container.querySelectorAll('.border-b').forEach(r => {
            fireEvent.mouseEnter(r); fireEvent.mouseLeave(r);
        });

        // clicking the milestone anchor should not propagate (stopPropagation handler)
        const link = screen.getByRole('link', { name: /Sprint 1/ });
        fireEvent.click(link);
        // still expanded (issue row visible) because propagation was stopped
        expect(screen.getByText('Dated issue A')).toBeInTheDocument();

        // the gantt chart is the largest <svg> (lucide icons are also <svg>)
        const svg = Array.from(container.querySelectorAll('svg'))
            .sort((a, b) => b.querySelectorAll('*').length - a.querySelectorAll('*').length)[0]!;
        svg.querySelectorAll('g').forEach(g => { fireEvent.mouseEnter(g); fireEvent.mouseLeave(g); });
        svg.querySelectorAll('rect').forEach(rect => { fireEvent.mouseEnter(rect); fireEvent.mouseLeave(rect); });
        // click the issue bar (cursor:pointer because it has a webUrl)
        const clickableBars = svg.querySelectorAll('g[style*="cursor: pointer"]');
        clickableBars.forEach(g => { fireEvent.mouseEnter(g); fireEvent.click(g); });
        expect(openSpy).toHaveBeenCalled();
    });
});
