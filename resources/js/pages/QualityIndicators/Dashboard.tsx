import React from 'react';
import { Link } from '@inertiajs/react';
import { BarChart2, CheckCircle, XCircle, Minus } from 'lucide-react';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';

interface Entry {
    id: number;
    period_date: string;
    result_value: number;
}

interface Indicator {
    id: number;
    code: string;
    name: string;
    target_value: number;
    target_operator: string;
    unit: string;
    entries: Entry[];
}

export default function Dashboard({ indicators }: { indicators: Indicator[] }) {
    const isPass = (indicator: Indicator, value: number) => {
        const target = indicator.target_value;
        switch (indicator.target_operator) {
            case '<': return value < target;
            case '<=': return value <= target;
            case '>': return value > target;
            case '>=': return value >= target;
            case '=': return value === target;
            default: return false;
        }
    };

    const withData = indicators.filter((i) => i.entries[0]);
    const passCount = withData.filter((i) => isPass(i, i.entries[0].result_value)).length;
    const failCount = withData.length - passCount;

    const breadcrumbs = [
        { title: 'ศูนย์คุณภาพ', href: '/quality' },
        { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
        { title: 'ภาพรวม', href: route('quality-indicators.dashboard') },
    ];

    return (
        <QualityPage
            tone="emerald"
            icon={BarChart2}
            badge="ศูนย์คุณภาพ · ตัวชี้วัด"
            title="ภาพรวมตัวชี้วัด"
            subtitle="สถานะล่าสุดของตัวชี้วัดคุณภาพทั้งหมด"
            breadcrumbs={breadcrumbs}
            headTitle="ภาพรวมตัวชี้วัด"
            subNav={<IndicatorsSubNav active="quality-indicators.dashboard" />}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="ตัวชี้วัดทั้งหมด" value={indicators.length} icon={BarChart2} tone="emerald" />
                <StatCard label="มีข้อมูล" value={withData.length} sub={`${indicators.length - withData.length} ไม่มีข้อมูล`} icon={Minus} tone="cyan" />
                <StatCard label="ผ่านเป้าหมาย" value={passCount} icon={CheckCircle} tone="emerald" />
                <StatCard label="ไม่ผ่านเป้าหมาย" value={failCount} icon={XCircle} tone="rose" />
            </div>

            <Panel title="สถานะตัวชี้วัดล่าสุด" description="คลิกเพื่อดูรายละเอียดและบันทึกข้อมูล">
                {indicators.length === 0 ? (
                    <EmptyState text="ยังไม่มีตัวชี้วัด" />
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {indicators.map((indicator) => {
                            const latestEntry = indicator.entries[0];
                            const hasData = !!latestEntry;
                            const value = hasData ? latestEntry.result_value : 0;
                            const pass = hasData ? isPass(indicator, value) : false;

                            return (
                                <Link key={indicator.id} href={route('quality-indicators.show', { indicator: indicator.id })}>
                                    <div className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:border-emerald-200 hover:shadow-md">
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="truncate text-sm font-semibold text-slate-700" title={indicator.name}>
                                                {indicator.code}
                                            </span>
                                            {hasData ? (
                                                <StatusPill
                                                    label={pass ? 'PASS' : 'FAIL'}
                                                    className={
                                                        pass
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                                    }
                                                />
                                            ) : (
                                                <StatusPill label="NO DATA" className="border-slate-200 bg-slate-50 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            {hasData ? `${value} ${indicator.unit}` : '-'}
                                        </div>
                                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{indicator.name}</p>
                                        <div className="mt-4 flex justify-between text-xs text-slate-400">
                                            <span>
                                                Target: {indicator.target_operator} {indicator.target_value}
                                            </span>
                                            <span>
                                                {hasData ? new Date(latestEntry.period_date).toLocaleDateString('th-TH') : ''}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
