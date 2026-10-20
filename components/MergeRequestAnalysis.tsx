'use client';

import { MergeRequest } from '@/types/dashboard';
import { Badge } from '@/components/ui/badge';

interface Props {
    mergeRequests: MergeRequest[];
}

function stateVariant(state: string): 'success' | 'default' | 'secondary' | 'destructive' {
    if (state === 'merged') return 'success';
    if (state === 'opened') return 'default';
    if (state === 'closed') return 'destructive';
    return 'secondary';
}

function stateLabel(state: string): string {
    if (state === 'merged') return 'Merged';
    if (state === 'opened') return 'Offen';
    if (state === 'closed') return 'Geschlossen';
    return state;
}

function reviewCoverage(mrs: MergeRequest[]): { name: string; authored: number; reviewed: number }[] {
    const stats: Record<string, { authored: number; reviewed: number }> = {};

    mrs.forEach(mr => {
        const author = mr.author?.name;
        if (author) {
            if (!stats[author]) stats[author] = { authored: 0, reviewed: 0 };
            stats[author].authored++;
        }
        mr.reviewers.nodes.forEach(r => {
            if (!stats[r.name]) stats[r.name] = { authored: 0, reviewed: 0 };
            stats[r.name].reviewed++;
        });
    });

    return Object.entries(stats)
        .map(([name, s]) => ({ name, ...s }))
        .sort((a, b) => b.authored + b.reviewed - (a.authored + a.reviewed));
}

export default function MergeRequestAnalysis({ mergeRequests }: Props) {
    const coverage = reviewCoverage(mergeRequests);
    const merged = mergeRequests.filter(m => m.state === 'merged').length;
    const open = mergeRequests.filter(m => m.state === 'opened').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Merge Requests</h2>
                <div className="flex gap-2">
                    <Badge variant="success">{merged} Merged</Badge>
                    <Badge variant="default">{open} Offen</Badge>
                    <Badge variant="secondary">{mergeRequests.length} Gesamt</Badge>
                </div>
            </div>

            {/* Review coverage per person */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Review-Beteiligung</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="pb-2 text-left font-medium text-muted-foreground">Person</th>
                                <th className="pb-2 text-right font-medium text-muted-foreground">Erstellt</th>
                                <th className="pb-2 text-right font-medium text-muted-foreground">Reviewed</th>
                                <th className="pb-2 text-right font-medium text-muted-foreground">Review-Quote</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coverage.map(row => (
                                <tr key={row.name} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                                    <td className="py-2 text-foreground">{row.name}</td>
                                    <td className="py-2 text-right text-muted-foreground">{row.authored}</td>
                                    <td className="py-2 text-right text-muted-foreground">{row.reviewed}</td>
                                    <td className="py-2 text-right">
                                        <span className={row.authored > 0 && row.reviewed / row.authored >= 1 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                                            {row.authored > 0 ? `${((row.reviewed / row.authored) * 100).toFixed(0)}%` : '—'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MR list */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-border">
                    {mergeRequests.slice(0, 20).map(mr => (
                        <div key={mr.iid} className="flex items-start gap-3 px-4 py-3">
                            <Badge variant={stateVariant(mr.state)} className="mt-0.5 shrink-0">
                                {stateLabel(mr.state)}
                            </Badge>
                            <div className="min-w-0 flex-1">
                                <a
                                    href={mr.webUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    {mr.title}
                                </a>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {mr.author?.name ?? 'Unbekannt'} · {new Date(mr.createdAt).toLocaleDateString('de-DE')}
                                    {mr.reviewers.nodes.length > 0 && ` · Reviewer: ${mr.reviewers.nodes.map(r => r.name).join(', ')}`}
                                </p>
                            </div>
                        </div>
                    ))}
                    {mergeRequests.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-gray-400">Keine Merge Requests gefunden</p>
                    )}
                </div>
            </div>
        </div>
    );
}
