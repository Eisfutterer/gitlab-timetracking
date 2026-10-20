'use client';

import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    sections: Array<{ id: string; label: string }>;
    currentIndex: number;
    onPrev: () => void;
    onNext: () => void;
    onExit: () => void;
}

export default function PresentationControls({ sections, currentIndex, onPrev, onNext, onExit }: Props) {
    const section = sections[currentIndex];

    return (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900/90 px-4 py-2 shadow-lg backdrop-blur dark:bg-gray-100/90">
            <Button variant="ghost" size="sm" onClick={onPrev} disabled={currentIndex === 0} className="text-white dark:text-gray-900">
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="min-w-[160px] text-center text-sm font-medium text-white dark:text-gray-900">
                {section?.label ?? ''} ({currentIndex + 1}/{sections.length})
            </span>

            <Button variant="ghost" size="sm" onClick={onNext} disabled={currentIndex === sections.length - 1} className="text-white dark:text-gray-900">
                <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="mx-1 h-4 w-px bg-gray-600 dark:bg-gray-400" />

            <Button variant="ghost" size="sm" onClick={onExit} className="text-red-400 hover:text-red-300 dark:text-red-600">
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function PresentationToggle({ onEnter }: { onEnter: () => void }) {
    return (
        <Button variant="ghost" size="sm" onClick={onEnter} aria-label="Präsentationsmodus starten" title="Präsentationsmodus">
            <Maximize2 className="h-4 w-4" />
        </Button>
    );
}
