import { Suspense } from 'react';
import { fetchAllIssues, fetchAllTimelogs, fetchEpics, fetchIssueNotes, fetchAllGroupPaths } from '@/lib/gitlab';
import { processChartData, parseSpendNotes } from '@/lib/processData';
import { GITLAB_CONFIG } from '@/config/dashboardConfig';
import DashboardShell from '@/components/DashboardShell';
import Loading from './loading';

export const dynamic = 'force-dynamic';

const DEFAULT_START = new Date('2026-09-01');
const DEFAULT_END   = new Date('2027-09-01');
const SPEND_ISSUE_LIMIT = 20;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

interface PageProps {
    searchParams: Promise<{ from?: string; to?: string; group?: string }>;
}

async function Dashboard({ searchParams }: PageProps) {
    const sp = await searchParams;

    const startDate  = sp.from  ? new Date(sp.from)  : DEFAULT_START;
    const endDate    = sp.to    ? new Date(sp.to)     : DEFAULT_END;
    const groupPaths = sp.group ? [sp.group] : await fetchAllGroupPaths();

    // Detect single-KW filter (from+to span exactly 7 days) → load ±1 week for chart context
    const isSingleKw = sp.from && sp.to && (endDate.getTime() - startDate.getTime()) <= MS_PER_WEEK;
    const contextStart = isSingleKw ? new Date(startDate.getTime() - MS_PER_WEEK) : null;
    const contextEnd   = isSingleKw ? new Date(endDate.getTime()   + MS_PER_WEEK * 2) : null;

    const [issues, timelogs, epics, contextTimelogs] = await Promise.all([
        fetchAllIssues(groupPaths),
        fetchAllTimelogs(startDate, endDate, groupPaths),
        fetchEpics(groupPaths),
        contextStart && contextEnd
            ? fetchAllTimelogs(contextStart, contextEnd, groupPaths)
            : Promise.resolve(null),
    ]);

    const spendNoteResults = await Promise.allSettled(
        issues.slice(0, SPEND_ISSUE_LIMIT).map(async issue => {
            const notes = await fetchIssueNotes(groupPaths[0] ?? GITLAB_CONFIG.GROUP_PATH, issue.iid);
            return parseSpendNotes(notes, {
                title: issue.title, iid: issue.iid, labels: issue.labels,
                timeEstimate: issue.timeEstimate, totalTimeSpent: issue.totalTimeSpent,
            });
        })
    );

    const spendTimelogs = spendNoteResults
        .filter((r): r is PromiseFulfilledResult<typeof timelogs> => r.status === 'fulfilled')
        .flatMap(r => r.value);

    const allTimelogs = [...timelogs, ...spendTimelogs];
    const allContextTimelogs = contextTimelogs ? [...contextTimelogs, ...spendTimelogs] : undefined;

    // Filter issues to those with timelog activity in the selected range.
    // Falls back to all issues when no date filter is active.
    const activeIssueIids = new Set(allTimelogs.map(t => t.issue?.iid).filter(Boolean));
    const filteredIssues = (sp.from || sp.to)
        ? issues.filter(issue => activeIssueIids.has(issue.iid))
        : issues;

    const chartData = processChartData(filteredIssues, allTimelogs, allContextTimelogs, isSingleKw ? startDate : undefined);

    return <DashboardShell {...chartData} issues={filteredIssues} epics={epics} />;
}

export default function Home(props: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <Dashboard {...props} />
        </Suspense>
    );
}
