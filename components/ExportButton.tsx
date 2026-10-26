'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
    targetRef: React.RefObject<HTMLDivElement | null>;
    filename?: string;
    className?: string;
}

export default function ExportButton({ targetRef, filename = 'chart', className }: ExportButtonProps) {
    const [exporting, setExporting] = useState(false);

    async function handleExport() {
        if (!targetRef.current || exporting) return;
        setExporting(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(targetRef.current, {
                backgroundColor: null,
                scale: 2,
            });
            canvas.toBlob(blob => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        } finally {
            setExporting(false);
        }
    }

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            title="Als PNG exportieren"
            className={cn(
                'absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity',
                'flex items-center gap-1.5 rounded-md bg-background/80 backdrop-blur px-2 py-1 text-xs text-muted-foreground hover:text-foreground ring-1 ring-foreground/10 shadow-sm',
                exporting && 'opacity-60 cursor-wait',
                className
            )}
        >
            <Download className="h-3 w-3" />
            {exporting ? '...' : 'PNG'}
        </button>
    );
}
