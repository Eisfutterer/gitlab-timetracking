import { NextResponse, NextRequest } from 'next/server';
import { GITLAB_CONFIG } from '@/config/dashboardConfig';

export const dynamic = 'force-dynamic';

const TOKEN = process.env.GITLAB_TOKEN ?? '';

export interface SystemStatus {
    gitlab: {
        reachable: boolean;
        responseMs: number | null;
        httpStatus: number | null;
        tokenValid: boolean;
    };
    scope: {
        label: string;          // human-readable scope: a group path or "Alle Gruppen"
        allGroups: boolean;
    };
    data: {
        issues: number | null;
        epics: number | null;
        members: number | null;
    };
    app: {
        checkedAt: string;
        nodeVersion: string;
        environment: string;
        commit: string | null;
    };
    error: string | null;
}

type Counts = { issues: number | null; epics: number | null; members: number | null };

interface ProbeResult {
    reachable: boolean;
    responseMs: number | null;
    httpStatus: number | null;
    tokenValid: boolean;
    counts: Counts;
    error: string | null;
}

// A GraphQL fragment of the per-group fields we count.
const GROUP_FIELDS = `
    issues { count }
    epics { count }
    groupMembers(relations: [DIRECT], first: 100) { nodes { id } }
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGroupCounts(g: any): Counts {
    return {
        issues: g?.issues?.count ?? null,
        epics: g?.epics?.count ?? null,
        members: Array.isArray(g?.groupMembers?.nodes) ? g.groupMembers.nodes.length : null,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sumCounts(groups: any[]): Counts {
    let issues = 0, epics = 0, members = 0;
    for (const g of groups) {
        const c = parseGroupCounts(g);
        issues += c.issues ?? 0;
        epics += c.epics ?? 0;
        members += c.members ?? 0;
    }
    return { issues, epics, members };
}

/**
 * Probe GitLab for the given scope.
 * - a specific `groupPath` → counts for that group only
 * - no groupPath → aggregate across all descendant groups of the parent (matches "Alle Gruppen")
 */
async function probeGitLab(groupPath: string | null): Promise<ProbeResult> {
    const query = groupPath
        ? `{ group(fullPath: "${groupPath}") { ${GROUP_FIELDS} } }`
        : `{ group(fullPath: "${GITLAB_CONFIG.PARENT_GROUP_PATH}") {
               descendantGroups(first: 50) { nodes { ${GROUP_FIELDS} } }
           } }`;

    const start = Date.now();
    try {
        const res = await fetch(GITLAB_CONFIG.API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
            cache: 'no-store',
        });
        const responseMs = Date.now() - start;
        const tokenValid = res.status !== 401 && res.status !== 403;
        const emptyCounts: Counts = { issues: null, epics: null, members: null };

        if (!res.ok) {
            return { reachable: true, responseMs, httpStatus: res.status, tokenValid, counts: emptyCounts, error: `GitLab API ${res.status}` };
        }

        const json = await res.json();
        if (json.errors) {
            return { reachable: true, responseMs, httpStatus: res.status, tokenValid, counts: emptyCounts, error: json.errors[0]?.message ?? 'GraphQL error' };
        }

        const counts = groupPath
            ? parseGroupCounts(json.data?.group)
            : sumCounts(json.data?.group?.descendantGroups?.nodes ?? []);

        return { reachable: true, responseMs, httpStatus: res.status, tokenValid: true, counts, error: null };
    } catch (err) {
        return { reachable: false, responseMs: null, httpStatus: null, tokenValid: false, counts: { issues: null, epics: null, members: null }, error: String(err) };
    }
}

export async function GET(req: NextRequest) {
    const groupParam = req.nextUrl.searchParams.get('group');
    const groupPath = groupParam && groupParam.trim() ? groupParam.trim() : null;

    const probe = await probeGitLab(groupPath);

    const status: SystemStatus = {
        gitlab: {
            reachable: probe.reachable,
            responseMs: probe.responseMs,
            httpStatus: probe.httpStatus,
            tokenValid: probe.tokenValid,
        },
        scope: {
            label: groupPath ? groupPath.split('/').pop()! : 'Alle Gruppen',
            allGroups: !groupPath,
        },
        data: probe.counts,
        app: {
            checkedAt: new Date().toISOString(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV ?? 'unknown',
            commit: process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
        },
        error: probe.error,
    };

    return NextResponse.json(status);
}
