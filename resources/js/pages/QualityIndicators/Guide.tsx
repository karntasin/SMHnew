import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    ClipboardList,
    FileDown,
    HelpCircle,
    Layers,
    LayoutDashboard,
    Lightbulb,
    Link2,
    ListOrdered,
    LucideIcon,
    Pencil,
    PlusCircle,
    Settings,
    Sparkles,
    Upload,
} from 'lucide-react';
import { QualityPage, Panel } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface GuideSection {
    id: string;
    title: string;
    icon?: string;
    summary?: string;
    body?: string;
    bullets?: string[];
    steps?: string[];
    tips?: string[];
    warnings?: string[];
}

export interface GuidePayload {
    id: number;
    title: string;
    subtitle?: string | null;
    intro?: string | null;
    sections: GuideSection[];
    updated_at?: string | null;
    updated_by_name?: string | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
    Sparkles,
    Layers,
    PlusCircle,
    ClipboardList,
    LayoutDashboard,
    Upload,
    FileDown,
    Link2,
    HelpCircle,
    Settings,
    BookOpen,
};

function sectionIcon(name?: string): LucideIcon {
    if (!name) return BookOpen;
    return ICON_MAP[name] ?? BookOpen;
}

function paragraphs(text?: string): string[] {
    if (!text) return [];
    return text
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);
}

export default function Guide({ guide, can_edit }: { guide: GuidePayload; can_edit: boolean }) {
    const sections = guide.sections ?? [];
    const [active, setActive] = useState(sections[0]?.id ?? '');

    useEffect(() => {
        if (!sections.find((s) => s.id === active) && sections[0]) {
            setActive(sections[0].id);
        }
    }, [sections, active]);

    const breadcrumbs = useMemo(
        () => [
            { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
            { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
            { title: 'คู่มือใช้งาน', href: route('quality-indicators.guide') },
        ],
        [],
    );

    const scrollTo = (id: string) => {
        setActive(id);
        document.getElementById(`qi-guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <QualityPage
            tone="emerald"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัด"
            title={guide.title}
            subtitle={guide.subtitle || 'คู่มือการใช้งานระบบตัวชี้วัดคุณภาพ'}
            breadcrumbs={breadcrumbs}
            headTitle="คู่มือตัวชี้วัดคุณภาพ"
            subNav={<IndicatorsSubNav active="quality-indicators.guide" />}
            actions={
                can_edit ? (
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href={route('quality-indicators.guide.edit')}>
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไขคู่มือ
                        </Link>
                    </Button>
                ) : undefined
            }
        >
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="lg:sticky lg:top-4 lg:self-start">
                    <Panel title="สารบัญ" description="คลิกเพื่อไปยังหัวข้อ">
                        <nav className="space-y-1">
                            {sections.map((section, index) => {
                                const Icon = sectionIcon(section.icon);
                                const isActive = active === section.id;

                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => scrollTo(section.id)}
                                        className={cn(
                                            'flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition',
                                            isActive
                                                ? 'bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200'
                                                : 'text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                                                isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700',
                                            )}
                                        >
                                            {index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5 text-sm leading-snug">
                                                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                <span className="line-clamp-2">{section.title}</span>
                                            </span>
                                            {section.summary ? (
                                                <span className="mt-0.5 block text-[11px] font-normal leading-snug text-slate-500 line-clamp-2">
                                                    {section.summary}
                                                </span>
                                            ) : null}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>

                        {(guide.updated_at || guide.updated_by_name) && (
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500">
                                อัปเดตล่าสุด
                                {guide.updated_at ? ` ${guide.updated_at}` : ''}
                                {guide.updated_by_name ? ` โดย ${guide.updated_by_name}` : ''}
                            </div>
                        )}
                    </Panel>
                </aside>

                <div className="space-y-6">
                    {guide.intro ? (
                        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
                            <div className="flex items-center gap-2 text-emerald-800">
                                <Sparkles className="h-5 w-5" />
                                <span className="font-bold">เริ่มต้นอ่านคู่มือนี้</span>
                            </div>
                            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                                {paragraphs(guide.intro).map((p) => (
                                    <p key={p}>{p}</p>
                                ))}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {[
                                    { label: 'รายการตัวชี้วัด', href: route('quality-indicators.index') },
                                    { label: 'ภาพรวม', href: route('quality-indicators.dashboard') },
                                    { label: 'นำเข้า Excel', href: route('quality-indicators.import.index') },
                                ].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {sections.map((section, index) => {
                        const Icon = sectionIcon(section.icon);
                        const bodyParts = paragraphs(section.body);

                        return (
                            <section key={section.id} id={`qi-guide-${section.id}`} className="scroll-mt-6">
                                <Panel
                                    title={`${index + 1}. ${section.title}`}
                                    description={section.summary || undefined}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:flex">
                                            <Icon className="h-7 w-7" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-3 text-sm leading-relaxed text-slate-600">
                                            {bodyParts.map((p) => (
                                                <p key={p}>{p}</p>
                                            ))}
                                        </div>
                                    </div>

                                    {section.bullets && section.bullets.length > 0 ? (
                                        <div className="mt-5">
                                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                สิ่งที่ควรรู้
                                            </h4>
                                            <ul className="grid gap-2 sm:grid-cols-2">
                                                {section.bullets.map((item) => (
                                                    <li
                                                        key={item}
                                                        className="rounded-2xl border border-emerald-50 bg-emerald-50/40 px-3 py-2.5 text-sm text-slate-700"
                                                    >
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {section.steps && section.steps.length > 0 ? (
                                        <div className="mt-5">
                                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <ListOrdered className="h-4 w-4 text-emerald-600" />
                                                ทำตามทีละขั้นตอน
                                            </h4>
                                            <ol className="space-y-2">
                                                {section.steps.map((step, stepIndex) => (
                                                    <li
                                                        key={`${section.id}-step-${stepIndex}`}
                                                        className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-700"
                                                    >
                                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                                                            {stepIndex + 1}
                                                        </span>
                                                        <span className="leading-relaxed">{step}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    ) : null}

                                    {section.tips && section.tips.length > 0 ? (
                                        <div className="mt-5 space-y-2 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                                            {section.tips.map((tip) => (
                                                <div key={tip} className="flex items-start gap-2 text-sm text-amber-900">
                                                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                                                    <span>{tip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {section.warnings && section.warnings.length > 0 ? (
                                        <div className="mt-5 space-y-2 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                                            {section.warnings.map((warning) => (
                                                <div key={warning} className="flex items-start gap-2 text-sm text-rose-800">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                                    <span>{warning}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </Panel>
                            </section>
                        );
                    })}

                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
                        <div className="flex items-center gap-2 font-bold text-emerald-800">
                            <CheckCircle2 className="h-5 w-5" />
                            ใช้งานให้ได้ประโยชน์สูงสุด
                        </div>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            <li>• กำหนดตัวชี้วัดให้ตรงระดับความรับผิดชอบ แล้วบันทึกผลตามงวดอย่างสม่ำเสมอ</li>
                            <li>• ใช้แดชบอร์ดก่อนประชุมคุณภาพ เพื่อเห็นตัวชี้วัดที่ไม่ผ่านเป้าทันที</li>
                            <li>• นำเข้า Excel ผ่านพรีวิวทุกครั้ง และพิมพ์คำยืนยันเมื่อข้อมูลถูกต้องเท่านั้น</li>
                        </ul>
                    </div>
                </div>
            </div>
        </QualityPage>
    );
}
