import { GITLAB_CONFIG, TEAM_MEMBERS } from '@/config/dashboardConfig';
import { Issue, Timelog, Epic, MergeRequest } from '@/types/dashboard';

const TOKEN = process.env.GITLAB_TOKEN!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graphql(query: string): Promise<any> {
    const res = await fetch(GITLAB_CONFIG.API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        next: { revalidate: 180 },
    });
    const json = await res.json();
    return json.data;
}

export async function fetchAllGroupPaths(): Promise<string[]> {
    const data = await graphql(`
        {
            group(fullPath: "${GITLAB_CONFIG.PARENT_GROUP_PATH}") {
                descendantGroups(first: 50) {
                    nodes { fullPath }
                }
            }
        }
    `);
    const paths: string[] = data?.group?.descendantGroups?.nodes?.map((n: { fullPath: string }) => n.fullPath) ?? [];
    return paths.length > 0 ? paths : [...GITLAB_CONFIG.GROUP_PATHS];
}


async function fetchIssuesForGroup(groupPath: string): Promise<Issue[]> {
    let allIssues: Issue[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${groupPath}") {
                    issues(first: 100, includeSubgroups: true, after: ${endCursor ? `"${endCursor}"` : 'null'}) {
                        nodes {
                            title iid state createdAt
                            labels { nodes { title } }
                            timeEstimate
                            totalTimeSpent
                        }
                        pageInfo { hasNextPage endCursor }
                    }
                }
            }
        `);

        const issuesData = data?.group?.issues;
        if (!issuesData) break;
        allIssues = [...allIssues, ...issuesData.nodes];
        hasNextPage = issuesData.pageInfo.hasNextPage;
        endCursor = issuesData.pageInfo.endCursor;
    }

    return allIssues;
}

export async function fetchAllIssues(groupPaths?: string[]): Promise<Issue[]> {
    const paths = groupPaths ?? GITLAB_CONFIG.GROUP_PATHS;
    const results = await Promise.all(
        paths.map(path => fetchIssuesForGroup(path))
    );
    return results.flat();
}

async function fetchTimelogsForGroup(groupPath: string, startDate: Date, endDate: Date): Promise<Timelog[]> {
    let allTimelogs: Timelog[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${groupPath}") {
                    timelogs(
                        first: 100,
                        after: ${endCursor ? `"${endCursor}"` : 'null'},
                        startDate: "${startDate.toISOString()}",
                        endDate: "${endDate.toISOString()}"
                    ) {
                        nodes {
                            user { name }
                            issue {
                                title iid
                                labels { nodes { title } }
                                timeEstimate
                                totalTimeSpent
                            }
                            spentAt
                            timeSpent
                        }
                        pageInfo { hasNextPage endCursor }
                    }
                }
            }
        `);

        const timelogsData = data?.group?.timelogs;
        if (!timelogsData) break;
        allTimelogs = [...allTimelogs, ...timelogsData.nodes];
        hasNextPage = timelogsData.pageInfo.hasNextPage;
        endCursor = timelogsData.pageInfo.endCursor;
    }

    return allTimelogs;
}

