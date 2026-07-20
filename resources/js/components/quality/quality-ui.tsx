import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

/*
 * ชุด UI กลางของโมดูลภายใต้ศูนย์คุณภาพ — generalize มาจาก resources/js/pages/Im/ui.tsx
 * ทุกโมดูล (quality-docs, indicators, QA, MRA, IC, ENV, KM) ใช้โครงเดียวกัน
 * แต่กำหนดโทนสีของตนเองผ่าน prop `tone`
 */

export type QualityTone =
    | 'sky' | 'blue' | 'emerald' | 'violet' | 'indigo' | 'rose' | 'teal' | 'amber' | 'cyan' | 'pink' | 'orange' | 'slate';

interface ToneClasses {
    heroBg: string;
    iconBox: string;
    badge: string;
    navLabel: string;
    navBadge: string;
    navActive: string;
    navHover: string;
    navIcon: string;
    shadow: string;
    button: string;
    link: string;
}

export const TONES: Record<QualityTone, ToneClasses> = {
    sky: {
        heroBg: 'from-sky-50 via-blue-50/40 to-indigo-50',
        iconBox: 'from-sky-600 to-indigo-600 shadow-sky-900/20',
        badge: 'bg-sky-100 text-sky-700',
        navLabel: 'text-sky-700',
        navBadge: 'bg-sky-50 text-sky-700',
        navActive: 'border-sky-400 bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-600 shadow-sky-900/20',
        navHover: 'hover:border-sky-200 hover:bg-sky-50/50',
        navIcon: 'text-sky-700',
        shadow: 'shadow-sky-900/5',
        button: 'bg-sky-600 hover:bg-sky-700',
        link: 'text-sky-600',
    },
    blue: {
        heroBg: 'from-blue-50 via-sky-50/40 to-cyan-50',
        iconBox: 'from-blue-600 to-cyan-600 shadow-blue-900/20',
        badge: 'bg-blue-100 text-blue-700',
        navLabel: 'text-blue-700',
        navBadge: 'bg-blue-50 text-blue-700',
        navActive: 'border-blue-400 bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-600 shadow-blue-900/20',
        navHover: 'hover:border-blue-200 hover:bg-blue-50/50',
        navIcon: 'text-blue-700',
        shadow: 'shadow-blue-900/5',
        button: 'bg-blue-600 hover:bg-blue-700',
        link: 'text-blue-600',
    },
    emerald: {
        heroBg: 'from-emerald-50 via-green-50/40 to-teal-50',
        iconBox: 'from-emerald-600 to-teal-600 shadow-emerald-900/20',
        badge: 'bg-emerald-100 text-emerald-700',
        navLabel: 'text-emerald-700',
        navBadge: 'bg-emerald-50 text-emerald-700',
        navActive: 'border-emerald-400 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 shadow-emerald-900/20',
        navHover: 'hover:border-emerald-200 hover:bg-emerald-50/50',
        navIcon: 'text-emerald-700',
        shadow: 'shadow-emerald-900/5',
        button: 'bg-emerald-600 hover:bg-emerald-700',
        link: 'text-emerald-600',
    },
    violet: {
        heroBg: 'from-violet-50 via-purple-50/40 to-fuchsia-50',
        iconBox: 'from-violet-600 to-purple-600 shadow-violet-900/20',
        badge: 'bg-violet-100 text-violet-700',
        navLabel: 'text-violet-700',
        navBadge: 'bg-violet-50 text-violet-700',
        navActive: 'border-violet-400 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-violet-900/20',
        navHover: 'hover:border-violet-200 hover:bg-violet-50/50',
        navIcon: 'text-violet-700',
        shadow: 'shadow-violet-900/5',
        button: 'bg-violet-600 hover:bg-violet-700',
        link: 'text-violet-600',
    },
    indigo: {
        heroBg: 'from-indigo-50 via-blue-50/40 to-violet-50',
        iconBox: 'from-indigo-600 to-blue-600 shadow-indigo-900/20',
        badge: 'bg-indigo-100 text-indigo-700',
        navLabel: 'text-indigo-700',
        navBadge: 'bg-indigo-50 text-indigo-700',
        navActive: 'border-indigo-400 bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 shadow-indigo-900/20',
        navHover: 'hover:border-indigo-200 hover:bg-indigo-50/50',
        navIcon: 'text-indigo-700',
        shadow: 'shadow-indigo-900/5',
        button: 'bg-indigo-600 hover:bg-indigo-700',
        link: 'text-indigo-600',
    },
    rose: {
        heroBg: 'from-rose-50 via-red-50/40 to-pink-50',
        iconBox: 'from-rose-600 to-red-600 shadow-rose-900/20',
        badge: 'bg-rose-100 text-rose-700',
        navLabel: 'text-rose-700',
        navBadge: 'bg-rose-50 text-rose-700',
        navActive: 'border-rose-400 bg-gradient-to-br from-rose-600 via-red-600 to-pink-600 shadow-rose-900/20',
        navHover: 'hover:border-rose-200 hover:bg-rose-50/50',
        navIcon: 'text-rose-700',
        shadow: 'shadow-rose-900/5',
        button: 'bg-rose-600 hover:bg-rose-700',
        link: 'text-rose-600',
    },
    teal: {
        heroBg: 'from-teal-50 via-emerald-50/40 to-cyan-50',
        iconBox: 'from-teal-600 to-emerald-600 shadow-teal-900/20',
        badge: 'bg-teal-100 text-teal-700',
        navLabel: 'text-teal-700',
        navBadge: 'bg-teal-50 text-teal-700',
        navActive: 'border-teal-400 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 shadow-teal-900/20',
        navHover: 'hover:border-teal-200 hover:bg-teal-50/50',
        navIcon: 'text-teal-700',
        shadow: 'shadow-teal-900/5',
        button: 'bg-teal-600 hover:bg-teal-700',
        link: 'text-teal-600',
    },
    amber: {
        heroBg: 'from-amber-50 via-orange-50/40 to-yellow-50',
        iconBox: 'from-amber-500 to-orange-600 shadow-amber-900/20',
        badge: 'bg-amber-100 text-amber-700',
        navLabel: 'text-amber-700',
        navBadge: 'bg-amber-50 text-amber-700',
        navActive: 'border-amber-400 bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 shadow-amber-900/20',
        navHover: 'hover:border-amber-200 hover:bg-amber-50/50',
        navIcon: 'text-amber-700',
        shadow: 'shadow-amber-900/5',
        button: 'bg-amber-600 hover:bg-amber-700',
        link: 'text-amber-600',
    },
    cyan: {
        heroBg: 'from-cyan-50 via-sky-50/40 to-blue-50',
        iconBox: 'from-cyan-600 to-sky-600 shadow-cyan-900/20',
        badge: 'bg-cyan-100 text-cyan-700',
        navLabel: 'text-cyan-700',
        navBadge: 'bg-cyan-50 text-cyan-700',
        navActive: 'border-cyan-400 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600 shadow-cyan-900/20',
        navHover: 'hover:border-cyan-200 hover:bg-cyan-50/50',
        navIcon: 'text-cyan-700',
        shadow: 'shadow-cyan-900/5',
        button: 'bg-cyan-600 hover:bg-cyan-700',
        link: 'text-cyan-600',
    },
    pink: {
        heroBg: 'from-pink-50 via-rose-50/40 to-fuchsia-50',
        iconBox: 'from-pink-600 to-rose-600 shadow-pink-900/20',
        badge: 'bg-pink-100 text-pink-700',
        navLabel: 'text-pink-700',
        navBadge: 'bg-pink-50 text-pink-700',
        navActive: 'border-pink-400 bg-gradient-to-br from-pink-600 via-rose-600 to-fuchsia-600 shadow-pink-900/20',
        navHover: 'hover:border-pink-200 hover:bg-pink-50/50',
        navIcon: 'text-pink-700',
        shadow: 'shadow-pink-900/5',
        button: 'bg-pink-600 hover:bg-pink-700',
        link: 'text-pink-600',
    },
    orange: {
        heroBg: 'from-orange-50 via-amber-50/40 to-yellow-50',
        iconBox: 'from-orange-500 to-amber-600 shadow-orange-900/20',
        badge: 'bg-orange-100 text-orange-700',
        navLabel: 'text-orange-700',
        navBadge: 'bg-orange-50 text-orange-700',
        navActive: 'border-orange-400 bg-gradient-to-br from-orange-500 via-amber-500 to-amber-600 shadow-orange-900/20',
        navHover: 'hover:border-orange-200 hover:bg-orange-50/50',
        navIcon: 'text-orange-700',
        shadow: 'shadow-orange-900/5',
        button: 'bg-orange-600 hover:bg-orange-700',
        link: 'text-orange-600',
    },
    slate: {
        heroBg: 'from-slate-50 via-gray-50/40 to-zinc-50',
        iconBox: 'from-slate-600 to-gray-600 shadow-slate-900/20',
        badge: 'bg-slate-100 text-slate-700',
        navLabel: 'text-slate-700',
        navBadge: 'bg-slate-100 text-slate-700',
        navActive: 'border-slate-400 bg-gradient-to-br from-slate-600 via-gray-600 to-zinc-600 shadow-slate-900/20',
        navHover: 'hover:border-slate-300 hover:bg-slate-50',
        navIcon: 'text-slate-700',
        shadow: 'shadow-slate-900/5',
        button: 'bg-slate-700 hover:bg-slate-800',
        link: 'text-slate-600',
    },
};

