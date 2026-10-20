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

export async function fetchAllIssues(): Promise<Issue[]> {
    let allIssues: Issue[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${GITLAB_CONFIG.GROUP_PATH}") {
                    issues(first: 100, after: ${endCursor ? `"${endCursor}"` : 'null'}) {
                        nodes {
                            title
                            iid
                            labels { nodes { title } }
                            timeEstimate
                            totalTimeSpent
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }
        `);

        const issuesData = data.group.issues;
        allIssues = [...allIssues, ...issuesData.nodes];
        hasNextPage = issuesData.pageInfo.hasNextPage;
        endCursor = issuesData.pageInfo.endCursor;
    }

    return allIssues;
}

export async function fetchAllTimelogs(startDate: Date, endDate: Date): Promise<Timelog[]> {
    const results = await Promise.all(
        TEAM_MEMBERS.map(username => fetchTimelogsForUser(username, startDate, endDate))
    );
    return results.flat();
}

async function fetchTimelogsForUser(username: string, startDate: Date, endDate: Date): Promise<Timelog[]> {
    let allTimelogs: Timelog[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${GITLAB_CONFIG.GROUP_PATH}") {
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
                                title
                                iid
                                labels { nodes { title } }
                                timeEstimate
                                totalTimeSpent
                            }
                            spentAt
                            timeSpent
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }
        `);

        const timelogsData = data.group.timelogs;
        allTimelogs = [...allTimelogs, ...timelogsData.nodes];
        hasNextPage = timelogsData.pageInfo.hasNextPage;
        endCursor = timelogsData.pageInfo.endCursor;
    }

    return allTimelogs;
}

export async function fetchEpics(): Promise<Epic[]> {
    let allEpics: Epic[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${GITLAB_CONFIG.GROUP_PATH}") {
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

        const epicsData = data.group.epics;
        allEpics = [...allEpics, ...epicsData.nodes];
        hasNextPage = epicsData.pageInfo.hasNextPage;
        endCursor = epicsData.pageInfo.endCursor;
    }

    // Build tree from flat list using parent references
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

export async function fetchMergeRequests(): Promise<MergeRequest[]> {
    let allMRs: MergeRequest[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;

    while (hasNextPage) {
        const data = await graphql(`
            {
                group(fullPath: "${GITLAB_CONFIG.GROUP_PATH}") {
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

        const mrData = data.group.mergeRequests;
        allMRs = [...allMRs, ...mrData.nodes];
        hasNextPage = mrData.pageInfo.hasNextPage;
        endCursor = mrData.pageInfo.endCursor;
    }

    return allMRs;
}
