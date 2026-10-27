"use client"

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useTheme } from 'next-themes';
import { COLORS, TIME_CONFIG } from '../config/dashboardConfig';
import { ChartData } from '../lib/processData';
import { Issue, Epic } from '../types/dashboard';
import {
    BarChart2, Moon, Sun, RefreshCw, FileDown, Presentation,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoRefresh } from '@/lib/hooks';

import ProjectOverview from './ProjectOverview';
import TimeSeriesCharts from './TimeSeriesCharts';
import ProductivityAnalysis from './ProductivityAnalysis';
import TeamCollaboration from './TeamCollaboration';
import IssueAnalysis from './IssueAnalysis';
import IssueTimeAnalysis from './IssueTimeAnalysis';
import DetailedActivity from './DetailedActivity';
import EpicGraph from './EpicGraph';
import Leaderboard from './Leaderboard';
import GroupComparison from './GroupComparison';
import PresentationControls from './PresentationControls';
import DateFilterBar from './DateFilterBar';

import UserCategoryMatrix from './UserCategoryMatrix';
import CFDChart from './CFDChart';
import ReportButton from './ReportButton';
import RiskyIssues from './RiskyIssues';
import FocusCard from './FocusCard';
import RadarCategoryChart from './RadarCategoryChart';
import DashboardSkeleton from './DashboardSkeleton';

interface DashboardShellProps extends ChartData {
    issues: Issue[];
    epics: Epic[];
}

