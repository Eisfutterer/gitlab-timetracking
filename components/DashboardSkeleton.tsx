'use client';

import { Skeleton } from '@/components/ui/skeleton';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-xl bg-card ring-1 ring-foreground/8 p-5 ${className}`}>
            {children}
        </div>
    );
}

function CardHeader() {
    return (
        <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
    );
}

export default function DashboardSkeleton() {
    return (
        <div className="flex min-h-screen bg-background">

            {/* ── Sidebar ─────────────────────────────────────── */}
            <aside className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card w-52">
                <div className="flex h-14 shrink-0 items-center gap-2 px-4 border-b border-border">
                    <Skeleton className="h-4 w-4 rounded-sm flex-shrink-0" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <nav className="flex-1 overflow-hidden px-2 py-3 space-y-1">
                    {[24, 20, 28, 22, 16, 24, 20, 22, 16].map((w, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
                            <Skeleton className="h-4 w-4 flex-shrink-0 rounded-sm" />
                            <Skeleton className={`h-3`} style={{ width: w * 4 }} />
                        </div>
                    ))}
                </nav>
                <div className="border-t border-border px-3 py-3 flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                    <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
                    <Skeleton className="h-8 flex-1 rounded-md" />
                </div>
            </aside>

            {/* ── Main ────────────────────────────────────────── */}
            <main className="flex-1 ml-52 flex flex-col min-h-screen">

                {/* Topbar */}
                <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-6">
                    <Skeleton className="h-4 w-48" />
                    <div className="ml-auto flex items-center gap-2">
                        <Skeleton className="h-8 w-28 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>

                {/* Date filter bar */}
                <div className="flex items-center gap-3 border-b border-border px-6 py-2.5">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-32 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="w-px h-5 bg-border mx-1" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 space-y-5">

                    {/* KPI tiles */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i}>
                                <Skeleton className="h-3 w-20 mb-3" />
                                <Skeleton className="h-7 w-14 mb-2" />
                                <Skeleton className="h-2.5 w-16" />
                            </Card>
                        ))}
                    </div>

                    {/* Epic card */}
                    <Card>
                        <CardHeader />
                        <div className="flex gap-1 mb-4">
                            <Skeleton className="h-7 w-20 rounded-md" />
                            <Skeleton className="h-7 w-16 rounded-md" />
                            <Skeleton className="h-7 w-16 rounded-md" />
                        </div>
                        <div className="space-y-2">
                            {[0, 24, 24, 48, 48, 48].map((indent, i) => (
                                <div key={i} className="flex items-center gap-3" style={{ paddingLeft: indent }}>
                                    <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                                    <Skeleton className="h-3" style={{ width: [256, 192, 224, 176, 208, 160][i] }} />
                                    <Skeleton className="h-1.5 w-14 rounded-full ml-auto" />
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Two-col charts */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Card>
                            <CardHeader />
                            <div className="h-48 flex items-end gap-1">
                                {[30, 55, 40, 70, 45, 80, 60, 75, 50, 85, 65, 90].map((h, i) => (
                                    <Skeleton key={i} className="flex-1 rounded-sm opacity-60" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                            <div className="flex justify-between mt-2">
                                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-2.5 w-8" />)}
                            </div>
                        </Card>
                        <Card>
                            <CardHeader />
                            <div className="space-y-3 mt-1">
                                {[85, 62, 74, 48, 90].map((w, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="h-3 w-20 flex-shrink-0" />
                                        <Skeleton className="h-4 rounded-sm flex-shrink-0" style={{ width: `${w * 0.55}%` }} />
                                        <Skeleton className="h-3 w-10 ml-auto flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Wide chart */}
                    <Card>
                        <CardHeader />
                        <div className="h-56 flex items-end gap-2">
                            {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75, 85, 55, 70, 65, 80, 50].map((h, i) => (
                                <Skeleton key={i} className="flex-1 rounded-sm opacity-50" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </Card>

                    {/* Three-col: radar + table */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <Card>
                            <CardHeader />
                            <div className="flex items-center justify-center h-44">
                                <div className="relative w-36 h-36">
                                    {[0, 9, 18, 27].map((inset, i) => (
                                        <Skeleton key={i} className="absolute rounded-full"
                                            style={{ inset: `${inset}%`, opacity: 0.2 + i * 0.1 }} />
                                    ))}
                                    {[0, 60, 120].map((deg, i) => (
                                        <div key={i} className="absolute inset-0 flex items-center justify-center">
                                            <Skeleton className="h-px w-full opacity-20" style={{ transform: `rotate(${deg}deg)` }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                        <Card className="md:col-span-2">
                            <CardHeader />
                            <div className="space-y-2">
                                <div className="flex gap-3 pb-2 border-b border-border">
                                    {[96, 112, 112, 80, 80, 48, 40].map((w, i) => (
                                        <Skeleton key={i} className="h-3 flex-shrink-0" style={{ width: w }} />
                                    ))}
                                </div>
                                {Array.from({ length: 5 }).map((_, ri) => (
                                    <div key={ri} className="flex gap-3 py-1.5">
                                        {[96, 56, 56, 56, 40, 40, 40].map((w, ci) => (
                                            <Skeleton key={ci} className="h-3 flex-shrink-0" style={{ width: w, opacity: ri % 2 === 0 && ci > 0 ? 0.6 : 1 }} />
                                        ))}
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-2 border-t-2 border-border">
                                    {[64, 56, 56, 56, 40, 40, 40].map((w, i) => (
                                        <Skeleton key={i} className="h-3.5 flex-shrink-0" style={{ width: w }} />
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Leaderboard */}
                    <Card>
                        <CardHeader />
                        <div className="space-y-2">
                            {[90, 72, 60, 45, 33].map((bar, i) => (
                                <div key={i} className="flex items-center gap-3 py-1">
                                    <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
                                    <Skeleton className="h-3 w-24 flex-shrink-0" />
                                    <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                                        <Skeleton className="h-full rounded-sm" style={{ width: `${bar}%` }} />
                                    </div>
                                    <Skeleton className="h-3 w-10 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </Card>

                </div>

                {/* Footer */}
                <footer className="border-t border-border px-6 py-4 flex justify-center">
                    <Skeleton className="h-3 w-72" />
                </footer>
            </main>
        </div>
    );
}
