"use client"

import React from 'react';
import { COLORS, TIME_CONFIG } from '../config/dashboardConfig';
import { ChartData } from '../lib/processData';
import { Issue } from '../types/dashboard';

import ProjectOverview from './ProjectOverview';
import TimeSeriesCharts from './TimeSeriesCharts';
import TeamAndCategories from './TeamAndCategories';
import ProductivityAnalysis from './ProductivityAnalysis';
import TeamCollaboration from './TeamCollaboration';
import IssueAnalysis from './IssueAnalysis';
import IssueTimeAnalysis from './IssueTimeAnalysis';
import DetailedActivity from './DetailedActivity';

interface DashboardShellProps extends ChartData {
    issues: Issue[];
}

const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / TIME_CONFIG.SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % TIME_CONFIG.SECONDS_PER_HOUR) / TIME_CONFIG.SECONDS_PER_MINUTE);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}h`;
};

const DashboardShell: React.FC<DashboardShellProps> = ({
    pieData,
    lineData,
    barData,
    heatmapData,
    projectMetrics,
    averageTeamMembersData,
    issueComplexityData,
    collaborationData,
    productivityPatterns,
    issues,
}) => {
    return (
        <div className="mt-8 space-y-10">
            <ProjectOverview
                projectMetrics={projectMetrics}
                issues={issues}
            />

            <DetailedActivity
                heatmapData={heatmapData}
                HEATMAP_COLORS={[...COLORS.HEATMAP]}
                formatTime={formatTime}
            />

            <TimeSeriesCharts
                projectMetrics={projectMetrics}
                lineData={lineData}
                barData={barData}
                TEAM_COLORS={[...COLORS.TEAM]}
                COLORS={[...COLORS.PRIMARY]}
            />

            <TeamAndCategories
                pieData={pieData}
                barData={barData}
                COLORS={[...COLORS.PRIMARY]}
            />

            <ProductivityAnalysis
                productivityPatterns={productivityPatterns}
            />

            <TeamCollaboration
                collaborationData={collaborationData}
                averageTeamMembersData={averageTeamMembersData}
                COLORS={[...COLORS.PRIMARY]}
            />

            <IssueAnalysis
                issueComplexityData={issueComplexityData}
                COLORS={[...COLORS.PRIMARY]}
            />

            <IssueTimeAnalysis
                issues={issues}
            />
        </div>
    );
};

export default DashboardShell;
