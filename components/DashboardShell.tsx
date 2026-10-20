"use client"

import React, { useState } from 'react';
import { COLORS, TIME_CONFIG } from '../config/dashboardConfig';
import { ChartData } from '../lib/processData';
import { Issue, Epic } from '../types/dashboard';

import Navbar from './Navbar';
import ProjectOverview from './ProjectOverview';
import TimeSeriesCharts from './TimeSeriesCharts';
import TeamAndCategories from './TeamAndCategories';
import ProductivityAnalysis from './ProductivityAnalysis';
import TeamCollaboration from './TeamCollaboration';
import IssueAnalysis from './IssueAnalysis';
import IssueTimeAnalysis from './IssueTimeAnalysis';
import DetailedActivity from './DetailedActivity';
import EpicGraph from './EpicGraph';

interface DashboardShellProps extends ChartData {
    issues: Issue[];
    epics: Epic[];
}

const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / TIME_CONFIG.SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % TIME_CONFIG.SECONDS_PER_HOUR) / TIME_CONFIG.SECONDS_PER_MINUTE);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}h`;
};

const SECTION_IDS = ['epics', 'overview', 'activity', 'timeseries', 'team', 'productivity', 'collaboration', 'issues'];

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
    epics,
}) => {
    const [activeSection, setActiveSection] = useState<string>('epics');

    const handleSectionChange = (id: string) => {
        setActiveSection(id);
        if (!SECTION_IDS.includes(id)) return;
        const el = document.getElementById(`section-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <Navbar activeSection={activeSection} onSectionChange={handleSectionChange} />
            <div className="mx-auto max-w-screen-2xl px-4 py-8 space-y-10">

                <section id="section-epics">
                    <EpicGraph epics={epics} />
                </section>

                <section id="section-overview">
                    <ProjectOverview
                        projectMetrics={projectMetrics}
                        issues={issues}
                    />
                </section>

                <section id="section-activity">
                    <DetailedActivity
                        heatmapData={heatmapData}
                        HEATMAP_COLORS={[...COLORS.HEATMAP]}
                        formatTime={formatTime}
                    />
                </section>

                <section id="section-timeseries">
                    <TimeSeriesCharts
                        projectMetrics={projectMetrics}
                        lineData={lineData}
                        barData={barData}
                        TEAM_COLORS={[...COLORS.TEAM]}
                        COLORS={[...COLORS.PRIMARY]}
                    />
                </section>

                <section id="section-team">
                    <TeamAndCategories
                        pieData={pieData}
                        barData={barData}
                        COLORS={[...COLORS.PRIMARY]}
                    />
                </section>

                <section id="section-productivity">
                    <ProductivityAnalysis
                        productivityPatterns={productivityPatterns}
                    />
                </section>

                <section id="section-collaboration">
                    <TeamCollaboration
                        collaborationData={collaborationData}
                        averageTeamMembersData={averageTeamMembersData}
                        COLORS={[...COLORS.PRIMARY]}
                    />
                </section>

                <section id="section-issues">
                    <IssueAnalysis
                        issueComplexityData={issueComplexityData}
                        COLORS={[...COLORS.PRIMARY]}
                    />
                    <div className="mt-10">
                        <IssueTimeAnalysis issues={issues} />
                    </div>
                </section>

            </div>
        </>
    );
};

export default DashboardShell;
