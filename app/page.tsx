import { fetchAllIssues, fetchAllTimelogs, fetchEpics, fetchMergeRequests } from '@/lib/gitlab';
import { processChartData } from '@/lib/processData';
import DashboardShell from '@/components/DashboardShell';

// ADAPT THE DATES HERE ACCORDINGLY
const START_DATE = new Date('2026-09-01');
const END_DATE = new Date('2027-09-01');

export default async function Home() {
    const [issues, timelogs, epics, mergeRequests] = await Promise.all([
        fetchAllIssues(),
        fetchAllTimelogs(START_DATE, END_DATE),
        fetchEpics(),
        fetchMergeRequests(),
    ]);

    const chartData = processChartData(issues, timelogs);

    return <DashboardShell {...chartData} issues={issues} epics={epics} mergeRequests={mergeRequests} />;
}
