import { format, startOfWeek, getDay, getWeek, addMonths, subMonths, addWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    CATEGORY_MAP,
    CATEGORY_PATTERNS,
    CATEGORY_LIST,
    CATEGORY_ALIASES,
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
import { calculateGamification } from '@/lib/gamification';
import { LabelTimelinePoint, UserCategoryRow, CFDDataPoint, PersonDetail } from '@/types/dashboard';

export interface ChartData {
    issues: Issue[];
    pieData: { name: string; value: number }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lineData: Record<string, any>[];
    barData: { name: string; value: number }[];
    heatmapData: HeatmapData[][];
    projectMetrics: ProjectMetrics;
    averageTeamMembersData: AverageTeamMembersData[];
    labelsTimeline: LabelTimelinePoint[];
    labelsTimelineKeys: string[];
    userCategoryMatrix: UserCategoryRow[];
    userCategoryKeys: string[];
    cfdData: CFDDataPoint[];
    issueComplexityData: IssueComplexityData[];
    collaborationData: CollaborationData[];
    productivityPatterns: ProductivityPatterns;
    leaderboard: LeaderboardEntry[];
    personDetails: PersonDetail[];
}

export interface LeaderboardEntry {
    name: string;
    hours: number;
    issueCount: number;
    rank: number;
    percentage: number;
}

export function processLeaderboard(timelogs: Timelog[]): LeaderboardEntry[] {
    const userMap: Record<string, { seconds: number; issues: Set<string> }> = {};

    timelogs.forEach(log => {
        const name = log.user.name;
        if (!userMap[name]) userMap[name] = { seconds: 0, issues: new Set() };
        userMap[name].seconds += log.timeSpent;
        if (log.issue?.iid) userMap[name].issues.add(log.issue.iid);
    });

    const entries = Object.entries(userMap)
        .map(([name, data]) => ({
            name,
            hours: data.seconds / 3600,
            issueCount: data.issues.size,
            rank: 0,
            percentage: 0,
        }))
        .sort((a, b) => b.hours - a.hours)
        .map((entry, i) => ({ ...entry, rank: i + 1 }));

    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    return entries.map(e => ({
        ...e,
        percentage: totalHours > 0 ? (e.hours / totalHours) * 100 : 0,
    }));
}

const SPEND_PATTERN = /\/spend\s+(\d+(?:\.\d+)?)(h|m|d|w)/gi;

function parseDuration(value: number, unit: string): number {
    switch (unit.toLowerCase()) {
        case 'h': return value * 3600;
        case 'm': return value * 60;
        case 'd': return value * 8 * 3600;
        case 'w': return value * 5 * 8 * 3600;
        default:  return 0;
    }
}

export function parseSpendNotes(
    notes: Array<{ body: string; createdAt: string; author: { username: string; name: string } }>,
    issue: { title: string; iid: string; webUrl?: string; labels: { nodes: Array<{ title: string }> }; timeEstimate: number; totalTimeSpent: number } | null
): Timelog[] {
    const timelogs: Timelog[] = [];
    for (const note of notes) {
        SPEND_PATTERN.lastIndex = 0;
        let match;
        while ((match = SPEND_PATTERN.exec(note.body)) !== null) {
            const seconds = parseDuration(parseFloat(match[1]), match[2]);
            if (seconds > 0) {
                timelogs.push({
                    user: { name: note.author.name },
                    issue: issue ? { ...issue, webUrl: issue.webUrl ?? '' } : null,
                    spentAt: note.createdAt,
                    timeSpent: seconds,
                });
            }
        }
    }
    return timelogs;
}


// Resolve a list of label titles to a known category.
// Priority: 1) exact match against CATEGORY_LIST  2) alias map  3) regex patterns  4) 'Sonstige'
// Handles namespaced labels like "category::project-management" by stripping the prefix.
function resolveCategory(labelTitles: string[]): string {
    if (labelTitles.length === 0) return 'Sonstige';
    const stripped = (l: string) => l.includes('::') ? l.split('::').slice(1).join('::') : l;
    // exact match against canonical names (case-insensitive), try both original and stripped
    for (const label of labelTitles) {
        for (const t of [label, stripped(label)]) {
            const match = CATEGORY_LIST.find(c => c.toLowerCase() === t.toLowerCase());
            if (match) return match;
        }
    }
    // alias map (e.g. "architecture" → "Architektur & Design")
    for (const label of labelTitles) {
        const alias = CATEGORY_ALIASES[stripped(label).toLowerCase()] ?? CATEGORY_ALIASES[label.toLowerCase()];
        if (alias) return alias;
    }
    // regex fallback
    const found = CATEGORY_PATTERNS.find(p => labelTitles.some(l => p.pattern.test(stripped(l)) || p.pattern.test(l)));
    return found?.category ?? 'Sonstige';
}

// Exported single-label variant for use in client components
export function resolveSingleLabel(labelTitle: string): string | null {
    const result = resolveCategory([labelTitle]);
    return result === 'Sonstige' ? null : result;
}

function processCFD(issues: Issue[], selectedFrom?: Date): CFDDataPoint[] {
    const weekMap: Record<string, { opened: number; closed: number }> = {};

    issues.forEach(issue => {
        const d = new Date(issue.createdAt);
        const monday = startOfWeek(d, { weekStartsOn: 1 });
        const key = format(monday, 'yyyy-MM-dd');
        if (!weekMap[key]) weekMap[key] = { opened: 0, closed: 0 };
        weekMap[key].opened++;
        if (issue.state === 'closed') weekMap[key].closed++;
    });

    // If single KW selected, ensure prev/selected/next Monday slots exist
    if (selectedFrom) {
        const selMonday = startOfWeek(selectedFrom, { weekStartsOn: 1 });
        [-1, 0, 1].forEach(offset => {
            const key = format(addWeeks(selMonday, offset), 'yyyy-MM-dd');
            if (!weekMap[key]) weekMap[key] = { opened: 0, closed: 0 };
        });
    }

    const sorted = Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b));
    let cumOpened = 0;
    let cumClosed = 0;

    return sorted.map(([isoMonday, counts]) => {
        cumOpened += counts.opened;
        cumClosed += counts.closed;
        const d = new Date(isoMonday);
        const label = `KW ${format(d, 'II')} (${format(d, 'dd.MM.yyyy')})`;
        return { date: label, opened: cumOpened, closed: cumClosed, total: cumOpened };
    });
}