async function fetchTimelogsForUser(groupPath: string, username: string, startDate: Date, endDate: Date): Promise<Timelog[]> {
    let allTimelogs: Timelog[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${groupPath}") {
                    timelogs(
                        first: 100,
                        after: ${endCursor ? `"${endCursor}"` : 'null'},
                        startDate: "${startDate.toISOString()}",
                        endDate: "${endDate.toISOString()}",
                        username: "${username}"
                    ) {
                        nodes {
                            user { name }
                            issue {
                                title iid
                                labels { nodes { title } }
                                timeEstimate
                                totalTimeSpent
                            }
                            spentAt
                            timeSpent
                        }
                        pageInfo { hasNextPage endCursor }
                    }
                }
            }
        `);

        const timelogsData = data?.group?.timelogs;
        if (!timelogsData) break;
        allTimelogs = [...allTimelogs, ...timelogsData.nodes];
        hasNextPage = timelogsData.pageInfo.hasNextPage;
        endCursor = timelogsData.pageInfo.endCursor;
    }

    return allTimelogs;
}

export async function fetchAllTimelogs(startDate: Date, endDate: Date, groupPaths?: string[]): Promise<Timelog[]> {
    const paths = groupPaths ?? GITLAB_CONFIG.GROUP_PATHS;
    const ownPaths = GITLAB_CONFIG.GROUP_PATHS;

    const results = await Promise.all(
        paths.map(path => {
            // for own group: filter by known team members to avoid noise from non-members
            if ((ownPaths as readonly string[]).includes(path)) {
                return Promise.all(
                    TEAM_MEMBERS.map(username => fetchTimelogsForUser(path, username, startDate, endDate))
                ).then(r => r.flat());
            }
            // for other groups: fetch all timelogs without username filter
            return fetchTimelogsForGroup(path, startDate, endDate);
        })
    );
    return results.flat();
}

async function fetchEpicsForGroup(groupPath: string): Promise<Epic[]> {
    let allEpics: Epic[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${groupPath}") {
                    epics(first: 50, after: ${endCursor ? `"${endCursor}"` : 'null'}) {
                        nodes {
                            id iid title state createdAt closedAt
                            parent { id }
                            issues {
                                nodes {
                                    title iid state
                                    labels { nodes { title } }
                                    timeEstimate totalTimeSpent
                                }
                            }
                        }
                        pageInfo { hasNextPage endCursor }
                    }
                }
            }
        `);

        const epicsData = data?.group?.epics;
        if (!epicsData) break;
        allEpics = [...allEpics, ...epicsData.nodes];
        hasNextPage = epicsData.pageInfo.hasNextPage;
        endCursor = epicsData.pageInfo.endCursor;
    }

    const epicMap = new Map<string, Epic & { parent?: { id: string } }>(
        allEpics.map(e => [e.id, { ...e, children: { nodes: [] } }])
    );

    const roots: Epic[] = [];
    epicMap.forEach(epic => {
        const parent = (epic as Epic & { parent?: { id: string } }).parent;
        if (parent?.id && epicMap.has(parent.id)) {
            epicMap.get(parent.id)!.children.nodes.push(epic);
        } else {
            roots.push(epic);
        }
    });

    return roots;
}

export async function fetchEpics(groupPaths?: string[]): Promise<Epic[]> {
    const paths = groupPaths ?? GITLAB_CONFIG.GROUP_PATHS;
    const results = await Promise.all(paths.map(path => fetchEpicsForGroup(path)));
    return results.flat();
}

async function fetchMergeRequestsForGroup(groupPath: string): Promise<MergeRequest[]> {
    let allMRs: MergeRequest[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${groupPath}") {
                    mergeRequests(first: 100, after: ${endCursor ? `"${endCursor}"` : 'null'}) {
                        nodes {
                            iid title state createdAt mergedAt webUrl
                            author { name username }
                            reviewers { nodes { name username } }
                            labels { nodes { title } }
                        }
                        pageInfo { hasNextPage endCursor }
                    }
                }
            }
        `);

        const mrData = data?.group?.mergeRequests;
        if (!mrData) break;
        allMRs = [...allMRs, ...mrData.nodes];
        hasNextPage = mrData.pageInfo.hasNextPage;
        endCursor = mrData.pageInfo.endCursor;
    }

    return allMRs;
}

export async function fetchMergeRequests(groupPaths?: string[]): Promise<MergeRequest[]> {
    const paths = groupPaths ?? GITLAB_CONFIG.GROUP_PATHS;
    const results = await Promise.all(paths.map(path => fetchMergeRequestsForGroup(path)));
    return results.flat();
}

export async function fetchIssueNotes(groupPath: string, issueIid: string): Promise<Array<{ body: string; createdAt: string; author: { username: string; name: string } }>> {
    const data = await graphql(`
        {
            project(fullPath: "${groupPath}") {
                issue(iid: "${issueIid}") {
                    notes(first: 100) {
                        nodes { body createdAt author { username name } }
                    }
                }
            }
        }
    `);
    return data?.project?.issue?.notes?.nodes ?? [];
}
