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
        cache: 'no-store',
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitLab API ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
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
                        nodes { name fullPath }
                    }
                }
            }
        `);

        const groups: Array<{ name: string; fullPath: string }> =
            data?.group?.descendantGroups?.nodes ?? [];

        const START = '2026-09-01';
        const END = '2027-09-01';
        const results: GroupSummary[] = [];

        async function fetchAllTimelogsForGroup(fullPath: string): Promise<number> {
            let totalSeconds = 0;
            let hasNextPage = true;
            let endCursor: string | null = null;

            while (hasNextPage) {
                const gData = await graphql(`
                    {
                        group(fullPath: "${fullPath}") {
                            timelogs(
                                first: 100,
                                after: ${endCursor ? `"${endCursor}"` : 'null'},
                                startDate: "${START}",
                                endDate: "${END}"
                            ) {
                                nodes { timeSpent }
                                pageInfo { hasNextPage endCursor }
                            }
                        }
                    }
                `);

                const tl = gData?.group?.timelogs;
                if (!tl) break;
                tl.nodes.forEach((n: { timeSpent: number }) => { totalSeconds += n.timeSpent; });
                hasNextPage = tl.pageInfo.hasNextPage;
                endCursor = tl.pageInfo.endCursor;
            }

            return totalSeconds;
        }

        for (let i = 0; i < groups.length; i += 3) {
            const batch = groups.slice(i, i + 3);
            const batchResults = await Promise.allSettled(
                batch.map(async (g) => {
                    const totalSeconds = await fetchAllTimelogsForGroup(g.fullPath);
                    return {
                        name: g.name,
                        fullPath: g.fullPath,
                        totalHours: totalSeconds / 3600,
                        memberCount: 0,
                        issueCount: 0,
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
