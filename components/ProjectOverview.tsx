import React from 'react';
import { CHART_CONFIG, KPI_LABELS } from '../config/dashboardConfig';
import { ProjectMetrics, Issue } from '@/types/dashboard';

interface ProjectOverviewProps {
    projectMetrics: ProjectMetrics;
    issues: Issue[];
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projectMetrics, issues }) => {
    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Projektübersicht</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Team Velocity */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">{KPI_LABELS.WEEKLY_PERFORMANCE}</p>
                    <p className="text-3xl font-bold tracking-tight text-foreground">
                        {projectMetrics.averageVelocity.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {projectMetrics.totalSprints} {KPI_LABELS.ACTIVE_WEEKS}
                    </p>
                </div>

                {/* Most Active Category */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">{KPI_LABELS.MAIN_FOCUS}</p>
                    {(() => {
                        const mainCategory = projectMetrics.categoryDistribution
                            .sort((a, b) => b.hours - a.hours)[0];
                        return (
                            <>
                                <p className="text-3xl font-bold tracking-tight text-foreground">
                                    {mainCategory.category}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {mainCategory.hours.toFixed(CHART_CONFIG.DECIMAL_PLACES)}{KPI_LABELS.HOURS_PER_WEEK}
                                </p>
                            </>
                        );
                    })()}
                </div>

                {/* Average Issue Completion Time */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">{KPI_LABELS.ISSUE_COMPLETION_TIME}</p>
                    {(() => {
                        const completedIssues = issues.filter(issue => issue.totalTimeSpent > 0);
                        const avgTime = completedIssues.length > 0
                            ? completedIssues.reduce((sum, issue) => sum + issue.totalTimeSpent, 0) / completedIssues.length / 3600
                            : 0;
                        return (
                            <>
                                <p className="text-3xl font-bold tracking-tight text-foreground">
                                    {avgTime.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {completedIssues.length} {KPI_LABELS.COMPLETED_ISSUES}
                                </p>
                            </>
                        );
                    })()}
                </div>

                {/* Most Productive Week */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-1">{KPI_LABELS.MOST_ACTIVE_WEEK}</p>
                    {(() => {
                        const mostProductiveWeek = [...projectMetrics.sprintData]
                            .sort((a, b) => b.totalHours - a.totalHours)[0];
                        return (
                            <>
                                <p className="text-3xl font-bold tracking-tight text-foreground">
                                    {mostProductiveWeek.totalHours.toFixed(CHART_CONFIG.DECIMAL_PLACES)}h
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {mostProductiveWeek.sprintStart} - {mostProductiveWeek.sprintEnd}
                                </p>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default ProjectOverview;
