import type { Issue, Timelog, Epic, EpicIssue, Milestone, MergeRequest } from '@/types/dashboard';

export function makeMilestone(o: Partial<Milestone> = {}): Milestone {
    return {
        title: 'Milestone A',
        startDate: '2026-11-03',
        dueDate: '2026-11-09',
        webPath: '/group/-/milestones/1',
        ...o,
    };
}

export function makeIssue(o: Partial<Issue> = {}): Issue {
    return {
        title: 'Some issue',
        timeEstimate: 3600,
        totalTimeSpent: 1800,
        category: 'Implementierung',
        iid: '1',
        webUrl: 'https://gitlab.com/group/project/-/issues/1',
        state: 'opened',
        createdAt: '2026-11-03T08:00:00Z',
        closedAt: null,
        description: null,
        startDate: null,
        dueDate: null,
        assignees: { nodes: [] },
        labels: { nodes: [] },
        milestone: null,
        epic: null,
        ...o,
    };
}

export function makeTimelog(o: Partial<Timelog> = {}): Timelog {
    return {
        user: { name: 'Alice' },
        issue: {
            title: 'Some issue',
            iid: '1',
            webUrl: 'https://gitlab.com/group/project/-/issues/1',
            labels: { nodes: [] },
            timeEstimate: 3600,
            totalTimeSpent: 1800,
        },
        spentAt: '2026-11-03T08:00:00Z',
        timeSpent: 3600,
        ...o,
    };
}

export function makeEpicIssue(o: Partial<EpicIssue> = {}): EpicIssue {
    return {
        title: 'Epic issue',
        iid: '1',
        webUrl: 'https://gitlab.com/group/project/-/issues/1',
        state: 'opened',
        createdAt: '2026-11-03T08:00:00Z',
        closedAt: null,
        startDate: null,
        dueDate: null,
        labels: { nodes: [] },
        assignees: { nodes: [] },
        timeEstimate: 3600,
        totalTimeSpent: 1800,
        ...o,
    };
}

export function makeEpic(o: Partial<Epic> = {}): Epic {
    return {
        id: 'gid://gitlab/Epic/1',
        iid: '1',
        title: 'Epic A',
        state: 'opened',
        createdAt: '2026-11-03T08:00:00Z',
        closedAt: null,
        issues: { nodes: [] },
        children: { nodes: [] },
        ...o,
    };
}

export function makeMergeRequest(o: Partial<MergeRequest> = {}): MergeRequest {
    return {
        iid: '1',
        title: 'MR A',
        state: 'opened',
        createdAt: '2026-11-03T08:00:00Z',
        mergedAt: null,
        author: { name: 'Alice', username: 'alice' },
        reviewers: { nodes: [] },
        labels: { nodes: [] },
        webUrl: 'https://gitlab.com/group/project/-/merge_requests/1',
        ...o,
    };
}

/** Build a label-nodes shape from plain title strings. */
export function labels(...titles: string[]): { nodes: Array<{ title: string }> } {
    return { nodes: titles.map(title => ({ title })) };
}
