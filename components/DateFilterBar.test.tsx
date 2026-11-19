// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
const searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    useSearchParams: () => searchParams,
}));

import DateFilterBar from './DateFilterBar';

beforeEach(() => {
    push.mockClear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })) as unknown as typeof fetch);
});

describe('DateFilterBar render', () => {
    it('defaults to KW mode showing the calendar-week dropdown', () => {
        render(<DateFilterBar />);
        expect(screen.getByText('Kalenderwoche')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Alle KWs' })).toBeInTheDocument();
    });

    it('switches to VLW mode when the VLW button is clicked', async () => {
        const user = userEvent.setup();
        render(<DateFilterBar />);
        await user.click(screen.getByRole('button', { name: 'VLW' }));
        expect(screen.getByText('Vorlesungswoche (Di – Mo)')).toBeInTheDocument();
        expect(push).toHaveBeenCalled();
    });

    it('switches to custom range mode when Zeitraum is clicked', async () => {
        const user = userEvent.setup();
        render(<DateFilterBar />);
        await user.click(screen.getByRole('button', { name: 'Zeitraum' }));
        // the custom mode shows two date inputs
        const dateInputs = document.querySelectorAll('input[type="date"]');
        expect(dateInputs).toHaveLength(2);
    });

    it('navigates on KW, VLW, custom-date and group changes', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
            json: () => Promise.resolve([{ name: 'Group 1', fullPath: 'g/1' }]),
        })) as unknown as typeof fetch);
        const user = userEvent.setup();
        render(<DateFilterBar />);

        // KW select change (handleKwChange)
        const kwSelect = screen.getAllByRole('combobox')[0];
        const kwOption = kwSelect.querySelectorAll('option')[1] as HTMLOptionElement;
        await user.selectOptions(kwSelect, kwOption.value);
        // reset to "Alle KWs"
        await user.selectOptions(kwSelect, '');
        expect(push).toHaveBeenCalled();

        // explicitly click the KW mode button (L156)
        await user.click(screen.getByRole('button', { name: 'KW' }));

        // VLW mode + select change (L211)
        await user.click(screen.getByRole('button', { name: 'VLW' }));
        const vlwSelect = screen.getAllByRole('combobox')[0];
        const vlwOption = vlwSelect.querySelectorAll('option')[1] as HTMLOptionElement;
        await user.selectOptions(vlwSelect, vlwOption.value);
        await user.selectOptions(vlwSelect, '');

        // custom date inputs (handleFrom / handleTo)
        await user.click(screen.getByRole('button', { name: 'Zeitraum' }));
        const dateInputs = document.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
        const { fireEvent } = await import('@testing-library/react');
        fireEvent.change(dateInputs[0], { target: { value: '2026-11-01' } });
        fireEvent.change(dateInputs[1], { target: { value: '2026-11-07' } });

        // group selector change (handleGroupChange) — appears after fetch resolves
        const groupOption = await screen.findByRole('option', { name: 'Group 1' });
        const groupCombo = groupOption.closest('select') as HTMLSelectElement;
        await user.selectOptions(groupCombo, 'g/1');

        expect(push).toHaveBeenCalled();
    });
});
