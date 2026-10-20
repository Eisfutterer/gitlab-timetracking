import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    default:     'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    secondary:   'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    outline:     'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    ghost:       'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    sm:   'h-8 rounded-md px-3 text-xs',
    md:   'h-9 rounded-md px-4 py-2 text-sm',
    lg:   'h-10 rounded-md px-8 text-sm',
    icon: 'h-9 w-9 rounded-md',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'md', ...props }, ref) => (
        <button
            ref={ref}
            className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
            {...props}
        />
    )
);
Button.displayName = 'Button';

export { Button };
