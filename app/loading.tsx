import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="mx-auto max-w-screen-2xl px-4 py-8 space-y-6">
            {/* Navbar placeholder */}
            <div className="fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/95" />

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-14">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <Skeleton className="h-4 w-24 mb-3 bg-muted" />
                        <Skeleton className="h-8 w-16 bg-muted" />
                        <Skeleton className="h-3 w-20 mt-2 bg-muted" />
                    </div>
                ))}
            </div>

            {/* Chart row */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <Skeleton className="h-5 w-40 mb-4 bg-muted" />
                        <Skeleton className="h-64 w-full bg-muted" />
                    </div>
                ))}
            </div>

            {/* Wide chart */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <Skeleton className="h-5 w-48 mb-4 bg-muted" />
                <Skeleton className="h-80 w-full bg-muted" />
            </div>
        </div>
    );
}
