'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    defaultOpen?: boolean;
    extra?: React.ReactNode;
}

export default function CollapsibleCard({ title, children, className, defaultOpen = true, extra }: CollapsibleCardProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={cn('rounded-xl bg-card ring-1 ring-foreground/10 p-6', className)}>
            <div className={cn('flex items-center justify-between', open && 'mb-6')}>
                <div className="flex items-center gap-3 min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
                    {extra}
                </div>
                <button
                    onClick={() => setOpen(v => !v)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    aria-label={open ? 'Einklappen' : 'Ausklappen'}
                >
                    <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !open && '-rotate-90')} />
                </button>
            </div>
            {open && children}
        </div>
    );
}