function processLabelsTimeline(timelogs: Timelog[], selectedFrom?: Date): { points: LabelTimelinePoint[]; keys: string[] } {
    const weekMap: Record<string, Record<string, number | string>> = {};

    timelogs.forEach(log => {
        const d = new Date(log.spentAt);
        const monday = startOfWeek(d, { weekStartsOn: 1 });
        const week = format(monday, 'yyyy-II');
        const kwLabel = `KW ${format(monday, 'II')} (${format(monday, 'dd.MM.yyyy')})`;
        const labels = log.issue?.labels?.nodes?.map(n => n.title) ?? [];
        const category = resolveCategory(labels);

        if (!weekMap[week]) weekMap[week] = { __label: kwLabel };
        weekMap[week][category] = ((weekMap[week][category] as number) ?? 0) + log.timeSpent / 3600;
    });

    // If single KW selected, ensure prev/selected/next slots exist
    if (selectedFrom) {
        const selMonday = startOfWeek(selectedFrom, { weekStartsOn: 1 });
        [-1, 0, 1].forEach(offset => {
            const monday = addWeeks(selMonday, offset);
            const key = format(monday, 'yyyy-II');
            const label = `KW ${format(monday, 'II')} (${format(monday, 'dd.MM.yyyy')})`;
            if (!weekMap[key]) weekMap[key] = { __label: label };
        });
    }

    // always show all 4 categories
    const keys = [...CATEGORY_LIST] as string[];
    const points: LabelTimelinePoint[] = Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, cats]) => {
            const point: LabelTimelinePoint = { week: (cats.__label as string) ?? '' };
            keys.forEach(k => { point[k] = +((cats[k] as number) ?? 0).toFixed(2); });
            return point;
        });

    return { points, keys };
}

