'use client';

import { PersonDetail } from '@/types/dashboard';
import CollapsibleCard from './CollapsibleCard';

interface Props {
    personDetails: PersonDetail[];
    projectMetrics: { sprintData: Array<{ categoryHours: Record<string, number>; sprintNumber: number; sprintStart: string }> };
}

function topCategory(hours: Record<string, number>): string {
    let best = '–';
    let bestVal = 0;
    for (const [cat, h] of Object.entries(hours)) {
        if (h > bestVal) { bestVal = h; best = cat; }
    }
    return best;
}

export default function FocusCard({ personDetails: _, projectMetrics }: Props) {
    const sprints = projectMetrics.sprintData;
    const lastIdx = sprints.length - 1;
    const prevIdx = sprints.length - 2;

    const thisCycle  = lastIdx >= 0 ? topCategory(sprints[lastIdx].categoryHours)  : '–';
    const lastCycle  = prevIdx >= 0 ? topCategory(sprints[prevIdx].categoryHours)  : '–';
    const thisLabel  = lastIdx >= 0 ? sprints[lastIdx].sprintStart : 'Aktuell';
    const lastLabel  = prevIdx >= 0 ? sprints[prevIdx].sprintStart : 'Vorherig';

    return (
        <CollapsibleCard title="Fokus">
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">{lastLabel}</p>
                    <p className="text-lg font-bold text-foreground">{lastCycle}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">{thisLabel}</p>
                    <p className="text-lg font-bold text-foreground">{thisCycle}</p>
                </div>
            </div>
        </CollapsibleCard>
    );
}
