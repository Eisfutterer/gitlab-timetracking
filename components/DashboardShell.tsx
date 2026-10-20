"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { COLORS, TIME_CONFIG } from '../config/dashboardConfig';
import { ChartData } from '../lib/processData';
import { Issue, Epic, MergeRequest } from '../types/dashboard';

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
import MergeRequestAnalysis from './MergeRequestAnalysis';
import Leaderboard from './Leaderboard';
import GamificationCard from './GamificationCard';
import GroupComparison from './GroupComparison';
import PresentationControls, { PresentationToggle } from './PresentationControls';

interface DashboardShellProps extends ChartData {
    issues: Issue[];
    epics: Epic[];
    mergeRequests: MergeRequest[];
}

const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / TIME_CONFIG.SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % TIME_CONFIG.SECONDS_PER_HOUR) / TIME_CONFIG.SECONDS_PER_MINUTE);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}h`;
};

const SECTIONS = [
    { id: 'epics',          label: 'Epics & Issues' },
    { id: 'overview',       label: 'Übersicht' },
    { id: 'activity',       label: 'Aktivität' },
    { id: 'timeseries',     label: 'Zeitverlauf' },
    { id: 'team',           label: 'Team & Kategorien' },
    { id: 'productivity',   label: 'Produktivität' },
    { id: 'collaboration',  label: 'Kollaboration' },
    { id: 'issues',         label: 'Issues' },
    { id: 'mergerequests',  label: 'Merge Requests' },
    { id: 'leaderboard',    label: 'Leaderboard' },
    { id: 'gamification',   label: 'Gamification' },
    { id: 'groups',         label: 'Gruppen-Vergleich' },
];

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
    leaderboard,
    gamification,
    issues,
    epics,
    mergeRequests,
}) => {
    const [activeSection, setActiveSection] = useState<string>('epics');
    const [presentationMode, setPresentationMode] = useState(false);
    const [presentationIndex, setPresentationIndex] = useState(0);

    const handleSectionChange = (id: string) => {
        setActiveSection(id);
        const el = document.getElementById(`section-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const enterPresentation = useCallback(() => {
        setPresentationIndex(0);
        setPresentationMode(true);
        document.documentElement.requestFullscreen?.().catch(() => {});
    }, []);

    const exitPresentation = useCallback(() => {
        setPresentationMode(false);
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }, []);

    useEffect(() => {
        const handler = () => {
            if (!document.fullscreenElement) setPresentationMode(false);
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    useEffect(() => {
        if (!presentationMode) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setPresentationIndex(i => Math.min(i + 1, SECTIONS.length - 1));
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setPresentationIndex(i => Math.max(i - 1, 0));
            if (e.key === 'Escape') exitPresentation();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [presentationMode, exitPresentation]);

    const sectionIds = SECTIONS.map(s => s.id);

    const sectionContent: Record<string, React.ReactNode> = {
        epics: <EpicGraph epics={epics} />,
        overview: <ProjectOverview projectMetrics={projectMetrics} issues={issues} />,
        activity: <DetailedActivity heatmapData={heatmapData} HEATMAP_COLORS={[...COLORS.HEATMAP]} formatTime={formatTime} />,
        timeseries: <TimeSeriesCharts projectMetrics={projectMetrics} lineData={lineData} barData={barData} TEAM_COLORS={[...COLORS.TEAM]} COLORS={[...COLORS.PRIMARY]} />,
        team: <TeamAndCategories pieData={pieData} barData={barData} COLORS={[...COLORS.PRIMARY]} />,
        productivity: <ProductivityAnalysis productivityPatterns={productivityPatterns} />,
        collaboration: <TeamCollaboration collaborationData={collaborationData} averageTeamMembersData={averageTeamMembersData} COLORS={[...COLORS.PRIMARY]} />,
        issues: <><IssueAnalysis issueComplexityData={issueComplexityData} COLORS={[...COLORS.PRIMARY]} /><div className="mt-10"><IssueTimeAnalysis issues={issues} /></div></>,
        mergerequests: <MergeRequestAnalysis mergeRequests={mergeRequests} />,
        leaderboard: <Leaderboard leaderboard={leaderboard} />,
        gamification: <GamificationCard members={gamification} />,
        groups: <GroupComparison />,
    };

    if (presentationMode) {
        const currentId = SECTIONS[presentationIndex]?.id;
        return (
            <div className="relative flex min-h-screen flex-col bg-background">
                <div className="flex-1 overflow-auto px-8 py-10">
                    <h1 className="mb-6 text-2xl font-bold text-foreground">
                        {SECTIONS[presentationIndex]?.label}
                    </h1>
                    {currentId && sectionContent[currentId]}
                </div>
                <PresentationControls
                    sections={SECTIONS}
                    currentIndex={presentationIndex}
                    onPrev={() => setPresentationIndex(i => Math.max(i - 1, 0))}
                    onNext={() => setPresentationIndex(i => Math.min(i + 1, SECTIONS.length - 1))}
                    onExit={exitPresentation}
                />
            </div>
        );
    }

    return (
        <>
            <Navbar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                extraControls={<PresentationToggle onEnter={enterPresentation} />}
            />
            <div className="mx-auto max-w-screen-2xl px-4 py-8 space-y-10">
                {sectionIds.map(id => (
                    <section key={id} id={`section-${id}`}>
                        {sectionContent[id]}
                    </section>
                ))}
            </div>
        </>
    );
};

export default DashboardShell;
