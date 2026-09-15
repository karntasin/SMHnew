import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ImSubNav, { ImTabKey } from '@/pages/Im/ImSubNav';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export function ImPage({
    active,
    title,
    subtitle,
    badge,
    icon: Icon,
    actions,
    children,
}: {
    active: ImTabKey;
    title: string;
    subtitle?: string;
    badge?: string;
    icon: LucideIcon;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'งานสารสนเทศ (IM)', href: '/im' },
                { title, href: '#' },
            ]}
        >
            <Head title={`IM · ${title}`} />
            <div className="min-h-screen bg-slate-50/60">
                <div className="relative overflow-hidden border-b border-slate-100 bg-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50/40 to-indigo-50 opacity-70" />
                    <div className="relative mx-auto max-w-7xl px-6 py-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-900/20">
                                    <Icon className="h-7 w-7" />
                                </div>
                                <div>
                                    {badge && (
                                        <span className="mb-1 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                                            {badge}
                                        </span>
                                    )}
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                                    {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                                </div>
                            </div>
                            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
                    <ImSubNav active={active} />
                    {children}
                </div>
            </div>
        </AppLayout>
    );
}

export function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    tone = 'sky',
}: {
    label: string;
    value: React.ReactNode;
    sub?: string;
    icon: LucideIcon;
    tone?: 'sky' | 'rose' | 'amber' | 'emerald' | 'violet' | 'cyan' | 'slate' | 'indigo';
}) {
    const tones: Record<string, string> = {
        sky: 'bg-sky-50 text-sky-600',
        rose: 'bg-rose-50 text-rose-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        violet: 'bg-violet-50 text-violet-600',
        cyan: 'bg-cyan-50 text-cyan-600',
        slate: 'bg-slate-100 text-slate-600',
        indigo: 'bg-indigo-50 text-indigo-600',
    };
    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-xs font-medium text-slate-500">{label}</div>
            {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
        </div>
    );
}

export function Panel({
    title,
    description,
    action,
    children,
    className,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-2xl border border-slate-200/70 bg-white shadow-sm', className)}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    {description && <p className="text-xs text-slate-500">{description}</p>}
                </div>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    wide,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    wide?: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className={cn('max-h-[90vh] overflow-y-auto', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">{children}</div>
                {footer && <DialogFooter>{footer}</DialogFooter>}
            </DialogContent>
        </Dialog>
    );
}

export function Field({
    label,
    required,
    error,
    children,
    className,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label className="text-sm font-medium text-slate-700">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
    );
}

export function StatusPill({ label, className }: { label: string; className: string }) {
    return (
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', className)}>
            {label}
        </span>
    );
}

export function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-400">
            {text}
        </div>
    );
}
