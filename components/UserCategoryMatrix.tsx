'use client';

import { UserCategoryRow } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import CollapsibleCard from './CollapsibleCard';

interface Props {
    rows: UserCategoryRow[];
    keys: string[];
}

export default function UserCategoryMatrix({ rows, keys }: Props) {
    return (
        <CollapsibleCard title="User-Kategorie-Matrix" className="overflow-x-auto">
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="pb-2 text-left font-medium text-muted-foreground">Mitglied</th>
                            {keys.map(k => (
                                <th key={k} className="pb-2 px-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                                    {k}
                                </th>
                            ))}
                            <th className="pb-2 px-2 text-right font-medium text-muted-foreground">Gesamt</th>
                            <th className="pb-2 pl-2 text-right font-medium text-muted-foreground">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.map(row => (
                            <tr key={row.name} className="hover:bg-muted/40 transition-colors">
                                <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">{row.name}</td>
                                {keys.map(k => (
                                    <td key={k} className={cn('py-2 px-2 text-right tabular-nums', (row[k] as number) > 0 ? 'text-foreground' : 'text-muted-foreground/50')}>
                                        {(row[k] as number) > 0 ? `${(row[k] as number).toFixed(1)}h` : '—'}
                                    </td>
                                ))}
                                <td className="py-2 px-2 text-right tabular-nums font-semibold text-foreground">
                                    {(row.total as number).toFixed(1)}h
                                </td>
                                <td className="py-2 pl-2 text-right tabular-nums text-muted-foreground">
                                    {row.percentage}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </CollapsibleCard>
    );
}
