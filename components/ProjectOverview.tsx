import React from 'react';
import { CHART_CONFIG, KPI_LABELS } from '../config/dashboardConfig';
import { ProjectMetrics, Issue } from '@/types/dashboard';

interface ProjectOverviewProps {
    projectMetrics: ProjectMetrics;
    issues: Issue[];
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projectMetrics, issues }) => {
    const completedIssues = issues.filter(i => i.totalTimeSpent > 0);
    const avgTime = completedIssues.length > 0
        ? completedIssues.reduce((sum, i) => sum + i.totalTimeSpent, 0) / completedIssues.length / 3600
        : 0;
    const mainCategory = [...projectMetrics.categoryDistribution].sort((a, b) => b.hours - a.hours)[0];
    const mostProductiveWeek = [...projectMetrics.sprintData].sort((a, b) => b.totalHours - a.totalHours)[0];

    const stats = [
        {
            label: KPI_LABELS.WEEKLY_PERFORMANCE,
            value: `${projectMetrics.averageVelocity.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`,
            sub: `${projectMetrics.totalSprints} ${KPI_LABELS.ACTIVE_WEEKS}`,
        },
        {
            label: KPI_LABELS.MAIN_FOCUS,
            value: mainCategory.category,
            sub: `${mainCategory.hours.toFixed(CHART_CONFIG.DECIMAL_PLACES)}${KPI_LABELS.HOURS_PER_WEEK}`,
        },
        {
            label: KPI_LABELS.ISSUE_COMPLETION_TIME,
            value: `${avgTime.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`,
            sub: `${completedIssues.length} ${KPI_LABELS.COMPLETED_ISSUES}`,
        },
        {
            label: KPI_LABELS.MOST_ACTIVE_WEEK,
            value: `${mostProductiveWeek.totalHours.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h`,
            sub: `${mostProductiveWeek.sprintStart} – ${mostProductiveWeek.sprintEnd}`,
        },
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Projektübersicht</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="rounded-xl bg-card ring-1 ring-foreground/10 p-5 flex flex-col gap-1"
                    >
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {s.label}
                        </p>
                        <p className="text-3xl font-bold tracking-tight text-foreground mt-1">
                            {s.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {s.sub}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectOverview;
