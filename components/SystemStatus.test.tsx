// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SystemStatus from '@/components/SystemStatus';
import type { SystemStatus as Status } from '@/app/api/status/route';

// next/navigation is not available under jsdom — provide a controllable mock.
let currentGroup = '';
vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(currentGroup ? `group=${currentGroup}` : ''),
}));

function onlineStatus(overrides: Partial<Status> = {}): Status {
    return {
        gitlab: { reachable: true, responseMs: 123, httpStatus: 200, tokenValid: true },
        scope: { label: 'g4-mergeconflict', allGroups: false },
        data: { issues: 42, epics: 5, members: 7 },
        app: { checkedAt: '2026-11-19T10:00:00.000Z', nodeVersion: 'v20.0.0', environment: 'test', commit: 'abc1234' },
        error: null,
        ...overrides,
    };
}

function mockFetchResolving(status: Status) {
    const fn = vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => status,
    }) as unknown as Response);
    vi.stubGlobal('fetch', fn);
    return fn;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    currentGroup = '';
});

describe('SystemStatus (modal)', () => {
    it('fetches on mount and renders the online banner + tiles', async () => {
        mockFetchResolving(onlineStatus());
        render(<SystemStatus onClose={() => {}} />);

        expect(await screen.findByText('Betriebsbereit')).toBeInTheDocument();
        expect(screen.getByText('Erreichbar')).toBeInTheDocument();
        expect(screen.getByText('123 ms')).toBeInTheDocument();
        expect(screen.getByText('Gültig')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText('abc1234')).toBeInTheDocument();
        // scope is shown so the counts are not ambiguous
        expect(screen.getByText('g4-mergeconflict')).toBeInTheDocument();
    });

    it('requests the status for all groups when no group is selected', async () => {
        currentGroup = '';
        const fn = mockFetchResolving(onlineStatus({ scope: { label: 'Alle Gruppen', allGroups: true } }));
        render(<SystemStatus onClose={() => {}} />);
        await screen.findByText('Betriebsbereit');
        expect(fn).toHaveBeenCalledWith('/api/status', expect.anything());
        expect(screen.getByText('Alle Gruppen')).toBeInTheDocument();
    });

    it('passes the selected group through to the API', async () => {
        currentGroup = 'dhbw-se/course/g2-medventory';
        const fn = mockFetchResolving(onlineStatus({ scope: { label: 'g2-medventory', allGroups: false } }));
        render(<SystemStatus onClose={() => {}} />);
        await screen.findByText('Betriebsbereit');
        expect(fn).toHaveBeenCalledWith(
            `/api/status?group=${encodeURIComponent('dhbw-se/course/g2-medventory')}`,
            expect.anything(),
        );
        expect(screen.getByText('g2-medventory')).toBeInTheDocument();
    });

    it('shows "Offline" when GitLab is unreachable', async () => {
        mockFetchResolving(onlineStatus({
            gitlab: { reachable: false, responseMs: null, httpStatus: null, tokenValid: false },
            data: { issues: null, epics: null, members: null },
            error: 'ECONNREFUSED',
        }));
        render(<SystemStatus onClose={() => {}} />);
        expect(await screen.findByText('Offline')).toBeInTheDocument();
        expect(screen.getByText('Nicht erreichbar')).toBeInTheDocument();
    });

    it('shows "Eingeschränkt" when reachable but token invalid', async () => {
        mockFetchResolving(onlineStatus({
            gitlab: { reachable: true, responseMs: 90, httpStatus: 401, tokenValid: false },
            data: { issues: null, epics: null, members: null },
            error: 'GitLab API 401',
        }));
        render(<SystemStatus onClose={() => {}} />);
        expect(await screen.findByText('Eingeschränkt')).toBeInTheDocument();
        expect(screen.getByText('Ungültig')).toBeInTheDocument();
    });

    it('renders an error banner when the request itself fails', async () => {
        const fn = vi.fn(async () => ({ ok: false, status: 500 }) as unknown as Response);
        vi.stubGlobal('fetch', fn);
        render(<SystemStatus onClose={() => {}} />);
        expect(await screen.findByText(/konnte nicht geladen werden/i)).toBeInTheDocument();
    });

    it('re-fetches when the "Aktualisieren" button is clicked', async () => {
        const fn = mockFetchResolving(onlineStatus());
        render(<SystemStatus onClose={() => {}} />);
        await screen.findByText('Betriebsbereit');
        expect(fn).toHaveBeenCalledTimes(1);

        await userEvent.click(screen.getByRole('button', { name: /aktualisieren/i }));
        await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    });

    it('auto-refreshes on the 30s interval', async () => {
        vi.useFakeTimers();
        const fn = mockFetchResolving(onlineStatus());
        render(<SystemStatus onClose={() => {}} />);
        await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
        await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
        expect(fn).toHaveBeenCalledTimes(2);
        await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('calls onClose when the X button is clicked', async () => {
        mockFetchResolving(onlineStatus());
        const onClose = vi.fn();
        render(<SystemStatus onClose={onClose} />);
        await screen.findByText('Betriebsbereit');
        await userEvent.click(screen.getByRole('button', { name: /schließen/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop is clicked but not when the panel is clicked', async () => {
        mockFetchResolving(onlineStatus());
        const onClose = vi.fn();
        render(<SystemStatus onClose={onClose} />);
        await screen.findByText('Betriebsbereit');

        // clicking the dialog title (inside panel) must NOT close
        await userEvent.click(screen.getByText('System-Status'));
        expect(onClose).not.toHaveBeenCalled();

        // clicking the backdrop (the dialog role element) closes
        await userEvent.click(screen.getByRole('dialog'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape', async () => {
        mockFetchResolving(onlineStatus());
        const onClose = vi.fn();
        render(<SystemStatus onClose={onClose} />);
        await screen.findByText('Betriebsbereit');
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