const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / TIME_CONFIG.SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % TIME_CONFIG.SECONDS_PER_HOUR) / TIME_CONFIG.SECONDS_PER_MINUTE);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}h`;
};

const SECTIONS = [
    { id: 'epics',         label: 'Epics & Issues' },
    { id: 'overview',      label: 'Übersicht' },
    { id: 'activity',      label: 'Aktivität' },
    { id: 'timeseries',    label: 'Zeitverlauf' },
    { id: 'team',          label: 'Team & Kategorien' },
    { id: 'productivity',  label: 'Produktivität' },
    { id: 'collaboration', label: 'Kollaboration' },
    { id: 'issues',        label: 'Issues' },
    { id: 'leaderboard',   label: 'Leaderboard' },
    { id: 'groups',        label: 'Gruppen-Vergleich' },
];

const DashboardShell: React.FC<DashboardShellProps> = ({
    pieData, lineData, barData, heatmapData, projectMetrics,
        averageTeamMembersData, issueComplexityData, collaborationData,
        productivityPatterns, leaderboard,
        labelsTimeline, labelsTimelineKeys,
        userCategoryMatrix, userCategoryKeys,
        cfdData, issues, epics, personDetails,
}) => {
    const { resolvedTheme, setTheme } = useTheme();
    const [activeSection, setActiveSection] = useState<string>('epics');
    const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [collapsed, setCollapsed] = useState(false);
    const [presentationMode, setPresentationMode] = useState(false);
    const [presentationIndex, setPresentationIndex] = useState(0);
    const { manualRefresh } = useAutoRefresh(false);

    // Scrollspy — update activeSection as sections enter the viewport
    useEffect(() => {
        const observers: IntersectionObserver[] = [];
        const visibleRatios: Record<string, number> = {};

        SECTIONS.forEach(({ id }) => {
            const el = document.getElementById(`section-${id}`);
            if (!el) return;
            const observer = new IntersectionObserver(
                ([entry]) => {
                    visibleRatios[id] = entry.intersectionRatio;
                    // pick the section with the highest visible ratio
                    const best = Object.entries(visibleRatios).sort((a, b) => b[1] - a[1])[0];
                    if (best && best[1] > 0) setActiveSection(best[0]);
                },
                { threshold: Array.from({ length: 21 }, (_, i) => i / 20), rootMargin: '-10% 0px -10% 0px' }
            );
            observer.observe(el);
            observers.push(observer);
        });

        return () => observers.forEach(o => o.disconnect());
    }, []);

    // Scroll active nav item into view when scrollspy changes it
    useEffect(() => {
        navItemRefs.current[activeSection]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [activeSection]);

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
        const handler = () => { if (!document.fullscreenElement) setPresentationMode(false); };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    useEffect(() => {
        if (!presentationMode) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setPresentationIndex(i => Math.min(i + 1, SECTIONS.length - 1));
            if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setPresentationIndex(i => Math.max(i - 1, 0));
            if (e.key === 'Escape') exitPresentation();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [presentationMode, exitPresentation]);

    // mounted: show skeleton on first client render for at least 400ms,
    // regardless of server cache speed. Must be last hook — no early returns above.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 400);
        return () => clearTimeout(t);
    }, []);

    // ── All hooks above this line ─────────────────────────────────────────────
    if (!mounted) return <DashboardSkeleton />;

    const handleSectionChange = (id: string) => {
        setActiveSection(id);
        const el = document.getElementById(`section-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const sectionContent: Record<string, React.ReactNode> = {
        epics: <EpicGraph epics={epics} />,
        overview: <ProjectOverview projectMetrics={projectMetrics} issues={issues} />,
        activity: <DetailedActivity heatmapData={heatmapData} HEATMAP_COLORS={[...COLORS.HEATMAP]} formatTime={formatTime} />,
        timeseries: <TimeSeriesCharts projectMetrics={projectMetrics} lineData={lineData} barData={barData} TEAM_COLORS={[...COLORS.TEAM]} COLORS={[...COLORS.PRIMARY]} />,
        team: (
            <div className="space-y-6">
                <FocusCard personDetails={personDetails} projectMetrics={projectMetrics} />
                <RadarCategoryChart userCategoryMatrix={userCategoryMatrix} keys={userCategoryKeys} pieData={pieData} />
                <UserCategoryMatrix rows={userCategoryMatrix} keys={userCategoryKeys} />
            </div>
        ),
        productivity: <ProductivityAnalysis productivityPatterns={productivityPatterns} />,
        collaboration: <TeamCollaboration collaborationData={collaborationData} averageTeamMembersData={averageTeamMembersData} COLORS={[...COLORS.PRIMARY]} />,
        issues: (
            <div className="space-y-6">
                <IssueAnalysis issueComplexityData={issueComplexityData} COLORS={[...COLORS.PRIMARY]} />
                <IssueTimeAnalysis issues={issues} />
                <CFDChart data={cfdData} />
                <RiskyIssues issues={issues} leaderboard={leaderboard} userCategoryMatrix={userCategoryMatrix} />
            </div>
        ),
        leaderboard: <Leaderboard leaderboard={leaderboard} personDetails={personDetails} projectMetrics={projectMetrics} />,
        groups: <GroupComparison />,
    };

    const chartData = { pieData, lineData, barData, heatmapData, projectMetrics, averageTeamMembersData, issueComplexityData, collaborationData, productivityPatterns, leaderboard, labelsTimeline, labelsTimelineKeys, userCategoryMatrix, userCategoryKeys, cfdData, personDetails };

    if (presentationMode) {
        const currentId = SECTIONS[presentationIndex]?.id;
        return (
            <div className="relative flex min-h-screen flex-col bg-background">
                <div className="flex-1 overflow-auto px-8 py-10">
                    <h1 className="mb-6 text-2xl font-bold text-foreground">{SECTIONS[presentationIndex]?.label}</h1>
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
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className={cn(
                'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-200',
                collapsed ? 'w-14' : 'w-52'
            )}>
                {/* Logo row */}
                <div className="flex h-14 shrink-0 items-center justify-between px-3 border-b border-border">
                    {!collapsed && (
                        <div className="flex items-center gap-2 min-w-0">
                            <BarChart2 className="h-4 w-4 shrink-0 text-foreground" />
                            <span className="text-sm font-semibold tracking-tight text-foreground truncate">Time Tracking</span>
                        </div>
                    )}
                    {collapsed && <BarChart2 className="h-4 w-4 mx-auto text-foreground" />}
                    {!collapsed && (
                        <button
                            onClick={() => setCollapsed(true)}
                            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            aria-label="Sidebar einklappen"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            ref={el => { navItemRefs.current[s.id] = el; }}
                            onClick={() => handleSectionChange(s.id)}
                            title={collapsed ? s.label : undefined}
                            className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                                collapsed ? 'justify-center' : 'justify-start',
                                activeSection === s.id
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            )}
                        >
                            <span className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0',
                                activeSection === s.id ? 'bg-foreground' : 'bg-muted-foreground/40'
                            )} />
                            {!collapsed && <span className="truncate">{s.label}</span>}
                        </button>
                    ))}
                </nav>

                {/* Bottom controls */}
                <div className={cn(
                    'shrink-0 border-t border-border py-2 flex flex-col gap-1',
                    collapsed ? 'items-center px-0' : 'px-2'
                )}>
                    {/* Expand button (collapsed only) */}
                    {collapsed && (
                        <button
                            onClick={() => setCollapsed(false)}
                            className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            aria-label="Sidebar ausklappen"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}

                    {/* Date filter — only when expanded */}
                    {!collapsed && (
                        <div className="px-1 py-1">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Zeitraum</p>
                            <Suspense fallback={null}>
                                <DateFilterBar />
                            </Suspense>
                        </div>
                    )}

                    {/* Action row */}
                    <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'flex-row items-center px-1')}>
                        <button
                            onClick={manualRefresh}
                            title="Jetzt aktualisieren"
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>

                        <Suspense fallback={null}>
                            <span title="Report herunterladen">
                                <ReportButton data={chartData} />
                            </span>
                        </Suspense>

                        <button
                            onClick={enterPresentation}
                            title="Präsentation"
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        >
                            <Presentation className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            title="Dark mode umschalten"
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        >
                            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className={cn(
                'flex-1 min-w-0 transition-all duration-200',
                collapsed ? 'ml-14' : 'ml-52'
            )}>
                <div className="mx-auto max-w-screen-xl px-6 py-8 space-y-6">
                    {SECTIONS.map(s => (
                        <section key={s.id} id={`section-${s.id}`}>
                            {sectionContent[s.id]}
                        </section>
                    ))}
                </div>
                <footer className={cn(
                    'border-t border-border px-6 py-4 text-center text-xs text-muted-foreground transition-all duration-200',
                    collapsed ? 'ml-0' : 'ml-0'
                )}>
                    © {new Date().getFullYear()} G4 MergeConflict — DHBW Stuttgart · DHBW Karlsruhe · Software Engineering I · TINF25B6
                </footer>
            </main>
        </div>
    );
};

export default DashboardShell;
