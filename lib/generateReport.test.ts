// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { generateReport, downloadReport } from '@/lib/generateReport';
import type { ChartData, LeaderboardEntry } from '@/lib/processData';
import { makeIssue } from '@/test/fixtures';

const dateRange = { from: '2026-11-01', to: '2026-11-30' };

function makeChartData(overrides: Partial<ChartData> = {}): ChartData {
    const base: ChartData = {
        issues: [],
        pieData: [],
        lineData: [],
        barData: [],
        heatmapData: [],
        projectMetrics: {
            sprintData: [],
            totalSprints: 0,
            averageVelocity: 0,
            categoryDistribution: [],
        },
        averageTeamMembersData: [],
        labelsTimeline: [],
        labelsTimelineKeys: [],
        userCategoryMatrix: [],
        userCategoryKeys: [],
        cfdData: [],
        issueComplexityData: [],
        collaborationData: [],
        productivityPatterns: {
            hourlyData: [],
            weeklyData: [],
            peakHour: { hour: '0', value: 0 },
            peakDay: { day: '—', value: 0 },
        },
        leaderboard: [],
        personDetails: [],
    };
    return { ...base, ...overrides };
}

function lb(o: Partial<LeaderboardEntry> & { name: string }): LeaderboardEntry {
    return { hours: 0, issueCount: 0, rank: 1, percentage: 0, ...o };
}

describe('generateReport', () => {
    it('does not crash on fully minimal / empty data and returns an HTML document', () => {
        const html = generateReport(makeChartData(), dateRange);
        expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
        expect(html).toContain('Time Tracking Report');
        // Date range is embedded.
        expect(html).toContain('2026-11-01');
        expect(html).toContain('2026-11-30');
        // Empty-state fallbacks appear.
        expect(html).toContain('Keine kritischen Personenabhängigkeiten.');
        expect(html).toContain('Keine risikobehafteten Issues gefunden.');
        // Top-category fallback dash.
        expect(html).toContain('—');
    });

    it('renders central KPIs and section headings for a populated dataset', () => {
        const data = makeChartData({
            leaderboard: [
                lb({ name: 'Alice', hours: 10, issueCount: 4, rank: 1, percentage: 62.5 }),
                lb({ name: 'Bob', hours: 6, issueCount: 3, rank: 2, percentage: 37.5 }),
            ],
            pieData: [
                { name: 'Implementierung', value: 9 },
                { name: 'Projektmanagement', value: 7 },
            ],
            projectMetrics: {
                sprintData: [
                    { sprintStart: 'KW45', sprintEnd: 'KW45', totalHours: 16, categoryHours: { Implementierung: 9, Projektmanagement: 7 }, userHours: { Alice: 10, Bob: 6 }, sprintNumber: 1 },
                ],
                totalSprints: 1,
                averageVelocity: 16,
                categoryDistribution: [],
            },
            cfdData: [{ date: 'KW45', opened: 5, closed: 2, total: 7 }],
            personDetails: [
                { name: 'Alice', categoryHours: { Implementierung: 9 }, hoursBySprintNumber: [10], focusLastCycle: 'Implementierung', focusThisCycle: 'Architektur & Design' },
            ],
            productivityPatterns: {
                hourlyData: [], weeklyData: [],
                peakHour: { hour: '14', value: 3.5 },
                peakDay: { day: 'Dienstag', value: 6 },
            },
        });
        const html = generateReport(data, dateRange);
        // KPI headings / section titles.
        expect(html).toContain('Gesamtstunden');
        expect(html).toContain('Leaderboard');
        expect(html).toContain('Kategorie-Verteilung');
        expect(html).toContain('KW-Verlauf');
        expect(html).toContain('Risikoanalyse');
        // Names from leaderboard and person cards.
        expect(html).toContain('Alice');
        expect(html).toContain('Bob');
        // Total hours = 16.0 h.
        expect(html).toContain('16.0 h');
        // Top category (highest pie value).
        expect(html).toContain('Implementierung');
        // Productivity peaks.
        expect(html).toContain('14 Uhr');
        expect(html).toContain('Dienstag');
        // Last-sprint summary present.
        expect(html).toContain('Letzte KW');
    });

    it('detects risky issues and a key-person concentration', () => {
        const data = makeChartData({
            // One open issue with no label/epic/estimate/description/dates → multiple risk reasons.
            issues: [makeIssue({ state: 'opened', timeEstimate: 0, totalTimeSpent: 0, description: null, startDate: null, dueDate: null, epic: null })],
            leaderboard: [
                lb({ name: 'Alice', hours: 90, issueCount: 10, rank: 1, percentage: 90 }),
                lb({ name: 'Bob', hours: 10, issueCount: 2, rank: 2, percentage: 10 }),
            ],
        });
        const html = generateReport(data, dateRange);
        // Risk reason labels are rendered.
        expect(html).toContain('Kein Label');
        expect(html).toContain('Keine Schätzung');
        // Risky-issue table rendered rather than the empty-state.
        expect(html).toContain('Riskanteste Issues');
        // Key-person section rendered (Alice well above fair share).
        expect(html).toContain('Personenrisiken');
        expect(html).toContain('fairer Anteil');
    });

    it('escapes HTML-special characters in user-provided strings', () => {
        const data = makeChartData({
            pieData: [{ name: '<b>&"x"', value: 5 }],
        });
        const html = generateReport(data, dateRange);
        expect(html).toContain('&lt;b&gt;&amp;&quot;x&quot;');
        expect(html).not.toContain('<b>&"x"');
    });
});

describe('downloadReport', () => {
    it('creates a blob URL, clicks an anchor with the right filename, and revokes the URL', () => {
        const createObjectURL = vi.fn(() => 'blob:fake-url');
        const revokeObjectURL = vi.fn();
        // jsdom lacks these by default.
        vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));

        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const createElement = vi.spyOn(document, 'createElement');

        downloadReport('<html>hi</html>', 'my-report');

        // An anchor was created.
        const anchorCall = createElement.mock.results.find(r => (r.value as HTMLElement).tagName === 'A');
        expect(anchorCall).toBeDefined();
        const anchor = anchorCall!.value as HTMLAnchorElement;
        expect(anchor.download).toBe('my-report.html');
        expect(anchor.href).toContain('blob:fake-url');
        expect(clickSpy).toHaveBeenCalledOnce();
        expect(createObjectURL).toHaveBeenCalledOnce();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    });

    it('defaults the filename to "report"', () => {
        const createObjectURL = vi.fn(() => 'blob:fake-url');
        const revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const createElement = vi.spyOn(document, 'createElement');

        downloadReport('<html>hi</html>');

        const anchor = createElement.mock.results.find(r => (r.value as HTMLElement).tagName === 'A')!.value as HTMLAnchorElement;
        expect(anchor.download).toBe('report.html');
    });
});
