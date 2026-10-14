import { GITLAB_CONFIG, TEAM_MEMBERS } from '@/config/dashboardConfig';
import { Issue, Timelog } from '@/types/dashboard';

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
        cache: 'no-store',
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
