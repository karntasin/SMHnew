import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, ClipboardList, Pill, Sparkles, Warehouse } from 'lucide-react';

type Channel = {
    key: string;
    title: string;
    hint: string;
    href: string;
    tone: 'rose' | 'emerald' | 'cyan' | 'violet';
    stats_label: string;
};

const toneMap = {
    rose: {
        ring: 'border-rose-200 hover:border-rose-300',
        badge: 'bg-rose-50 text-rose-700',
        icon: 'bg-rose-100 text-rose-700',
        glow: 'from-rose-500/15 via-orange-400/10 to-transparent',
        cta: 'text-rose-700',
    },
    emerald: {
        ring: 'border-emerald-200 hover:border-emerald-300',
        badge: 'bg-emerald-50 text-emerald-700',
        icon: 'bg-emerald-100 text-emerald-700',
        glow: 'from-emerald-500/15 via-teal-400/10 to-transparent',
        cta: 'text-emerald-700',
    },
    cyan: {
        ring: 'border-cyan-200 hover:border-cyan-300',
        badge: 'bg-cyan-50 text-cyan-700',
        icon: 'bg-cyan-100 text-cyan-700',
        glow: 'from-cyan-500/15 via-sky-400/10 to-transparent',
        cta: 'text-cyan-700',
    },
    violet: {
        ring: 'border-violet-200 hover:border-violet-300',
        badge: 'bg-violet-50 text-violet-700',
        icon: 'bg-violet-100 text-violet-700',
        glow: 'from-violet-500/15 via-fuchsia-400/10 to-transparent',
        cta: 'text-violet-700',
    },
};

const iconMap = {
    'drug-alerts': AlertTriangle,
    inventory: Warehouse,
    rdu: Pill,
    'drug-usage': ClipboardList,
};

export default function PharmacyIndex({ channels = [] }: { channels: Channel[] }) {
    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs()}>
            <Head title="เภสัชกรรม" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.12),_transparent_45%)]" />
                <div className="pointer-events-none absolute -left-20 top-28 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-72 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <PharmacySubNav active="pharmacy.index" />

                    <section className="overflow-hidden rounded-[2rem] border border-teal-100 bg-gradient-to-br from-slate-900 via-teal-950 to-cyan-900 p-6 text-white shadow-2xl shadow-teal-900/20 md:p-8">
                        <div className="max-w-2xl space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100 backdrop-blur">
                                <Sparkles className="h-3.5 w-3.5" />
                                โมดูลเภสัชกรรม · ศูนย์พัฒนาคุณภาพ
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">เลือกช่องทางงานเภสัชกรรม</h1>
                            <p className="text-sm text-teal-100/80 md:text-base">
                                รวมแจ้งเตือนการใช้ยาตาม eGFR คลังยา/ห้องยา รายงาน RDU และรายงานยาและการใช้ยาไว้ในที่เดียว
                            </p>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {channels.map((ch) => {
                            const tone = toneMap[ch.tone] ?? toneMap.cyan;
                            const Icon = iconMap[ch.key as keyof typeof iconMap] ?? Pill;

                            return (
                                <Link
                                    key={ch.key}
                                    href={ch.href}
                                    className={cn(
                                        'group relative overflow-hidden rounded-[1.75rem] border bg-white/95 p-5 shadow-xl shadow-slate-900/5 transition-all duration-300',
                                        'hover:-translate-y-1 hover:shadow-2xl',
                                        tone.ring,
                                    )}
                                >
                                    <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90', tone.glow)} />
                                    <div className="relative space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', tone.icon)}>
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', tone.badge)}>
                                                {ch.stats_label}
                                            </span>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">{ch.title}</h2>
                                            <p className="mt-1 text-sm text-slate-500">{ch.hint}</p>
                                        </div>
                                        <div className={cn('flex items-center gap-1 text-sm font-semibold', tone.cta)}>
                                            เข้าใช้งาน
                                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
