// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GanttView from './GanttView';
import { makeEpic, makeEpicIssue } from '@/test/fixtures';

beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
});

describe('GanttView render', () => {
    it('renders epic and issue labels from fixtures', () => {
        const epics = [makeEpic({
            title: 'Epic Alpha',
            issues: { nodes: [
                makeEpicIssue({ iid: '1', title: 'Explicit issue', startDate: '2026-11-03', dueDate: '2026-11-09' }),
                makeEpicIssue({ iid: '2', title: 'Derived issue' }),
            ] },
        })];
        render(<GanttView epics={epics} />);
        expect(screen.getAllByText('Epic Alpha').length).toBeGreaterThan(0);
        expect(screen.getByText('Explicit issue')).toBeInTheDocument();
        expect(screen.getByText('Derived issue')).toBeInTheDocument();
    });

    it('filters to explicitly-dated issues when the checkbox is toggled', async () => {
        const user = userEvent.setup();
        const epics = [makeEpic({
            title: 'Epic Alpha',
            issues: { nodes: [
                makeEpicIssue({ iid: '1', title: 'Explicit issue', startDate: '2026-11-03', dueDate: '2026-11-09' }),
                makeEpicIssue({ iid: '2', title: 'Derived issue' }),
            ] },
        })];
        render(<GanttView epics={epics} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(screen.getByText('Explicit issue')).toBeInTheDocument();
        expect(screen.queryByText('Derived issue')).not.toBeInTheDocument();
        // epic always stays visible
        expect(screen.getAllByText('Epic Alpha').length).toBeGreaterThan(0);
    });

    it('shows the empty state for no epics', () => {
        render(<GanttView epics={[]} />);
        expect(screen.getByText('Keine Epics gefunden.')).toBeInTheDocument();
    });

    it('fires hover/click handlers on rows and bars (tooltip + window.open)', async () => {
        const openSpy = vi.fn();
        vi.stubGlobal('open', openSpy);
        const { fireEvent } = await import('@testing-library/react');
        const epics = [makeEpic({
            title: 'Epic Alpha',
            issues: { nodes: [
                makeEpicIssue({ iid: '1', title: 'Explicit issue', webUrl: 'https://gitlab.com/g/p/-/issues/1', startDate: '2026-11-03', dueDate: '2026-11-20', state: 'closed' }),
            ] },
        })];
        const { container } = render(<GanttView epics={epics} />);

        // hover label-column rows
        const labelRows = container.querySelectorAll('.border-b');
        labelRows.forEach(r => { fireEvent.mouseEnter(r); fireEvent.mouseLeave(r); });

        // hover + click the SVG bar groups and background rects
        const svg = container.querySelector('svg')!;
        svg.querySelectorAll('g').forEach(g => {
            fireEvent.mouseEnter(g);
            fireEvent.mouseLeave(g);
        });
        svg.querySelectorAll('rect').forEach(rect => {
            fireEvent.mouseEnter(rect);
            fireEvent.mouseLeave(rect);
        });
        // tooltip appears while hovering a bar
        const barGroups = svg.querySelectorAll('g[style*="cursor"]');
        if (barGroups.length) {
            fireEvent.mouseEnter(barGroups[barGroups.length - 1]);
            fireEvent.click(barGroups[barGroups.length - 1]);
        }
        expect(openSpy).toHaveBeenCalled();
    });
});
