import React from 'react';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    ChevronRight,
    ClipboardList,
    FileCheck2,
    FileWarning,
    Heart,
    Shield,
    Upload,
    Wallet,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from './DataHubSubNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SchemeCard {
    key: string;
    title: string;
    short: string;
    subtitle: string;
    description: string;
    import_label: string;
    import_hint: string;
    icon: string;
    tone: string;
    status: 'ready' | 'planned' | string;
    dashboard_url: string;
    import_url: string;
}

interface Props {
    hosxpReady: boolean;
    stats: {
        batch_count: number;
        row_count: number;
        total_claim: number;
        total_approved: number;
        latest_shortfall: number;
        latest_matched_short: number;
        ready_modules: number;
        planned_modules: number;
    };
    schemes: SchemeCard[];
}

const money = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const iconMap = {
    ClipboardList,
    Building2,
    Shield,
    Heart,
    Upload,
    FileCheck2,
} as const;

const toneBox: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
    violet: 'bg-violet-100 text-violet-700',
    rose: 'bg-rose-100 text-rose-700',
    teal: 'bg-teal-100 text-teal-700',
};

export default function FinanceDataHubIndex({ hosxpReady, stats, schemes }: Props) {
    return (
        <QualityPage
            tone="emerald"
            icon={Wallet}
            badge="Financial Data Hub"
            title="ศูนย์ข้อมูลการเงิน"
            subtitle="ตรวจและนำเข้าข้อมูลแยกตามสิทธิ์ — จ่ายตรง · อปท. · ประกันสังคม · บัตรทอง"
            breadcrumbs={dataHubBreadcrumbs()}
            headTitle="Financial Data Hub"
            subNav={<DataHubSubNav active="finance.data-hub" />}
            actions={
                <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <Link href={route('finance.cgd.import')}>
                        <Upload className="mr-2 h-4 w-4" />
                        นำเข้า REP (จ่ายตรง)
                    </Link>
                </Button>
            }
        >
            {!hosxpReady && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    HOSxP ยังไม่พร้อม — นำเข้าไฟล์ได้ แต่ยังเปรียบเทียบยอดไม่ได้จนกว่าการเชื่อมต่อจะพร้อม
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'โมดูลพร้อมใช้',
                        value: stats.ready_modules.toLocaleString(),
                        hint: `${stats.planned_modules} โมดูลเตรียมรองรับ`,
                        icon: FileCheck2,
                    },
                    {
                        label: 'ไฟล์ REP (จ่ายตรง)',
                        value: stats.batch_count.toLocaleString(),
                        hint: `${stats.row_count.toLocaleString()} รายการ`,
                        icon: ClipboardList,
                    },
                    {
                        label: 'ยอดพึงรับรวม',
                        value: money(stats.total_approved),
                        hint: 'จาก Statement จ่ายตรง',
                        icon: Wallet,
                    },
                    {
                        label: 'ยอดขาดล่าสุด',
                        value: money(stats.latest_shortfall),
                        hint: `${stats.latest_matched_short} รายการขาดเงิน`,
                        icon: FileWarning,
                        danger: true,
                    },
                ].map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.label}
                            className={cn(
                                'rounded-2xl border p-4',
                                card.danger ? 'border-rose-100 bg-rose-50/70' : 'border-slate-100 bg-white',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-slate-500">{card.label}</div>
                                <Icon className={cn('h-4 w-4', card.danger ? 'text-rose-500' : 'text-emerald-600')} />
                            </div>
                            <div className={cn('mt-2 text-xl font-bold', card.danger ? 'text-rose-700' : 'text-slate-900')}>
                                {card.value}
                            </div>
                            <div className="text-xs text-slate-500">{card.hint}</div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6">
                <Panel
                    title="โมดูลตรวจข้อมูลตามสิทธิ์"
                    description="แต่ละสิทธิ์มีหน้าตรวจสอบและหน้าต่างนำเข้าของตัวเอง ไม่ใช้หน้ากลางรวม"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        {schemes.map((scheme) => {
                            const Icon = iconMap[scheme.icon as keyof typeof iconMap] || FileCheck2;
                            const ready = scheme.status === 'ready';

                            return (
                                <div
                                    key={scheme.key}
                                    className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/50 p-5"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div
                                            className={cn(
                                                'flex h-12 w-12 items-center justify-center rounded-2xl',
                                                toneBox[scheme.tone] || toneBox.emerald,
                                            )}
                                        >
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-100">
                                                {scheme.subtitle}
                                            </span>
                                            <StatusPill
                                                label={ready ? 'พร้อมใช้' : 'เตรียมรองรับ'}
                                                className={
                                                    ready
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-amber-200 bg-amber-50 text-amber-800'
                                                }
                                            />
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900">{scheme.title}</h3>
                                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{scheme.description}</p>

                                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                        <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                            <Link href={scheme.dashboard_url}>
                                                เข้าตรวจข้อมูล
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button asChild variant="outline" className="rounded-xl">
                                            <Link href={scheme.import_url}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                {scheme.import_label}
                                            </Link>
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-[11px] text-slate-400">{scheme.import_hint}</p>
                                </div>
                            );
                        })}
                    </div>
                </Panel>
            </div>
        </QualityPage>
    );
}