function processUserCategoryMatrix(timelogs: Timelog[]): { rows: UserCategoryRow[]; keys: string[] } {
    const userMap: Record<string, Record<string, number>> = {};

    timelogs.forEach(log => {
        const user = log.user.name;
        const labels = log.issue?.labels?.nodes?.map(n => n.title) ?? [];
        const category = resolveCategory(labels);

        if (!userMap[user]) userMap[user] = {};
        userMap[user][category] = (userMap[user][category] ?? 0) + log.timeSpent / 3600;
    });

    // always show all 4 categories, even if zero
    const keys = [...CATEGORY_LIST] as string[];
    const rows: UserCategoryRow[] = Object.entries(userMap).map(([name, cats]) => {
        const total = Object.values(cats).reduce((s, v) => s + v, 0);
        const row: UserCategoryRow = { name, total: +total.toFixed(2), percentage: 0 };
        keys.forEach(k => { row[k] = +(cats[k] ?? 0).toFixed(2); });
        return row;
    }).sort((a, b) => (b.total as number) - (a.total as number));

    const grandTotal = rows.reduce((s, r) => s + (r.total as number), 0);
    rows.forEach(r => { r.percentage = grandTotal > 0 ? +((r.total as number) / grandTotal * 100).toFixed(1) : 0; });

    return { rows, keys };
}

function topCategory(hours: Record<string, number>): string {
    let best = 'Sonstige';
    let bestVal = 0;
    for (const [cat, h] of Object.entries(hours)) {
        if (h > bestVal) { bestVal = h; best = cat; }
    }
    return best;
}

function processPersonDetails(
    timelogs: Timelog[],
    sprintData: ProjectMetrics['sprintData'],
): PersonDetail[] {
    const userCatMap: Record<string, Record<string, number>> = {};

    timelogs.forEach(log => {
        const user = log.user.name;
        const labels = log.issue?.labels?.nodes?.map(n => n.title) ?? [];
        const cat = resolveCategory(labels);
        if (!userCatMap[user]) userCatMap[user] = {};
        userCatMap[user][cat] = (userCatMap[user][cat] ?? 0) + log.timeSpent / 3600;
    });

    return Object.entries(userCatMap).map(([name, categoryHours]) => {
        const hoursBySprintNumber = sprintData.map(sp => sp.userHours[name] ?? 0);

        const lastIdx = sprintData.length - 1;
        const prevIdx = sprintData.length - 2;

        const thisCatHours: Record<string, number> = {};
        const lastCatHours: Record<string, number> = {};

        function parseSprintDate(s: string): Date {
            // sprintStart: "KW 47 (10.11.2026)" — extract date in parens
            // sprintEnd:   "17.11.2026"
            const m = s.match(/\((\d{2}\.\d{2}\.\d{4})\)/);
            const dateStr = m ? m[1] : s;
            const [d, mo, y] = dateStr.split('.');
            return new Date(`${y}-${mo}-${d}`);
        }

        if (lastIdx >= 0) {
            const sp = sprintData[lastIdx];
            timelogs.filter(log => {
                const d = new Date(log.spentAt);
                const spStart = parseSprintDate(sp.sprintStart);
                const spEnd = parseSprintDate(sp.sprintEnd);
                return log.user.name === name && d >= spStart && d <= spEnd;
            }).forEach(log => {
                const cat = resolveCategory(log.issue?.labels?.nodes?.map(n => n.title) ?? []);
                thisCatHours[cat] = (thisCatHours[cat] ?? 0) + log.timeSpent / 3600;
            });
        }

        if (prevIdx >= 0) {
            const sp = sprintData[prevIdx];
            timelogs.filter(log => {
                const d = new Date(log.spentAt);
                const spStart = parseSprintDate(sp.sprintStart);
                const spEnd = parseSprintDate(sp.sprintEnd);
                return log.user.name === name && d >= spStart && d <= spEnd;
            }).forEach(log => {
                const cat = resolveCategory(log.issue?.labels?.nodes?.map(n => n.title) ?? []);
                lastCatHours[cat] = (lastCatHours[cat] ?? 0) + log.timeSpent / 3600;
            });
        }

        return {
            name,
            categoryHours,
            hoursBySprintNumber,
            focusThisCycle: Object.keys(thisCatHours).length > 0 ? topCategory(thisCatHours) : topCategory(categoryHours),
            focusLastCycle: Object.keys(lastCatHours).length > 0 ? topCategory(lastCatHours) : topCategory(categoryHours),
        };
    });
}

