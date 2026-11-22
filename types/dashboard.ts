export interface Milestone {
    title: string;
    startDate: string | null;
    dueDate: string | null;
    webPath: string | null;
}

export interface Issue {
    title: string;
    timeEstimate: number;
    totalTimeSpent: number;
    category: string;
    iid: string;
    webUrl: string;
    state: 'opened' | 'closed';
    createdAt: string;
    closedAt: string | null;
    description: string | null;
    startDate: string | null;
    dueDate: string | null;
    assignees: { nodes: Array<{ name: string; username: string }> };
    labels: {
        nodes: Array<{title: string}>;
    };
    milestone: Milestone | null;
    epic: { iid: string; title: string } | null;
}

export interface EpicIssue {
    title: string;
    iid: string;
    webUrl: string;
    state: 'opened' | 'closed';
    createdAt: string;
    closedAt: string | null;
    startDate: string | null;
    dueDate: string | null;
    milestone: Milestone | null;
    labels: { nodes: Array<{title: string}> };
    assignees: { nodes: Array<{ name: string; username: string }> };
    timeEstimate: number;
    totalTimeSpent: number;
}

export interface Epic {
    id: string;
    iid: string;
    title: string;
    webUrl: string;
    state: 'opened' | 'closed';
    createdAt: string;
    closedAt: string | null;
    issues: { nodes: EpicIssue[] };
    children: { nodes: Epic[] };
}

export interface Timelog {
    user: { name: string };
    issue: {
        title: string;
        iid: string;
        webUrl: string;
        labels: { nodes: Array<{title: string}> };
        timeEstimate: number;
        totalTimeSpent: number;
    } | null;
    spentAt: string;
    timeSpent: number;
}

export interface ProjectMetrics {
    sprintData: Array<{
        sprintStart: string;
        sprintEnd: string;
        totalHours: number;
        categoryHours: Record<string, number>;
        userHours: Record<string, number>;
        sprintNumber: number;
    }>;
    totalSprints: number;
    averageVelocity: number;
    categoryDistribution: Array<{category: string; hours: number}>;
}

export interface ProductivityPatterns {
    hourlyData: Array<{hour: string; value: number}>;
    weeklyData: Array<{day: string; value: number}>;
    peakHour: {hour: string; value: number};
    peakDay: {day: string; value: number};
}

export interface CollaborationData {
    source: string;
    target: string;
    value: number;
}

export interface AverageTeamMembersData {
    category: string;
    averageMembers: number;
    totalIssues: number;
    totalMembers: number;
}

export interface IssueComplexityData {
    category: string;
    averageTime: number;
    totalIssues: number;
    totalTime: number;
}

export interface HeatmapData {
    date: string;
    value: number;
    day: string;
    month: string;
    week: number;
    year: string;
}

export interface MergeRequest {
    iid: string;
    title: string;
    state: 'opened' | 'closed' | 'merged' | 'locked';
    createdAt: string;
    mergedAt: string | null;
    author: { name: string; username: string } | null;
    reviewers: { nodes: Array<{ name: string; username: string }> };
    labels: { nodes: Array<{ title: string }> };
    webUrl: string;
}

export interface CFDDataPoint {
    date: string;
    opened: number;
    closed: number;
    total: number;
}

export interface LabelTimelinePoint {
    week: string;
    [label: string]: number | string;
}

export interface UserCategoryRow {
    name: string;
    total: number;
    percentage: number;
    [category: string]: number | string;
}

export interface PersonDetail {
    name: string;
    categoryHours: Record<string, number>;
    hoursBySprintNumber: number[];
    focusLastCycle: string;
    focusThisCycle: string;
}
