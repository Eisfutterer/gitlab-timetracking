import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
    default:     'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
    secondary:   'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline:     'text-foreground',
    success:     'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    warning:     'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
    destructive: 'border-transparent bg-destructive/15 text-destructive',
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
                variantClasses[variant],
                className
            )}
            {...props}
        />
    )
);
Badge.displayName = 'Badge';

export { Badge };
