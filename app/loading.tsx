import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="mx-auto max-w-screen-2xl px-4 py-8 space-y-10">
            {/* Navbar placeholder */}
            <div className="fixed top-0 left-0 right-0 h-14 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950" />

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-14">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
                        <Skeleton className="h-4 w-24 mb-3" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>

            {/* Chart row */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
                        <Skeleton className="h-5 w-40 mb-4" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                ))}
            </div>

            {/* Wide chart */}
            <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
                <Skeleton className="h-5 w-48 mb-4" />
                <Skeleton className="h-80 w-full" />
            </div>
        </div>
    );
}