export function processChartData(
    issues: Issue[],
    timelogs: Timelog[],
    contextTimelogs?: Timelog[],
    selectedFrom?: Date,
): ChartData {
    // contextTimelogs: ±1 week around selected KW, for time-series charts only.
    const seriesLogs = contextTimelogs ?? timelogs;
    function matchCategory(labelTitle: string): string | null {
        const stripped = labelTitle.includes('::') ? labelTitle.split('::').slice(1).join('::') : labelTitle;
        // alias map first
        const alias = CATEGORY_ALIASES[stripped.toLowerCase()] ?? CATEGORY_ALIASES[labelTitle.toLowerCase()];
        if (alias) return alias;
        // exact canonical match
        const exact = CATEGORY_LIST.find(c => c.toLowerCase() === stripped.toLowerCase() || c.toLowerCase() === labelTitle.toLowerCase());
        if (exact) return exact;
        // regex patterns
        for (const { category, pattern } of CATEGORY_PATTERNS) {
            if (pattern.test(stripped) || pattern.test(labelTitle)) return category;
        }
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

    // === 2. Linechart (Zeit/Woche/Person) — uses seriesLogs for ±1 KW context ===
    const weeklyMap: Record<string, Record<string, number | string>> = {};
    seriesLogs.forEach(log => {
        if (log.issue && log.issue.labels && log.issue.labels.nodes) {
            const d = new Date(log.spentAt);
            const monday = startOfWeek(d, { weekStartsOn: 1 });
            const week = format(monday, 'yyyy-II');
            const kwLabel = `KW ${format(monday, 'II')} (${format(monday, 'dd.MM.yyyy')})`;
            const user = log.user.name;
            if (!weeklyMap[week]) weeklyMap[week] = { __label: kwLabel };
            weeklyMap[week][user] = ((weeklyMap[week][user] as number) ?? 0) + log.timeSpent;
        }
    });

    // If a single KW is selected, ensure prev/selected/next slots exist (even if empty)
    if (selectedFrom && contextTimelogs) {
        const ensureSlot = (monday: Date) => {
            const key = format(monday, 'yyyy-II');
            const label = `KW ${format(monday, 'II')} (${format(monday, 'dd.MM.yyyy')})`;
            if (!weeklyMap[key]) weeklyMap[key] = { __label: label };
        };
        const selMonday = startOfWeek(selectedFrom, { weekStartsOn: 1 });
        ensureSlot(addWeeks(selMonday, -1)); // prev
        ensureSlot(selMonday);               // selected
        ensureSlot(addWeeks(selMonday, 1));  // next
    }

    const lineData = Object.entries(weeklyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, users]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const row: Record<string, any> = { week: users.__label };
            Object.entries(users).forEach(([user, time]) => {
                if (user !== '__label') row[user] = (time as number) / TIME_CONFIG.SECONDS_PER_HOUR;
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

    // === Sprint / Project Metrics — uses seriesLogs for ±1 KW context ===
    const sprintData: ProjectMetrics['sprintData'] = [];

    // Determine date range from seriesLogs (wider range when context provided)
    let seriesFirstDate: Date | null = null;
    let seriesLastDate: Date | null = null;
    seriesLogs.forEach(log => {
        const d = new Date(log.spentAt);
        if (!seriesFirstDate || d < seriesFirstDate) seriesFirstDate = d;
        if (!seriesLastDate || d > seriesLastDate) seriesLastDate = d;
    });
    const sprintRangeStart = seriesFirstDate ?? firstDate ?? new Date();
    let   sprintRangeEnd   = seriesLastDate  ?? lastDate  ?? new Date();

    // When a single KW is selected, ensure the loop reaches next KW
    if (selectedFrom) {
        const selMonday  = startOfWeek(selectedFrom, { weekStartsOn: 1 });
        const nextSunday = addWeeks(selMonday, 2);
        if (nextSunday > sprintRangeEnd) sprintRangeEnd = nextSunday;
    }

    let sprintStart = new Date(sprintRangeStart);
    // align to Monday (local time, consistent with date-fns usage throughout)
    const startDay = sprintStart.getDay() || 7;
    sprintStart.setDate(sprintStart.getDate() - (startDay - 1));

    const sprintEnd_ = new Date(sprintRangeEnd);
    const totalCategoryHours: Record<string, number> = { ...CATEGORY_MAP };

    while (sprintStart <= sprintEnd_) {
        const sprintEnd = addWeeks(sprintStart, 1);
        const sprintLogs = seriesLogs.filter(log => {
            const d = new Date(log.spentAt);
            return d >= sprintStart && d < sprintEnd;
        });

        if (sprintLogs.length > 0) {
            const totalHours = sprintLogs.reduce((s, l) => s + l.timeSpent, 0) / TIME_CONFIG.SECONDS_PER_HOUR;
            const sprintCategoryHours: Record<string, number> = { ...CATEGORY_MAP };

            sprintLogs.forEach(log => {
                if (log.issue && log.issue.labels && log.issue.labels.nodes) {
                    const labels = log.issue.labels.nodes.map(n => n.title);
                    const cat = resolveCategory(labels);
                    if (cat !== 'Sonstige' && sprintCategoryHours[cat] !== undefined) {
                        sprintCategoryHours[cat] += log.timeSpent / TIME_CONFIG.SECONDS_PER_HOUR;
                        totalCategoryHours[cat] += log.timeSpent / TIME_CONFIG.SECONDS_PER_HOUR;
                    }
                }
            });

            const userHours: Record<string, number> = {};
            sprintLogs.forEach(log => {
                userHours[log.user.name] = (userHours[log.user.name] || 0) + log.timeSpent / TIME_CONFIG.SECONDS_PER_HOUR;
            });

            sprintData.push({
                sprintStart: `KW ${String(getWeek(sprintStart, { locale: de })).padStart(2, '0')} (${format(sprintStart, 'dd.MM.yyyy')})`,
                sprintEnd: format(sprintEnd, 'dd.MM.yyyy'),
                totalHours,
                categoryHours: sprintCategoryHours,
                userHours,
                sprintNumber: sprintData.length + 1,
            });
        } else if (selectedFrom) {
            // Keep empty slot so ±1 KW context always shows 3 data points
            const selMonday  = startOfWeek(selectedFrom, { weekStartsOn: 1 });
            const prevMonday = addWeeks(selMonday, -1);
            const nextMonday = addWeeks(selMonday, 1);
            const sprintKey  = format(sprintStart, 'yyyy-II');
            const isContextSlot =
                sprintKey === format(prevMonday, 'yyyy-II') ||
                sprintKey === format(selMonday,  'yyyy-II') ||
                sprintKey === format(nextMonday, 'yyyy-II');
            if (isContextSlot) {
                sprintData.push({
                    sprintStart: `KW ${String(getWeek(sprintStart, { locale: de })).padStart(2, '0')} (${format(sprintStart, 'dd.MM.yyyy')})`,
                    sprintEnd: format(sprintEnd, 'dd.MM.yyyy'),
                    totalHours: 0,
                    categoryHours: { ...CATEGORY_MAP },
                    userHours: {},
                    sprintNumber: sprintData.length + 1,
                });
            }
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
                const cat = matchCategory(label.title);
                if (cat && categoryIssueTime[cat]) {
                    categoryIssueTime[cat].total += time;
                    categoryIssueTime[cat].count += 1;
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

    const { points: labelsTimeline, keys: labelsTimelineKeys } = processLabelsTimeline(timelogs, selectedFrom);
    const { rows: userCategoryMatrix, keys: userCategoryKeys } = processUserCategoryMatrix(timelogs);
    const cfdData = processCFD(issues, selectedFrom);

    const sprintDataForPersonDetails = sprintData;

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
        leaderboard: processLeaderboard(timelogs),
        labelsTimeline,
        labelsTimelineKeys,
        userCategoryMatrix,
        userCategoryKeys,
        cfdData,
        personDetails: processPersonDetails(timelogs, sprintDataForPersonDetails),
        issues,
    };
}
