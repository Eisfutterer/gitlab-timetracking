import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    fetchAllGroupPaths,
    fetchGroupMembers,
    fetchAllIssues,
    fetchAllTimelogs,
    fetchEpics,
    fetchMergeRequests,
    fetchIssueNotes,
} from '@/lib/gitlab';
import { GITLAB_CONFIG } from '@/config/dashboardConfig';

/** Build an ok fetch Response whose json() resolves to { data }. */
function ok(data: unknown) {
    return { ok: true, json: async () => ({ data }) };
}
/** Build an ok fetch Response carrying GraphQL-level errors. */
function gqlErrors(messages: string[]) {
    return { ok: true, json: async () => ({ errors: messages.map(m => ({ message: m })) }) };
}

type FetchMock = ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
});

function fetchMock(): FetchMock {
    return global.fetch as unknown as FetchMock;
}

// ── fetchAllGroupPaths ────────────────────────────────────────────────────────
describe('fetchAllGroupPaths', () => {
    it('returns descendant group paths when present', async () => {
        fetchMock().mockResolvedValueOnce(
            ok({ group: { descendantGroups: { nodes: [{ fullPath: 'a/b' }, { fullPath: 'a/c' }] } } })
        );
        await expect(fetchAllGroupPaths()).resolves.toEqual(['a/b', 'a/c']);
    });

    it('falls back to GITLAB_CONFIG.GROUP_PATHS when descendantGroups is empty', async () => {
        fetchMock().mockResolvedValueOnce(ok({ group: { descendantGroups: { nodes: [] } } }));
        await expect(fetchAllGroupPaths()).resolves.toEqual([...GITLAB_CONFIG.GROUP_PATHS]);
    });

    it('falls back when group is null', async () => {
        fetchMock().mockResolvedValueOnce(ok({ group: null }));
        await expect(fetchAllGroupPaths()).resolves.toEqual([...GITLAB_CONFIG.GROUP_PATHS]);
    });
});

// ── fetchGroupMembers ─────────────────────────────────────────────────────────
describe('fetchGroupMembers', () => {
    it('maps users and filters out usernames containing "_bot_"', async () => {
        fetchMock().mockResolvedValueOnce(
            ok({
                group: {
                    groupMembers: {
                        nodes: [
                            { user: { name: 'Alice', username: 'alice' } },
                            { user: { name: 'Bot', username: 'project_12_bot_abc' } },
                            { user: { name: 'Bob', username: 'bob' } },
                        ],
                    },
                },
            })
        );
        const members = await fetchGroupMembers('g/path');
        expect(members).toEqual([
            { name: 'Alice', username: 'alice' },
            { name: 'Bob', username: 'bob' },
        ]);
    });

    it('returns [] when the query returns no members', async () => {
        fetchMock().mockResolvedValueOnce(ok({ group: { groupMembers: { nodes: [] } } }));
        await expect(fetchGroupMembers('g/path')).resolves.toEqual([]);
    });

    it('returns [] (swallows error) when fetch rejects / throws internally', async () => {
        fetchMock().mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });
        await expect(fetchGroupMembers('g/path')).resolves.toEqual([]);
    });
});

// ── graphql error paths ─────────────────────────────────────────────────────
describe('graphql error handling', () => {
    it('throws when the HTTP response is not ok', async () => {
        fetchMock().mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' });
        await expect(fetchAllIssues(['g/path'])).rejects.toThrow(/GitLab API 401/);
    });

    it('throws the first GraphQL error message when json.errors is present', async () => {
        fetchMock().mockResolvedValueOnce(gqlErrors(['Field "x" doesn\'t exist']));
        await expect(fetchAllIssues(['g/path'])).rejects.toThrow(/Field "x"/);
    });
});

