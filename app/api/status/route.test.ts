import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/status/route';
import type { SystemStatus } from '@/app/api/status/route';

function mockFetchOnce(impl: () => Promise<Response> | Response) {
    const fn = vi.fn((_url: string | URL, _init?: RequestInit) => impl() as Promise<Response>);
    vi.stubGlobal('fetch', fn);
    return fn;
}

function jsonResponse(body: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown as Response;
}

function req(group?: string): NextRequest {
    const url = group != null
        ? `http://localhost/api/status?group=${encodeURIComponent(group)}`
        : 'http://localhost/api/status';
    return new NextRequest(url);
}

async function callGet(group?: string): Promise<SystemStatus> {
    const res = await GET(req(group));
    return (await res.json()) as SystemStatus;
}

// Build a groupMembers node list from usernames (bots have "_bot_").
function members(...usernames: string[]) {
    return { nodes: usernames.map(username => ({ user: { username } })) };
}

const singleGroupOk = {
    data: { group: { issues: { count: 42 }, epics: { count: 5 }, groupMembers: members('a', 'b', 'c', 'd', 'e', 'f', 'g') } },
};

describe('GET /api/status', () => {
    beforeEach(() => {
        vi.stubEnv('GITLAB_TOKEN', 'test-token');
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    describe('specific group (?group=...)', () => {
        it('reports online with that group\'s counts', async () => {
            const fn = mockFetchOnce(() => jsonResponse(singleGroupOk));
            const s = await callGet('dhbw-se/course/g4');
            expect(s.gitlab.reachable).toBe(true);
            expect(s.gitlab.tokenValid).toBe(true);
            expect(s.gitlab.httpStatus).toBe(200);
            expect(typeof s.gitlab.responseMs).toBe('number');
            expect(s.data).toEqual({ issues: 42, epics: 5, members: 7 });
            expect(s.scope).toEqual({ label: 'g4', allGroups: false });
            expect(s.error).toBeNull();
            // the query must target the specific group, not descendantGroups
            const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
            expect(body.query).toContain('g4');
            expect(body.query).not.toContain('descendantGroups');
        });

        it('excludes bot accounts from the member count', async () => {
            mockFetchOnce(() => jsonResponse({
                data: { group: { issues: { count: 1 }, epics: { count: 1 }, groupMembers: members('alice', 'bob', 'project_123_bot_abc', 'wiki_bot_xyz') } },
            }));
            const s = await callGet('g4');
            // 4 members, 2 are bots → 2 real members
            expect(s.data.members).toBe(2);
        });

        it('handles members with no username defensively', async () => {
            mockFetchOnce(() => jsonResponse({
                data: { group: { issues: { count: 0 }, epics: { count: 0 }, groupMembers: { nodes: [{ user: null }, { user: { username: 'real' } }] } } },
            }));
            const s = await callGet('g4');
            // null user is kept (not a bot); counts as a member
            expect(s.data.members).toBe(2);
        });

        it('whitespace-only group is treated as "all groups"', async () => {
            mockFetchOnce(() => jsonResponse({ data: { group: { descendantGroups: { nodes: [] } } } }));
            const s = await callGet('   ');
            expect(s.scope.allGroups).toBe(true);
            expect(s.scope.label).toBe('Alle Gruppen');
        });
    });

    describe('all groups (no group param)', () => {
        it('aggregates counts across descendant groups', async () => {
            const fn = mockFetchOnce(() => jsonResponse({
                data: {
                    group: {
                        descendantGroups: {
                            nodes: [
                                { issues: { count: 10 }, epics: { count: 2 }, groupMembers: members('a', 'b') },
                                { issues: { count: 5 }, epics: { count: 1 }, groupMembers: members('c') },
                            ],
                        },
                    },
                },
            }));
            const s = await callGet();
            expect(s.data).toEqual({ issues: 15, epics: 3, members: 3 });
            expect(s.scope).toEqual({ label: 'Alle Gruppen', allGroups: true });
            const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
            expect(body.query).toContain('descendantGroups');
        });

        it('handles an empty descendant list as zeros', async () => {
            mockFetchOnce(() => jsonResponse({ data: { group: { descendantGroups: { nodes: [] } } } }));
            const s = await callGet();
            expect(s.data).toEqual({ issues: 0, epics: 0, members: 0 });
        });

        it('treats missing counts in a group as zero when aggregating', async () => {
            mockFetchOnce(() => jsonResponse({
                data: { group: { descendantGroups: { nodes: [{ issues: null, epics: null, groupMembers: null }] } } },
            }));
            const s = await callGet();
            expect(s.data).toEqual({ issues: 0, epics: 0, members: 0 });
        });
    });

    describe('error & token handling', () => {
        it('marks token invalid on HTTP 401 but still reachable', async () => {
            mockFetchOnce(() => jsonResponse({ message: 'unauthorized' }, 401));
            const s = await callGet('g4');
            expect(s.gitlab.reachable).toBe(true);
            expect(s.gitlab.tokenValid).toBe(false);
            expect(s.gitlab.httpStatus).toBe(401);
            expect(s.data).toEqual({ issues: null, epics: null, members: null });
            expect(s.error).toContain('401');
        });

        it('marks token invalid on HTTP 403', async () => {
            mockFetchOnce(() => jsonResponse({ message: 'forbidden' }, 403));
            const s = await callGet('g4');
            expect(s.gitlab.tokenValid).toBe(false);
            expect(s.gitlab.httpStatus).toBe(403);
        });

        it('treats a 500 as reachable with valid token but surfaces error', async () => {
            mockFetchOnce(() => jsonResponse({ message: 'boom' }, 500));
            const s = await callGet('g4');
            expect(s.gitlab.reachable).toBe(true);
            expect(s.gitlab.tokenValid).toBe(true);
            expect(s.gitlab.httpStatus).toBe(500);
            expect(s.error).toContain('500');
        });

        it('surfaces GraphQL errors while staying reachable', async () => {
            mockFetchOnce(() => jsonResponse({ errors: [{ message: 'field x does not exist' }] }));
            const s = await callGet('g4');
            expect(s.gitlab.reachable).toBe(true);
            expect(s.data).toEqual({ issues: null, epics: null, members: null });
            expect(s.error).toBe('field x does not exist');
        });

        it('falls back to a generic message when GraphQL error has no message', async () => {
            mockFetchOnce(() => jsonResponse({ errors: [{}] }));
            const s = await callGet('g4');
            expect(s.error).toBe('GraphQL error');
        });

        it('reports offline when fetch throws (network failure)', async () => {
            mockFetchOnce(() => { throw new Error('ECONNREFUSED'); });
            const s = await callGet('g4');
            expect(s.gitlab.reachable).toBe(false);
            expect(s.gitlab.responseMs).toBeNull();
            expect(s.gitlab.httpStatus).toBeNull();
            expect(s.gitlab.tokenValid).toBe(false);
            expect(s.error).toContain('ECONNREFUSED');
        });

        it('handles a null group payload (counts null)', async () => {
            mockFetchOnce(() => jsonResponse({ data: { group: null } }));
            const s = await callGet('g4');
            expect(s.data).toEqual({ issues: null, epics: null, members: null });
            expect(s.gitlab.tokenValid).toBe(true);
        });
    });

    describe('app metadata', () => {
        it('includes a commit from GIT_COMMIT when set', async () => {
            vi.stubEnv('GIT_COMMIT', 'abc1234');
            mockFetchOnce(() => jsonResponse(singleGroupOk));
            const s = await callGet('g4');
            expect(s.app.commit).toBe('abc1234');
            expect(s.app.nodeVersion).toBe(process.version);
        });

        it('commit is null when no commit env is set', async () => {
            vi.stubEnv('GIT_COMMIT', '');
            vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
            mockFetchOnce(() => jsonResponse(singleGroupOk));
            const s = await callGet('g4');
            expect(s.app.commit).toBeNull();
        });
    });
});
