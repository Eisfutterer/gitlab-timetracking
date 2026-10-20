import { NextResponse } from 'next/server';
import { GITLAB_CONFIG } from '@/config/dashboardConfig';

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

export interface GroupSummary {
    name: string;
    fullPath: string;
    totalHours: number;
    memberCount: number;
    issueCount: number;
}

export async function GET() {
    try {
        const data = await graphql(`
            {
                group(fullPath: "${GITLAB_CONFIG.PARENT_GROUP_PATH}") {
                    descendantGroups(first: 30) {
                        nodes {
                            name
                            fullPath
                        }
                    }
                }
            }
        `);

        const groups: Array<{ name: string; fullPath: string }> =
            data?.group?.descendantGroups?.nodes ?? [];

        // Fetch timelog totals for each group in batches of 3
        const results: GroupSummary[] = [];
        const START = '2026-09-01T00:00:00Z';
        const END = '2027-09-01T00:00:00Z';

        for (let i = 0; i < groups.length; i += 3) {
            const batch = groups.slice(i, i + 3);
            const batchResults = await Promise.allSettled(
                batch.map(async (g) => {
                    const gData = await graphql(`
                        {
                            group(fullPath: "${g.fullPath}") {
                                timelogs(first: 1, startDate: "${START}", endDate: "${END}") {
                                    totalCount
                                }
                                issues(first: 1) {
                                    totalCount
                                }
                            }
                        }
                    `);

                    const timelogs = await graphql(`
                        {
                            group(fullPath: "${g.fullPath}") {
                                timelogs(first: 500, startDate: "${START}", endDate: "${END}") {
                                    nodes { timeSpent }
                                    pageInfo { hasNextPage }
                                }
                                members { totalCount }
                            }
                        }
                    `);

                    const nodes: Array<{ timeSpent: number }> = timelogs?.group?.timelogs?.nodes ?? [];
                    const totalSeconds = nodes.reduce((s: number, n: { timeSpent: number }) => s + n.timeSpent, 0);

                    return {
                        name: g.name,
                        fullPath: g.fullPath,
                        totalHours: totalSeconds / 3600,
                        memberCount: timelogs?.group?.members?.totalCount ?? 0,
                        issueCount: gData?.group?.issues?.totalCount ?? 0,
                    } satisfies GroupSummary;
                })
            );

            batchResults.forEach(r => {
                if (r.status === 'fulfilled') results.push(r.value);
            });
        }

        results.sort((a, b) => b.totalHours - a.totalHours);

        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
