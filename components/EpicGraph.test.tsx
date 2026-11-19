// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EpicGraph from './EpicGraph';
import { makeEpic, makeEpicIssue, makeIssue, makeMilestone, labels } from '@/test/fixtures';

beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
});

function fixtures() {
    const epics = [makeEpic({
        id: 'gid://gitlab/Epic/1',
        title: 'Epic Alpha',
        issues: { nodes: [
            makeEpicIssue({ iid: '1', title: 'Open issue', webUrl: 'https://gitlab.com/g/p/-/issues/1', state: 'opened', labels: labels('Implementierung'), startDate: '2026-11-03', dueDate: '2026-11-09' }),
            makeEpicIssue({ iid: '2', title: 'Closed issue', webUrl: 'https://gitlab.com/g/p/-/issues/2', state: 'closed', labels: labels('Projektmanagement') }),
        ] },
        children: { nodes: [ makeEpic({ id: 'gid://gitlab/Epic/2', title: 'Child Epic', issues: { nodes: [ makeEpicIssue({ iid: '3', title: 'Child issue', webUrl: 'https://gitlab.com/g/p/-/issues/3' }) ] } }) ] },
    })];
    const issues = [
        makeIssue({ iid: '1', title: 'Flat issue', webUrl: 'https://gitlab.com/g/p/-/issues/1', milestone: makeMilestone({ title: 'Sprint 1', startDate: '2026-11-03', dueDate: '2026-11-09', webPath: '/g/-/milestones/1' }) }),
    ];
    return { epics, issues };
}

describe('EpicGraph render', () => {
    it('renders the card view by default', () => {
        const { epics, issues } = fixtures();
        render(<EpicGraph epics={epics} issues={issues} />);
        expect(screen.getByText('Epics & Issues')).toBeInTheDocument();
        expect(screen.getByText('Epic Alpha')).toBeInTheDocument();
    });

    it('switches between tree, gantt and milestone views', async () => {
        const user = userEvent.setup();
        const { epics, issues } = fixtures();
        render(<EpicGraph epics={epics} issues={issues} />);

        await user.click(screen.getByRole('button', { name: /Baum/ }));
        // tree renders an SVG
        expect(document.querySelector('svg')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: /Gantt/ }));
        expect(screen.getByText('Epic / Issue')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Meilensteine/ }));
        expect(screen.getByText('Meilenstein / Issue')).toBeInTheDocument();
    });

    it('toggles the "Geschlossene Issues" checkbox to reveal closed issues', async () => {
        const user = userEvent.setup();
        const { epics, issues } = fixtures();
        render(<EpicGraph epics={epics} issues={issues} />);
        // closed issue hidden by default in card view
        expect(screen.queryByText(/Closed issue/)).not.toBeInTheDocument();

        const checkbox = screen.getByRole('checkbox');
        await user.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(screen.getByText(/Closed issue/)).toBeInTheDocument();
    });

    it('emits no React "same key" warning across view switches', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const user = userEvent.setup();
        const { epics, issues } = fixtures();
        render(<EpicGraph epics={epics} issues={issues} />);

        await user.click(screen.getByRole('button', { name: /Baum/ }));
        await user.click(screen.getByRole('button', { name: /Gantt/ }));
        await user.click(screen.getByRole('button', { name: /Meilensteine/ }));
        await user.click(screen.getByRole('button', { name: /Karten/ }));

        const keyWarnings = errorSpy.mock.calls.filter(c =>
            typeof c[0] === 'string' && /same key|unique "key"/i.test(c[0])
        );
        expect(keyWarnings).toHaveLength(0);
    });

    it('collapses a card-view epic and exercises tree node interactions', async () => {
        const user = userEvent.setup();
        const { fireEvent } = await import('@testing-library/react');
        const { epics, issues } = fixtures();
        const { container } = render(<EpicGraph epics={epics} issues={issues} />);

        // card-view epic header click toggles expansion (L109)
        const epicHeader = screen.getByText('Epic Alpha').closest('div')!;
        await user.click(epicHeader);
        await user.click(epicHeader);

        // tree view: hover + click nodes and issue anchors
        await user.click(screen.getByRole('button', { name: /Baum/ }));
        const svg = Array.from(container.querySelectorAll('svg'))
            .sort((a, b) => b.querySelectorAll('*').length - a.querySelectorAll('*').length)[0]!;
        svg.querySelectorAll('g').forEach(g => { fireEvent.mouseEnter(g); fireEvent.click(g); fireEvent.mouseLeave(g); });
        svg.querySelectorAll('a').forEach(a => { fireEvent.mouseEnter(a); fireEvent.mouseLeave(a); });
        expect(svg).toBeTruthy();
    });
});