export const qualityInput =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

export const qualitySelect = qualityInput + ' cursor-pointer';

/* ---------- SubNav ---------- */

export interface QualityTab {
    /* ziggy route name หรือ href ตรง ๆ (ขึ้นต้นด้วย /) */
    key: string;
    label: string;
    hint?: string;
    icon: LucideIcon;
    /* query params เพิ่มเติมเมื่อใช้ route name */
    params?: Record<string, string>;
}

export function QualitySubNav({
    tone,
    workspaceLabel,
    workspaceBadge,
    tabs,
    active,
    columnsClass,
}: {
    tone: QualityTone;
    workspaceLabel: string;
    workspaceBadge?: string;
    tabs: QualityTab[];
    active: string;
    columnsClass?: string;
}) {
    const t = TONES[tone];
    const cols = columnsClass ?? (tabs.length >= 5 ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : `sm:grid-cols-2 xl:grid-cols-${Math.min(tabs.length, 4)}`);

    return (
        <nav className={cn('rounded-3xl border border-white/70 bg-white/85 p-2 shadow-xl backdrop-blur', t.shadow)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                <div className={cn('text-xs font-semibold uppercase tracking-[0.2em]', t.navLabel)}>{workspaceLabel}</div>
                {workspaceBadge && (
                    <div className={cn('rounded-full px-3 py-1 text-[11px] font-medium', t.navBadge)}>{workspaceBadge}</div>
                )}
            </div>
            <div className={cn('grid gap-2', cols)}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = active === tab.key;
                    const href = tab.key.startsWith('/') ? tab.key : route(tab.key, tab.params);

                    return (
                        <Link
                            key={tab.key}
                            href={href}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-300',
                                'hover:-translate-y-0.5 hover:shadow-lg',
                                isActive
                                    ? cn('text-white shadow-lg', t.navActive)
                                    : cn('border-slate-200 bg-white text-slate-600 hover:text-slate-900', t.navHover),
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition',
                                        isActive ? 'bg-white/20 text-white' : cn('bg-slate-100 group-hover:bg-white', t.navIcon),
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold">{tab.label}</span>
                                    {tab.hint && (
                                        <span className={cn('block truncate text-[11px]', isActive ? 'text-white/80' : 'text-slate-400')}>
                                            {tab.hint}
                                        </span>
                                    )}
                                </span>
                            </div>
                            {isActive && <span className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/15" />}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

/* ---------- Page shell ---------- */

export function QualityPage({
    tone,
    title,
    subtitle,
    badge,
    icon: Icon,
    actions,
    breadcrumbs,
    headTitle,
    subNav,
    children,
}: {
    tone: QualityTone;
    title: string;
    subtitle?: string;
    badge?: string;
    icon: LucideIcon;
    actions?: React.ReactNode;
    breadcrumbs: { title: string; href: string }[];
    headTitle?: string;
    subNav?: React.ReactNode;
    children: React.ReactNode;
}) {
    const t = TONES[tone];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={headTitle ?? title} />
            <div className="min-h-screen bg-slate-50/60">
                <div className="relative overflow-hidden border-b border-slate-100 bg-white">
                    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-70', t.heroBg)} />
                    <div className="relative mx-auto max-w-7xl px-6 py-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', t.iconBox)}>
                                    <Icon className="h-7 w-7" />
                                </div>
                                <div>
                                    {badge && (
                                        <span className={cn('mb-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold', t.badge)}>
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
                    {subNav}
                    {children}
                </div>
            </div>
        </AppLayout>
    );
}

/* ---------- Building blocks (เหมือน Im/ui.tsx) ---------- */

const STAT_TONES: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    teal: 'bg-teal-50 text-teal-600',
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    pink: 'bg-pink-50 text-pink-600',
    orange: 'bg-orange-50 text-orange-600',
};

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
    tone?: keyof typeof STAT_TONES;
}) {
    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', STAT_TONES[tone])}>
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
