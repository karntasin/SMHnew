import React, { useMemo, useState } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    List,
    CheckCircle2,
    Zap,
    PenLine,
    Info,
    FileSearch,
} from 'lucide-react';
import { QualityPage, StatCard, Panel, StatusPill } from '@/components/quality/quality-ui';
import MraSubNav, { mraBreadcrumbs } from './MraSubNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Criteria {
    id: number;
    code: string;
    group_key?: string | null;
    group_title?: string | null;
    name: string;
    name_en: string | null;
    description: string | null;
    audit_guide: string | null;
    data_type: 'auto' | 'manual' | 'both';
    max_score: number;
    is_required: boolean;
    is_bonus?: boolean;
    is_active: boolean;
    sort_order: number;
}

interface Category {
    id: number;
    code: string;
    audit_type?: string;
    section_key?: string | null;
    name: string;
    name_en: string | null;
    description: string | null;
    hint?: string | null;
    is_conditional?: boolean;
    is_required_section?: boolean;
    is_active: boolean;
    sort_order: number;
    criteria: Criteria[];
}

interface Props {
    categories: Category[];
    standardLabel?: string;
    passingScore?: number;
    opdCount?: number;
    ipdCount?: number;
}

export default function MraSettings({
    categories,
    standardLabel = 'Medical Record Audit Guideline ปี 2563 (สปสช./สรพ./HA)',
    passingScore = 80,
    opdCount = 0,
    ipdCount = 0,
}: Props) {
    const [channel, setChannel] = useState<'all' | 'opd' | 'ipd'>('all');

    const filtered = useMemo(
        () => (channel === 'all' ? categories : categories.filter((c) => c.audit_type === channel)),
        [categories, channel],
    );

    const getDataTypeBadge = (dataType: string) => {
        switch (dataType) {
            case 'auto':
                return <StatusPill label="Auto" className="border-emerald-200 bg-emerald-50 text-emerald-700" />;
            case 'manual':
                return <StatusPill label="Manual" className="border-slate-200 bg-slate-50 text-slate-600" />;
            case 'both':
                return <StatusPill label="Both" className="border-indigo-200 bg-indigo-50 text-indigo-700" />;
            default:
                return <StatusPill label={dataType} className="border-slate-200 bg-slate-50 text-slate-500" />;
        }
    };

    const totalCriteria = filtered.reduce((sum, cat) => sum + cat.criteria.length, 0);
    const autoCriteria = filtered.reduce(
        (sum, cat) => sum + cat.criteria.filter((c) => c.data_type !== 'manual').length,
        0,
    );

    return (
        <QualityPage
            tone="indigo"
            icon={FileSearch}
            badge="ศูนย์พัฒนาคุณภาพ · MRA"
            title="ตั้งค่าระบบ MRA"
            subtitle={standardLabel}
            breadcrumbs={mraBreadcrumbs({ title: 'ตั้งค่า', href: route('mra.settings') })}
            headTitle="ตั้งค่า MRA"
            subNav={<MraSubNav active="mra.settings" />}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="หมวด OPD" value={opdCount || categories.filter((c) => c.audit_type === 'opd').length} icon={List} tone="indigo" />
                <StatCard label="หมวด IPD" value={ipdCount || categories.filter((c) => c.audit_type === 'ipd').length} icon={List} tone="sky" />
                <StatCard label="เกณฑ์ที่แสดง" value={totalCriteria} icon={CheckCircle2} tone="emerald" />
                <StatCard label="ตรวจอัตโนมัติได้" value={autoCriteria} icon={Zap} tone="amber" />
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 text-indigo-600" />
                    <div className="space-y-1 text-sm text-indigo-800">
                        <h4 className="font-semibold text-indigo-900">เกณฑ์การตรวจตามคู่มือ MRA ปี 2563</h4>
                        <p>
                            ปรับให้สอดคล้องกับระบบ mra2: <strong>OPD 7 หมวด</strong> (รวม Follow up / Operative / Consent)
                            และ <strong>IPD 12 หมวด</strong> (Discharge Summary, History, PE, Progress, Consult, Anesthetic, OR, Labour, Rehab, Nurses&apos; Note)
                        </p>
                        <p>
                            คะแนนรายข้อ ผ่าน=1 / ไม่ผ่าน=0 / N/A ไม่คิดคะแนน · เกณฑ์ผ่าน {passingScore}% · หมวดเงื่อนไขที่ไม่เกี่ยวข้องให้เลือก N/A ทั้งหมวด
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {([
                    ['all', 'ทั้งหมด'],
                    ['opd', 'ผู้ป่วยนอก (OPD)'],
                    ['ipd', 'ผู้ป่วยใน (IPD)'],
                ] as const).map(([key, label]) => (
                    <Button
                        key={key}
                        type="button"
                        variant={channel === key ? 'default' : 'outline'}
                        className={cn('rounded-xl', channel === key && 'bg-indigo-600 hover:bg-indigo-700')}
                        onClick={() => setChannel(key)}
                    >
                        {label}
                    </Button>
                ))}
            </div>

            <Panel title="รายการหมวดและเกณฑ์">
                <Accordion type="multiple" className="w-full" defaultValue={filtered.slice(0, 3).map((c) => c.code)}>
                    {filtered.map((category) => (
                        <AccordionItem key={category.id} value={category.code}>
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex flex-wrap items-center gap-2 text-left">
                                    <StatusPill
                                        label={(category.audit_type || '-').toUpperCase()}
                                        className={
                                            category.audit_type === 'opd'
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : 'border-violet-200 bg-violet-50 text-violet-700'
                                        }
                                    />
                                    <span className="font-mono text-xs text-slate-500">{category.code}</span>
                                    <span className="font-semibold text-slate-900">{category.name}</span>
                                    {category.is_conditional ? (
                                        <StatusPill label="เงื่อนไข" className="border-amber-200 bg-amber-50 text-amber-800" />
                                    ) : (
                                        <StatusPill label="บังคับ" className="border-sky-200 bg-sky-50 text-sky-800" />
                                    )}
                                    <span className="text-xs text-slate-500">{category.criteria.length} ข้อ</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                {category.hint ? <p className="mb-3 text-sm text-slate-500">{category.hint}</p> : null}
                                <div className="space-y-2">
                                    {category.criteria.map((criterion) => (
                                        <div
                                            key={criterion.id}
                                            className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                                        >
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-xs text-slate-500">{criterion.code}</span>
                                                    {criterion.is_bonus ? (
                                                        <StatusPill label="โบนัส +1" className="border-amber-200 bg-amber-50 text-amber-800" />
                                                    ) : null}
                                                    {criterion.group_title ? (
                                                        <StatusPill label={criterion.group_title} className="border-sky-200 bg-sky-50 text-sky-800" />
                                                    ) : null}
                                                </div>
                                                <div className="font-medium text-slate-800">{criterion.name}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getDataTypeBadge(criterion.data_type)}
                                                <span className="text-xs text-slate-500">1 คะแนน</span>
                                                {criterion.data_type === 'manual' ? (
                                                    <PenLine className="h-3.5 w-3.5 text-slate-400" />
                                                ) : (
                                                    <Zap className="h-3.5 w-3.5 text-emerald-500" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </Panel>
        </QualityPage>
    );
}