// ── fetchAllIssues + pagination ───────────────────────────────────────────────
describe('fetchAllIssues', () => {
    it('paginates across two pages (hasNextPage true → false) using endCursor', async () => {
        fetchMock()
            .mockResolvedValueOnce(
                ok({
                    group: {
                        issues: {
                            nodes: [{ iid: '1' }, { iid: '2' }],
                            pageInfo: { hasNextPage: true, endCursor: 'CUR1' },
                        },
                    },
                })
            )
            .mockResolvedValueOnce(
                ok({
                    group: {
                        issues: {
                            nodes: [{ iid: '3' }],
                            pageInfo: { hasNextPage: false, endCursor: null },
                        },
                    },
                })
            );
        const issues = await fetchAllIssues(['g/path']);
        expect(issues.map(i => i.iid)).toEqual(['1', '2', '3']);
        // Second call must carry the first page's endCursor.
        const secondBody = JSON.parse((fetchMock().mock.calls[1][1] as RequestInit).body as string);
        expect(secondBody.query).toContain('CUR1');
    });

    it('breaks out of the loop when group.issues is missing', async () => {
        fetchMock().mockResolvedValueOnce(ok({ group: {} }));
        await expect(fetchAllIssues(['g/path'])).resolves.toEqual([]);
    });

    it('flattens results across multiple groups and defaults to GROUP_PATHS', async () => {
        fetchMock()
            .mockResolvedValueOnce(ok({ group: { issues: { nodes: [{ iid: 'a' }], pageInfo: { hasNextPage: false, endCursor: null } } } }));
        const issues = await fetchAllIssues();
        expect(issues.map(i => i.iid)).toEqual(['a']);
        expect(fetchMock()).toHaveBeenCalledTimes(GITLAB_CONFIG.GROUP_PATHS.length);
    });
});

// ── fetchAllTimelogs branch logic ─────────────────────────────────────────────
describe('fetchAllTimelogs', () => {
    const from = new Date('2026-11-01T00:00:00Z');
    const to = new Date('2026-11-30T00:00:00Z');

    it('fetches per-group when no membersByGroup provided', async () => {
        fetchMock().mockResolvedValueOnce(
            ok({ group: { timelogs: { nodes: [{ timeSpent: 60 }], pageInfo: { hasNextPage: false, endCursor: null } } } })
        );
        const logs = await fetchAllTimelogs(from, to, ['g/path']);
        expect(logs).toHaveLength(1);
        // No username argument in the per-group query.
        const body = JSON.parse((fetchMock().mock.calls[0][1] as RequestInit).body as string);
        expect(body.query).not.toContain('username:');
    });

    it('fetches per-user when membersByGroup has members, flattening across users', async () => {
        const members = { 'g/path': [{ name: 'A', username: 'a' }, { name: 'B', username: 'b' }] };
        fetchMock()
            .mockResolvedValueOnce(ok({ group: { timelogs: { nodes: [{ timeSpent: 10 }], pageInfo: { hasNextPage: false, endCursor: null } } } }))
            .mockResolvedValueOnce(ok({ group: { timelogs: { nodes: [{ timeSpent: 20 }], pageInfo: { hasNextPage: false, endCursor: null } } } }));
        const logs = await fetchAllTimelogs(from, to, ['g/path'], members);
        expect(logs.map(l => l.timeSpent).sort()).toEqual([10, 20]);
        expect(fetchMock()).toHaveBeenCalledTimes(2);
        const body = JSON.parse((fetchMock().mock.calls[0][1] as RequestInit).body as string);
        expect(body.query).toContain('username:');
    });

    it('falls back to per-group when the group has an empty member list', async () => {
        const members = { 'g/path': [] as { name: string; username: string }[] };
        fetchMock().mockResolvedValueOnce(
            ok({ group: { timelogs: { nodes: [{ timeSpent: 5 }], pageInfo: { hasNextPage: false, endCursor: null } } } })
        );
        const logs = await fetchAllTimelogs(from, to, ['g/path'], members);
        expect(logs).toHaveLength(1);
        const body = JSON.parse((fetchMock().mock.calls[0][1] as RequestInit).body as string);
        expect(body.query).not.toContain('username:');
    });

    it('breaks when group.timelogs is missing', async () => {
        fetchMock().mockResolvedValueOnce(ok({ group: {} }));
        await expect(fetchAllTimelogs(from, to, ['g/path'])).resolves.toEqual([]);
    });
});

