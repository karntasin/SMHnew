import React from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BackButtonProps extends React.ComponentProps<typeof Button> {
    fallbackUrl?: string;
    label?: string;
    iconOnly?: boolean;
}

/**
 * Smart Back Button that navigates back through browser history naturally,
 * preventing duplicate history push loops ("วนไปวนมา").
 * If no internal history exists, gracefully falls back to `fallbackUrl`.
 */
export function BackButton({
    fallbackUrl = '/admin-hub',
    label,
    iconOnly = false,
    className,
    variant = 'ghost',
    size,
    onClick,
    children,
    ...props
}: BackButtonProps) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
            onClick(e);
            if (e.defaultPrevented) return;
        }

        if (typeof window !== 'undefined') {
            const hasHistory = window.history.length > 1 &&
                Boolean(document.referrer) &&
                document.referrer.includes(window.location.host);

            if (hasHistory) {
                window.history.back();
                return;
            }

            // Fallback navigation with replace to avoid history loops
            router.visit(fallbackUrl, { replace: true });
        }
    };

    if (iconOnly) {
        return (
            <Button
                type="button"
                variant={variant}
                size={size || 'icon'}
                className={cn('h-8 w-8 text-muted-foreground hover:text-foreground', className)}
                onClick={handleClick}
                title={label || 'ย้อนกลับ'}
                {...props}
            >
                <ArrowLeft className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant={variant}
            size={size || 'sm'}
            className={cn('inline-flex items-center text-muted-foreground hover:text-foreground', className)}
            onClick={handleClick}
            {...props}
        >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {children || label || 'ย้อนกลับ'}
        </Button>
    );
}
