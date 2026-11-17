import { Suspense } from 'react';
import { fetchAllIssues, fetchAllTimelogs, fetchEpics, fetchIssueNotes, fetchAllGroupPaths, fetchGroupMembers } from '@/lib/gitlab';
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

    // Fetch group members for all active group paths in parallel.
    // Used for: (1) per-user timelog fetching to avoid noise, (2) padding 0h rows in charts.
    const memberArrays = await Promise.all(groupPaths.map(p => fetchGroupMembers(p)));
    const membersByGroup = Object.fromEntries(
        groupPaths.map((p, i) => [p, memberArrays[i]])
    );
    const knownMembers = Array.from(new Set(memberArrays.flat().map(m => m.name)));

    // Detect week mode: if from is a Tuesday (UTC day=2) → VLW mode (Di–Mo)
    const weekStartsOn: 0 | 1 | 2 = sp.from
        ? (new Date(sp.from).getUTCDay() === 2 ? 2 : 1)
        : 1;

    // Detect single-KW filter (from+to span exactly 7 days) → load ±1 week for chart context
    const isSingleKw = sp.from && sp.to && (endDate.getTime() - startDate.getTime()) <= MS_PER_WEEK;
    const contextStart = isSingleKw ? new Date(startDate.getTime() - MS_PER_WEEK) : null;
    const contextEnd   = isSingleKw ? new Date(endDate.getTime()   + MS_PER_WEEK * 2) : null;

    const [issues, timelogs, epics, contextTimelogs] = await Promise.all([
        fetchAllIssues(groupPaths),
        fetchAllTimelogs(startDate, endDate, groupPaths, membersByGroup),
        fetchEpics(groupPaths),
        contextStart && contextEnd
            ? fetchAllTimelogs(contextStart, contextEnd, groupPaths, membersByGroup)
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

    // When a specific group is selected, restrict timelogs to that group's members only.
    // Without this filter, users from other groups who logged time on shared issues would appear.
    const knownMembersSet = knownMembers.length > 0 ? new Set(knownMembers) : null;
    const filteredTimelogs = knownMembersSet
        ? allTimelogs.filter(t => knownMembersSet.has(t.user.name))
        : allTimelogs;
    const filteredContextTimelogs = knownMembersSet && allContextTimelogs
        ? allContextTimelogs.filter(t => knownMembersSet.has(t.user.name))
        : allContextTimelogs;

    // Filter issues to those with timelog activity in the selected range.
    // Falls back to all issues when no date filter is active.
    const activeIssueIids = new Set(filteredTimelogs.map(t => t.issue?.iid).filter(Boolean));
    const filteredIssues = (sp.from || sp.to)
        ? issues.filter(issue => activeIssueIids.has(issue.iid))
        : issues;

    const chartData = processChartData(filteredIssues, filteredTimelogs, filteredContextTimelogs, isSingleKw ? startDate : undefined, weekStartsOn, knownMembers);

    return <DashboardShell {...chartData} issues={filteredIssues} epics={epics} />;
}

export default function Home(props: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <Dashboard {...props} />
        </Suspense>
    );
}