// ── fetchEpics reparenting ────────────────────────────────────────────────────
describe('fetchEpics', () => {
    it('reparents children under their parent and returns only roots', async () => {
        fetchMock().mockResolvedValueOnce(
            ok({
                group: {
                    epics: {
                        nodes: [
                            { id: 'gid://Epic/1', iid: '1', title: 'Root', issues: { nodes: [] } },
                            { id: 'gid://Epic/2', iid: '2', title: 'Child', parent: { id: 'gid://Epic/1' }, issues: { nodes: [] } },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            })
        );
        const epics = await fetchEpics(['g/path']);
        expect(epics).toHaveLength(1);
        expect(epics[0].id).toBe('gid://Epic/1');
        expect(epics[0].children.nodes).toHaveLength(1);
        expect(epics[0].children.nodes[0].id).toBe('gid://Epic/2');
    });

    it('treats an epic whose parent is not in the set as a root', async () => {
        fetchMock().mockResolvedValueOnce(
            ok({
                group: {
                    epics: {
                        nodes: [
                            { id: 'gid://Epic/9', iid: '9', title: 'Orphan', parent: { id: 'gid://Epic/999' }, issues: { nodes: [] } },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            })
        );
        const epics = await fetchEpics(['g/path']);
        expect(epics.map(e => e.id)).toEqual(['gid://Epic/9']);
    });

    it('paginates epics over two pages', async () => {
        fetchMock()
            .mockResolvedValueOnce(
                ok({ group: { epics: { nodes: [{ id: 'e1', iid: '1', issues: { nodes: [] } }], pageInfo: { hasNextPage: true, endCursor: 'EC1' } } } })
            )
            .mockResolvedValueOnce(
                ok({ group: { epics: { nodes: [{ id: 'e2', iid: '2', issues: { nodes: [] } }], pageInfo: { hasNextPage: false, endCursor: null } } } })
            );
        const epics = await fetchEpics(['g/path']);
        expect(epics.map(e => e.id).sort()).toEqual(['e1', 'e2']);
    });

    it('breaks when group.epics is missing (returns empty roots)', async () => {
        fetchMock().mockResolvedValueOnce(ok({ group: {} }));
        await expect(fetchEpics(['g/path'])).resolves.toEqual([]);
    });
});

// ── fetchMergeRequests ────────────────────────────────────────────────────────
describe('fetchMergeRequests', () => {
    it('returns merge requests and paginates', async () => {
        fetchMock()
            .mockResolvedValueOnce(
                ok({ group: { mergeRequests: { nodes: [{ iid: '1' }], pageInfo: { hasNextPage: true, endCursor: 'M1' } } } })
            )
            .mockResolvedValueOnce(
                ok({ group: { mergeRequests: { nodes: [{ iid: '2' }], pageInfo: { hasNextPage: false, endCursor: null } } } })
            );
        const mrs = await fetchMergeRequests(['g/path']);
        expect(mrs.map(m => m.iid)).toEqual(['1', '2']);
    });

    it('breaks when group.mergeRequests is missing', async () => {
        fetchMock().mockResolvedValueOnce(ok({ group: {} }));
        await expect(fetchMergeRequests(['g/path'])).resolves.toEqual([]);
    });
});

// ── fetchIssueNotes ───────────────────────────────────────────────────────────
describe('fetchIssueNotes', () => {
    it('returns note nodes for an issue', async () => {
        fetchMock().mockResolvedValueOnce(
            ok({
                project: {
                    issue: {
                        notes: { nodes: [{ body: '/spend 1h', createdAt: '2026-11-03', author: { username: 'a', name: 'A' } }] },
                    },
                },
            })
        );
        const notes = await fetchIssueNotes('g/project', '1');
        expect(notes).toHaveLength(1);
        expect(notes[0].body).toBe('/spend 1h');
    });

    it('returns [] when the issue / notes are absent', async () => {
        fetchMock().mockResolvedValueOnce(ok({ project: { issue: null } }));
        await expect(fetchIssueNotes('g/project', '1')).resolves.toEqual([]);
    });
});
