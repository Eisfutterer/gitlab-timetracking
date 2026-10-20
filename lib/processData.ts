import { format, startOfWeek, getDay, getWeek, addMonths, subMonths, addWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    CATEGORY_MAP,
    CATEGORY_PATTERNS,
    TIME_CONFIG,
    GERMAN_DAYS,
} from '@/config/dashboardConfig';
import {
    Issue,
    Timelog,
    ProjectMetrics,
    ProductivityPatterns,
    CollaborationData,
    AverageTeamMembersData,
    IssueComplexityData,
    HeatmapData,
} from '@/types/dashboard';

export interface ChartData {
    pieData: { name: string; value: number }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lineData: Record<string, any>[];
    barData: { name: string; value: number }[];
    heatmapData: HeatmapData[][];
    projectMetrics: ProjectMetrics;
    averageTeamMembersData: AverageTeamMembersData[];
    issueComplexityData: IssueComplexityData[];
    collaborationData: CollaborationData[];
    productivityPatterns: ProductivityPatterns;
}

export function processChartData(
    issues: Issue[],
    timelogs: Timelog[],
): ChartData {
    function matchCategory(labelTitle: string): string | null {
        for (const { category, pattern } of CATEGORY_PATTERNS) {
            if (pattern.test(labelTitle)) return category;
        }
        // Fallback: exact match
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((CATEGORY_MAP as any)[labelTitle] !== undefined) return labelTitle;
        return null;
    }

    // === 1. Piechart (Kategorie-Zeiten gesamt) ===
    const categoryMap: Record<string, number> = { ...CATEGORY_MAP };

    timelogs.forEach(log => {
        if (log.issue && log.issue.labels && log.issue.labels.nodes) {
            log.issue.labels.nodes.forEach(label => {
                const cat = matchCategory(label.title);
                if (cat !== null) {
                    categoryMap[cat] += log.timeSpent;
                }
            });
        }
    });

    const pieData = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value: value / TIME_CONFIG.SECONDS_PER_HOUR,
    }));

    // === 2. Linechart (Zeit/Woche/Person) ===
    const weeklyMap: Record<string, Record<string, number>> = {};
    timelogs.forEach(log => {
        if (log.issue && log.issue.labels && log.issue.labels.nodes) {
            const week = format(startOfWeek(new Date(log.spentAt)), "'KW' II yyyy");
            const user = log.user.name;
            if (!weeklyMap[week]) weeklyMap[week] = {};
            if (!weeklyMap[week][user]) weeklyMap[week][user] = 0;
            weeklyMap[week][user] += log.timeSpent;
        }
    });

    const lineData = Object.entries(weeklyMap).map(([week, users]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: Record<string, any> = { week };
        Object.entries(users).forEach(([user, time]) => {
            row[user] = time / TIME_CONFIG.SECONDS_PER_HOUR;
        });
        return row;
    });

    // === 3. Barchart (Gesamtzeit/Person) ===
    const userMap: Record<string, number> = {};
    timelogs.forEach(log => {
        const user = log.user.name;
        if (!userMap[user]) userMap[user] = 0;
        userMap[user] += log.timeSpent;
    });

    const barData = Object.entries(userMap).map(([name, value]) => ({
        name,
        value: value / TIME_CONFIG.SECONDS_PER_HOUR,
    }));

    // === Heatmap Data ===
    const heatmapRaw: Record<string, number> = {};
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;

    timelogs.forEach(log => {
        const date = new Date(log.spentAt);
        const dateStr = format(date, 'yyyy-MM-dd');
        if (!firstDate || date < firstDate) firstDate = date;
        if (!lastDate || date > lastDate) lastDate = date;
        if (!heatmapRaw[dateStr]) heatmapRaw[dateStr] = 0;
        heatmapRaw[dateStr] += log.timeSpent;
    });

    if (firstDate && lastDate) {
        firstDate = subMonths(firstDate, 1);
        lastDate = addMonths(lastDate, 1);
    } else {
        lastDate = new Date();
        firstDate = subMonths(lastDate, 6);
    }

    const weeks: HeatmapData[][] = [];
    // eslint-disable-next-line prefer-const
    let currentDate = new Date(firstDate);
    currentDate.setDate(currentDate.getDate() - getDay(currentDate));

    while (currentDate <= lastDate) {
        const week: HeatmapData[] = [];
        for (let i = 0; i < TIME_CONFIG.DAYS_PER_WEEK; i++) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            week.push({
                date: dateStr,
                value: heatmapRaw[dateStr] || 0,
                day: format(currentDate, 'EEEE', { locale: de }),
                month: format(currentDate, 'MMMM', { locale: de }),
                week: getWeek(currentDate),
                year: format(currentDate, 'yyyy'),
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(week);
    }

    // === Sprint / Project Metrics ===
    const sprintData: ProjectMetrics['sprintData'] = [];
    let sprintStart = new Date(firstDate!);
    const sprintEnd_ = new Date(lastDate!);
    const totalCategoryHours: Record<string, number> = { ...CATEGORY_MAP };

    while (sprintStart <= sprintEnd_) {
        const sprintEnd = addWeeks(sprintStart, 1);
        const sprintLogs = timelogs.filter(log => {
            const d = new Date(log.spentAt);
            return d >= sprintStart && d < sprintEnd;
        });

        if (sprintLogs.length > 0) {
            const totalHours = sprintLogs.reduce((s, l) => s + l.timeSpent, 0) / TIME_CONFIG.SECONDS_PER_HOUR;
            const sprintCategoryHours: Record<string, number> = { ...CATEGORY_MAP };

            sprintLogs.forEach(log => {
                if (log.issue && log.issue.labels && log.issue.labels.nodes) {
                    log.issue.labels.nodes.forEach(label => {
                        if (sprintCategoryHours[label.title] !== undefined) {
                            sprintCategoryHours[label.title] += log.timeSpent / TIME_CONFIG.SECONDS_PER_HOUR;
                            totalCategoryHours[label.title] += log.timeSpent / TIME_CONFIG.SECONDS_PER_HOUR;
                        }
                    });
                }
            });

            const userHours: Record<string, number> = {};
            sprintLogs.forEach(log => {
                userHours[log.user.name] = (userHours[log.user.name] || 0) + log.timeSpent / TIME_CONFIG.SECONDS_PER_HOUR;
            });

            sprintData.push({
                sprintStart: format(sprintStart, 'dd.MM.yyyy'),
                sprintEnd: format(sprintEnd, 'dd.MM.yyyy'),
                totalHours,
                categoryHours: sprintCategoryHours,
                userHours,
                sprintNumber: sprintData.length + 1,
            });
        }

        sprintStart = sprintEnd;
    }

    const categoryDistribution = Object.entries(totalCategoryHours).map(([category, hours]) => ({
        category,
        hours: sprintData.length > 0 ? hours / sprintData.length : 0,
    }));

    // === Average Team Members per Issue ===
    const categoryTeamMembers: { [key: string]: Set<string> } = {};
    const categoryIssueCount: { [key: string]: Set<string> } = {};
    const issueTeamMembers: { [key: string]: Set<string> } = {};

    timelogs.forEach(log => {
        if (log.issue && log.issue.labels && log.issue.labels.nodes) {
            const issueId = log.issue.iid;
            log.issue.labels.nodes.forEach(label => {
                const cat = matchCategory(label.title);
                if (cat !== null) {
                    if (!categoryTeamMembers[cat]) {
                        categoryTeamMembers[cat] = new Set<string>();
                        categoryIssueCount[cat] = new Set<string>();
                    }
                    if (!issueTeamMembers[issueId]) {
                        issueTeamMembers[issueId] = new Set<string>();
                    }
                    categoryTeamMembers[cat].add(log.user.name);
                    categoryIssueCount[cat].add(issueId);
                    issueTeamMembers[issueId].add(log.user.name);
                }
            });
        }
    });

    const averageTeamMembersData: AverageTeamMembersData[] = Object.entries(categoryTeamMembers)
        .map(([category, members]) => {
            const issueSet = categoryIssueCount[category];
            let total = 0;
            issueSet.forEach(id => { total += issueTeamMembers[id].size; });
            return {
                category,
                averageMembers: total / issueSet.size,
                totalIssues: issueSet.size,
                totalMembers: members.size,
            };
        })
        .sort((a, b) => b.averageMembers - a.averageMembers);

    // === Issue Complexity ===
    const categoryIssueTime: { [key: string]: { total: number; count: number } } = {};
    const issueTimeMap: { [key: string]: number } = {};

    timelogs.forEach(log => {
        if (log.issue && log.issue.labels && log.issue.labels.nodes) {
            const issueId = log.issue.iid;
            if (!issueTimeMap[issueId]) issueTimeMap[issueId] = 0;
            issueTimeMap[issueId] += log.timeSpent;
            log.issue.labels.nodes.forEach(label => {
                const cat = matchCategory(label.title);
                if (cat !== null) {
                    if (!categoryIssueTime[cat]) {
                        categoryIssueTime[cat] = { total: 0, count: 0 };
                    }
                }
            });
        }
    });

    Object.entries(issueTimeMap).forEach(([issueId, time]) => {
        const issue = timelogs.find(log => log.issue?.iid === issueId)?.issue;
        if (issue?.labels?.nodes) {
            issue.labels.nodes.forEach(label => {
                if (categoryIssueTime[label.title]) {
                    categoryIssueTime[label.title].total += time;
                    categoryIssueTime[label.title].count += 1;
                }
            });
        }
    });

    const issueComplexityData: IssueComplexityData[] = Object.entries(categoryIssueTime)
        .map(([category, data]) => ({
            category,
            averageTime: data.total / data.count / TIME_CONFIG.SECONDS_PER_HOUR,
            totalIssues: data.count,
            totalTime: data.total / TIME_CONFIG.SECONDS_PER_HOUR,
        }))
        .sort((a, b) => b.averageTime - a.averageTime);

    // === Team Collaboration ===
    const collaborationMap: { [key: string]: { [key: string]: number } } = {};
    const issueCollaborations: { [key: string]: Set<string> } = {};

    timelogs.forEach(log => {
        if (log.issue?.iid) {
            if (!issueCollaborations[log.issue.iid]) {
                issueCollaborations[log.issue.iid] = new Set();
            }
            issueCollaborations[log.issue.iid].add(log.user.name);
        }
    });

    Object.values(issueCollaborations).forEach(team => {
        const arr = Array.from(team).sort();
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (!collaborationMap[arr[i]]) collaborationMap[arr[i]] = {};
                collaborationMap[arr[i]][arr[j]] = (collaborationMap[arr[i]][arr[j]] || 0) + 1;
            }
        }
    });

    const collaborationData: CollaborationData[] = Object.entries(collaborationMap)
        .flatMap(([member1, collabs]) =>
            Object.entries(collabs).map(([member2, count]) => ({
                source: member1,
                target: member2,
                value: count,
            }))
        )
        .sort((a, b) => b.value - a.value);

    // === Productivity Patterns ===
    const hourlyPatterns: { [key: number]: number } = {};
    const weeklyPatterns: { [key: number]: number } = {};

    timelogs.forEach(log => {
        const date = new Date(log.spentAt);
        const hour = date.getHours();
        const day = date.getDay();
        hourlyPatterns[hour] = (hourlyPatterns[hour] || 0) + log.timeSpent;
        weeklyPatterns[day] = (weeklyPatterns[day] || 0) + log.timeSpent;
    });

    const hourlyData = Array.from({ length: TIME_CONFIG.HOURS_PER_DAY }, (_, h) => ({
        hour: `${h}:00`,
        value: (hourlyPatterns[h] || 0) / TIME_CONFIG.SECONDS_PER_HOUR,
    }));

    const weeklyData = GERMAN_DAYS.map((day, i) => ({
        day,
        value: (weeklyPatterns[i] || 0) / TIME_CONFIG.SECONDS_PER_HOUR,
    }));

    const peakHour = hourlyData.reduce((max, cur) => cur.value > max.value ? cur : max);
    const peakDay = weeklyData.reduce((max, cur) => cur.value > max.value ? cur : max);

    return {
        pieData,
        lineData,
        barData,
        heatmapData: weeks,
        projectMetrics: {
            sprintData,
            totalSprints: sprintData.length,
            averageVelocity: sprintData.length > 0
                ? sprintData.reduce((s, sp) => s + sp.totalHours, 0) / sprintData.length
                : 0,
            categoryDistribution,
        },
        averageTeamMembersData,
        issueComplexityData,
        collaborationData,
        productivityPatterns: { hourlyData, weeklyData, peakHour, peakDay },
    };
}
