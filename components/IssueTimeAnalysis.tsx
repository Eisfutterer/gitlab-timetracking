'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import {
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import {
    CHART_CONFIG,
    CHART_TITLES,
    TOOLTIP_LABELS,
    CHART_LABELS,
    CATEGORIES,
    DEVIATION_THRESHOLDS,
    resolveCategoryLabel,
} from '@/config/dashboardConfig';
import { Issue } from '@/types/dashboard';
import CollapsibleCard from './CollapsibleCard';

interface IssueTimeAnalysisProps {
    issues: Issue[];
}

const IssueTimeAnalysis: React.FC<IssueTimeAnalysisProps> = ({ issues }) => {
    const { resolvedTheme } = useTheme();
    const dark = resolvedTheme === 'dark';
    const ct = {
        grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        axis: dark ? '#71717a' : '#a1a1aa',
        cursor: { fill: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
        tooltip: {
            contentStyle: {
                backgroundColor: dark ? '#1c1c1e' : '#ffffff',
                border:          `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius:    '0.625rem',
                color:           dark ? '#fafafa' : '#0a0a0a',
                fontSize:        '0.8125rem',
            },
            labelStyle: { color: dark ? '#fafafa' : '#0a0a0a', fontWeight: 600 },
            itemStyle:  { color: dark ? '#a1a1aa' : '#71717a' },
        },
    };

    // Create issue map for efficient lookup
    const issueMap = new Map<string, Issue>();
    issues.forEach(issue => {
        issueMap.set(issue.iid, issue);
    });

    // Filter issues that have a main category and either estimated or booked time
    const filteredIssues = issues.filter(issue => {
        const hasMainCategory = issue.labels?.nodes?.some(l => resolveCategoryLabel(l.title) !== null);
        const hasTimeData = (issue.timeEstimate || 0) > 0 || (issue.totalTimeSpent || 0) > 0;
        return hasMainCategory && hasTimeData;
    });

    // Get main category for each issue (returns canonical name)
    const getMainCategory = (issue: Issue): string => {
        for (const l of (issue.labels?.nodes ?? [])) {
            const cat = resolveCategoryLabel(l.title);
            if (cat) return cat;
        }
        return '';
    };

    // Calculate deviation for each issue
    const issuesWithDeviation = filteredIssues.map(issue => {
        const timeEstimate = issue.timeEstimate || 0;
        const totalTimeSpent = issue.totalTimeSpent || 0;
        const difference = timeEstimate > 0 
            ? ((totalTimeSpent - timeEstimate) / timeEstimate) * 100 
            : (totalTimeSpent > 0 ? Infinity : 0);
        
        return {
            ...issue,
            mainCategory: getMainCategory(issue),
            timeEstimate: timeEstimate / 3600, // Convert to hours
            totalTimeSpent: totalTimeSpent / 3600, // Convert to hours
            difference
        };
    });

    // Sort issues: first by actual time (descending), then by infinite deviation, then by absolute deviation
    const sortedIssues = issuesWithDeviation.sort((a, b) => {
        // First priority: issues with actual time
        if (a.totalTimeSpent > 0 && b.totalTimeSpent === 0) return -1;
        if (a.totalTimeSpent === 0 && b.totalTimeSpent > 0) return 1;
        
        // Second priority: infinite deviation (no estimate but actual time)
        if (a.difference === Infinity && b.difference !== Infinity) return -1;
        if (a.difference !== Infinity && b.difference === Infinity) return 1;
        
        // Third priority: absolute deviation
        return Math.abs(b.difference) - Math.abs(a.difference);
    });

    // Calculate category comparison data
    const categoryComparison = Object.values(CATEGORIES).map(category => {
        const categoryIssues = issuesWithDeviation.filter(issue => 
            issue.mainCategory === category && issue.totalTimeSpent > 0
        );
        
        const totalEstimated = categoryIssues.reduce((sum, issue) => sum + issue.timeEstimate, 0);
        const totalActual = categoryIssues.reduce((sum, issue) => sum + issue.totalTimeSpent, 0);
        
        return {
            category,
            estimated: totalEstimated,
            actual: totalActual
        };
    });

    // Calculate average deviation per category
    const averageDeviationPerCategory = Object.values(CATEGORIES).map(category => {
        const categoryIssues = issuesWithDeviation.filter(issue => 
            issue.mainCategory === category && 
            issue.totalTimeSpent > 0 && 
            issue.difference !== Infinity
        );
        
        const averageDeviation = categoryIssues.length > 0
            ? categoryIssues.reduce((sum, issue) => sum + Math.abs(issue.difference), 0) / categoryIssues.length
            : 0;
        
        return {
            category,
            averageDeviation
        };
    });

    return (
        <CollapsibleCard title="Issue Zeitanalyse">

            {/* Category Comparison Chart */}
            <div className="mb-8">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_TITLES.TIME_COMPARISON}</h4>
                <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.MEDIUM}>
                    <BarChart data={categoryComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="category" tick={{ fill: ct.axis, fontSize: 12 }} />
                        <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number, name: string) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`, name]}
                            cursor={ct.cursor}
                            {...ct.tooltip}
                        />
                        <Legend wrapperStyle={{ color: ct.axis, fontSize: 12 }} />
                        <Bar dataKey="estimated" fill="#8884d8" name={CHART_LABELS.ESTIMATED_TIME} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="actual" fill="#82ca9d" name={CHART_LABELS.ACTUAL_TIME} radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Average Deviation per Category */}
            <div className="mb-8">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{CHART_LABELS.AVERAGE_DEVIATION}</h4>
                <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHTS.SMALL}>
                    <BarChart data={averageDeviationPerCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                        <XAxis dataKey="category" tick={{ fill: ct.axis, fontSize: 12 }} />
                        <YAxis tick={{ fill: ct.axis, fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number) => [`${value.toFixed(CHART_CONFIG.DECIMAL_PLACES)}%`, TOOLTIP_LABELS.DEVIATION]}
                            cursor={ct.cursor}
                            {...ct.tooltip}
                        />
                        <Bar dataKey="averageDeviation" fill="#ffc658" name="Ø Abweichung (%)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

        </CollapsibleCard>
    );
};

export default IssueTimeAnalysis; 