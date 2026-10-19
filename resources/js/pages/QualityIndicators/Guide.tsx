import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BookOpen,
    Calculator,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    ExternalLink,
    FileDown,
    FileText,
    GitBranch,
    HelpCircle,
    Layers,
    LayoutDashboard,
    Lightbulb,
    Link2,
    ListOrdered,
    LucideIcon,
    Pencil,
    PlusCircle,
    Search,
    Settings,
    ShieldCheck,
    Sparkles,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    Trash2,
    ShieldCheck,
    Calculator,
    GitBranch,
    FileText,
    Activity,
    CheckCircle2,
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

// แผนที่หมวดหมู่เพื่อการจัดกลุ่มและการกรอง
interface CategoryConfig {
    id: string;
    label: string;
    sectionIds: string[];
}

const CATEGORIES: CategoryConfig[] = [
    {
        id: 'all',
        label: 'ทั้งหมด',
        sectionIds: [],
    },
    {
        id: 'structure',
        label: 'โครงสร้าง & วงจร KPI',
        sectionIds: ['overview', 'levels', 'create'],
    },
    {
        id: 'data',
        label: 'การบันทึกผลงวด & รหัสลูก',
        sectionIds: ['entries', 'aliases', 'trash'],
    },
    {
        id: 'reporting',
        label: 'แดชบอร์ด & รายงาน',
        sectionIds: ['dashboard', 'import', 'pdf'],
    },
    {
        id: 'ecosystem',
        label: 'เชื่อมโยงศูนย์พัฒนาคุณภาพ',
        sectionIds: ['ecosystem'],
    },
    {
        id: 'faq',
        label: 'คำถามที่พบบ่อย & แอดมิน',
        sectionIds: ['faq', 'admin-edit'],
    },
];

// ปุ่มลัดเข้าสู่ฟังก์ชันจริงในระบบสำหรับแต่ละหัวข้อ
const SECTION_ACTIONS: Record<string, { label: string; href: string; icon: LucideIcon }> = {
    overview: { label: 'เปิดรายการตัวชี้วัด', href: route('quality-indicators.index'), icon: ListOrdered },
    levels: { label: 'ดูตัวชี้วัดตามระดับ', href: route('quality-indicators.index'), icon: Layers },
    create: { label: 'สร้างตัวชี้วัดใหม่', href: route('quality-indicators.index'), icon: PlusCircle },
    entries: { label: 'บันทึกผลงวด', href: route('quality-indicators.index'), icon: Calculator },
    aliases: { label: 'ดูและจัดการรหัสลูก', href: route('quality-indicators.index'), icon: GitBranch },
    dashboard: { label: 'เปิดแดชบอร์ดภาพรวม', href: route('quality-indicators.dashboard'), icon: LayoutDashboard },
    import: { label: 'ระบบนำเข้า Excel', href: route('quality-indicators.import.index'), icon: Upload },
    trash: { label: 'เปิดดูถังขยะตัวชี้วัด', href: route('quality-indicators.index', { view: 'trash' }), icon: Trash2 },
    pdf: { label: 'ส่งออกรายงาน PDF', href: route('quality-indicators.index'), icon: FileDown },
    ecosystem: { label: 'ไประบบติดตามทบทวน (QA)', href: route('quality-assurance.index'), icon: ShieldCheck },
};

export default function Guide({ guide, can_edit }: { guide: GuidePayload; can_edit: boolean }) {
    const rawSections = guide.sections ?? [];
    const [active, setActive] = useState(rawSections[0]?.id ?? '');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // กรองหัวข้อตามหมวดหมู่และคำค้นหา
    const filteredSections = useMemo(() => {
        let list = rawSections;

        if (selectedCategory !== 'all') {
            const cat = CATEGORIES.find((c) => c.id === selectedCategory);
            if (cat) {
                list = list.filter((s) => cat.sectionIds.includes(s.id));
            }
        }

        const query = searchQuery.trim().toLowerCase();
        if (query) {
            list = list.filter((s) => {
                const inTitle = s.title.toLowerCase().includes(query);
                const inSummary = s.summary?.toLowerCase().includes(query) ?? false;
                const inBody = s.body?.toLowerCase().includes(query) ?? false;
                const inBullets = s.bullets?.some((b) => b.toLowerCase().includes(query)) ?? false;
                const inSteps = s.steps?.some((step) => step.toLowerCase().includes(query)) ?? false;
                return inTitle || inSummary || inBody || inBullets || inSteps;
            });
        }

        return list;
    }, [rawSections, selectedCategory, searchQuery]);

    useEffect(() => {
        if (!filteredSections.find((s) => s.id === active) && filteredSections[0]) {
            setActive(filteredSections[0].id);
        }
    }, [filteredSections, active]);

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
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัดคุณภาพ"
            title={guide.title}
            subtitle={guide.subtitle || 'คู่มือการใช้งานระบบตัวชี้วัดคุณภาพ โรงพยาบาลค่ายสุรสิงหนาท'}
            breadcrumbs={breadcrumbs}
            headTitle="คู่มือตัวชี้วัดคุณภาพ"
            subNav={<IndicatorsSubNav active="quality-indicators.guide" />}
            actions={
                can_edit ? (
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700 shadow-sm transition">
                        <Link href={route('quality-indicators.guide.edit')}>
                            <Pencil className="mr-2 h-4 w-4" />
                            แก้ไขคู่มือ
                        </Link>
                    </Button>
                ) : undefined
            }
        >
            <div className="space-y-6">
                {/* Hero Banner & KPI Lifecycle Roadmap */}
                <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-800">
                                <Sparkles className="h-3.5 w-3.5" />
                                ครอบคลุม 12 หมวดหมู่การใช้งานระบบ
                            </div>
                            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
                                วงจรการบริหารตัวชี้วัดคุณภาพตามมาตรฐาน HA (PDCA Cycle)
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                โรงพยาบาลค่ายสุรสิงหนาท — วงจรติดตามผลลัพธ์การดูแลผู้ป่วยและการพัฒนาคุณภาพอย่างต่อเนื่อง
                            </p>
                        </div>

                        {/* Quick links header */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: 'รายการตัวชี้วัด', href: route('quality-indicators.index'), icon: ListOrdered },
                                { label: 'ภาพรวมแดชบอร์ด', href: route('quality-indicators.dashboard'), icon: LayoutDashboard },
                                { label: 'นำเข้า Excel', href: route('quality-indicators.import.index'), icon: Upload },
                                { label: 'ถังขยะตัวชี้วัด', href: route('quality-indicators.index', { view: 'trash' }), icon: Trash2 },
                                { label: 'ติดตามทบทวน (QA)', href: route('quality-assurance.index'), icon: ShieldCheck },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href + item.label}
                                        href={item.href}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-2xs transition hover:bg-emerald-50 hover:text-emerald-900"
                                    >
                                        <Icon className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Visual 5-Step KPI Lifecycle */}
                    <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-5">
                        {[
                            { step: '1', title: 'กำหนดตัวชี้วัด', desc: 'เลือกระดับ (องค์กร/แผนก/ทีม) ตั้งเป้าหมาย & สูตร', tone: 'emerald' },
                            { step: '2', title: 'บันทึกผลงวด', desc: 'ใส่ตัวตั้ง/ตัวหาร คิดผลลัพธ์ % อัตโนมัติ', tone: 'teal' },
                            { step: '3', title: 'ติดตามแดชบอร์ด', desc: 'ตรวจผ่าน/ไม่ผ่านเกณฑ์ และดูกราฟแนวโน้ม', tone: 'cyan' },
                            { step: '4', title: 'ทบทวนคุณภาพ', desc: 'หากไม่ผ่านเป้า เชื่อมโยงสู่ระบบ QA & CQI', tone: 'violet' },
                            { step: '5', title: 'รายงาน PDF', desc: 'ส่งออกรายงานกลุ่มหรือเดี่ยวสำหรับที่ประชุม', tone: 'indigo' },
                        ].map((item, idx) => (
                            <div
                                key={item.step}
                                className="relative rounded-2xl border border-slate-200/70 bg-white/90 p-3.5 shadow-2xs transition hover:border-emerald-300"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                                        {item.step}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">{item.title}</span>
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                                {idx < 4 && (
                                    <div className="hidden text-slate-300 md:absolute md:-right-2 md:top-1/2 md:-translate-y-1/2 md:block">
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={cn(
                                        'rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer',
                                        isSelected
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900',
                                    )}
                                >
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[220px] max-w-xs">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="ค้นหาหัวข้อ / คำสำคัญ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8.5 rounded-xl border-slate-200 pl-8.5 pr-8 text-xs focus-visible:ring-emerald-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Grid: TOC Sidebar & Content Cards */}
                <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    {/* Sidebar TOC */}
                    <aside className="lg:sticky lg:top-4 lg:self-start">
                        <Panel title="สารบัญคู่มือ" description={`แสดง ${filteredSections.length} จาก ${rawSections.length} หัวข้อ`}>
                            <nav className="max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto pr-1">
                                {filteredSections.length === 0 ? (
                                    <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                                        ไม่พบหัวข้อที่ตรงกับเงื่อนไขการค้นหา
                                    </div>
                                ) : (
                                    filteredSections.map((section, index) => {
                                        const Icon = sectionIcon(section.icon);
                                        const isActive = active === section.id;

                                        return (
                                            <button
                                                key={section.id}
                                                type="button"
                                                onClick={() => scrollTo(section.id)}
                                                className={cn(
                                                    'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition cursor-pointer',
                                                    isActive
                                                        ? 'bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-200'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                                                        isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-100/70 text-emerald-700',
                                                    )}
                                                >
                                                    {index + 1}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-1.5 text-xs leading-snug">
                                                        <Icon className="h-3 w-3 shrink-0 opacity-70" />
                                                        <span className="line-clamp-2">{section.title}</span>
                                                    </span>
                                                    {section.summary ? (
                                                        <span className="mt-0.5 block text-[10px] font-normal leading-snug text-slate-400 line-clamp-1">
                                                            {section.summary}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </nav>

                            {(guide.updated_at || guide.updated_by_name) && (
                                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500">
                                    อัปเดตล่าสุด: {guide.updated_at || '-'}
                                    {guide.updated_by_name ? ` โดย ${guide.updated_by_name}` : ''}
                                </div>
                            )}
                        </Panel>
                    </aside>

                    {/* Content Section Cards */}
                    <div className="space-y-6">
                        {/* Intro banner */}
                        {guide.intro && !searchQuery && selectedCategory === 'all' ? (
                            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-2xs">
                                <div className="flex items-center gap-2 text-emerald-800">
                                    <Sparkles className="h-4.5 w-4.5" />
                                    <span className="font-bold text-sm">บทนำและข้อแนะนำเบื้องต้น</span>
                                </div>
                                <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                                    {paragraphs(guide.intro).map((p) => (
                                        <p key={p}>{p}</p>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {filteredSections.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                                <HelpCircle className="mx-auto h-10 w-10 text-slate-400" />
                                <h3 className="mt-3 text-base font-bold text-slate-700">ไม่พบหัวข้อคู่มือ</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    ไม่พบหัวข้อที่ตรงกับคำค้นหา "{searchQuery}" ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                    }}
                                    className="mt-4 rounded-xl"
                                >
                                    ล้างเงื่อนไขการค้นหา
                                </Button>
                            </div>
                        ) : (
                            filteredSections.map((section, index) => {
                                const Icon = sectionIcon(section.icon);
                                const bodyParts = paragraphs(section.body);
                                const action = SECTION_ACTIONS[section.id];

                                return (
                                    <section key={section.id} id={`qi-guide-${section.id}`} className="scroll-mt-6">
                                        <Panel
                                            title={`${index + 1}. ${section.title}`}
                                            description={section.summary || undefined}
                                            action={
                                                action ? (
                                                    <Button asChild size="sm" variant="outline" className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                                                        <Link href={action.href}>
                                                            <action.icon className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                                            {action.label}
                                                        </Link>
                                                    </Button>
                                                ) : undefined
                                            }
                                        >
                                            {/* Header with big icon and body text */}
                                            <div className="flex items-start gap-4">
                                                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:flex shadow-2xs">
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-2.5 text-sm leading-relaxed text-slate-600">
                                                    {bodyParts.map((p) => (
                                                        <p key={p}>{p}</p>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Key Takeaways / Bullets */}
                                            {section.bullets && section.bullets.length > 0 ? (
                                                <div className="mt-5">
                                                    <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                        สิ่งที่ควรรู้ & สาระสำคัญ
                                                    </h4>
                                                    <ul className="grid gap-2 sm:grid-cols-2">
                                                        {section.bullets.map((item) => (
                                                            <li
                                                                key={item}
                                                                className="rounded-2xl border border-emerald-100/80 bg-emerald-50/30 px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed"
                                                            >
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null}

                                            {/* Step-by-Step Instructions */}
                                            {section.steps && section.steps.length > 0 ? (
                                                <div className="mt-5">
                                                    <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                                                        <ListOrdered className="h-4 w-4 text-emerald-600" />
                                                        ขั้นตอนปฏิบัติทีละสเต็ป
                                                    </h4>
                                                    <ol className="space-y-2">
                                                        {section.steps.map((step, stepIndex) => (
                                                            <li
                                                                key={`${section.id}-step-${stepIndex}`}
                                                                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 text-xs text-slate-700 shadow-2xs"
                                                            >
                                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                                                    {stepIndex + 1}
                                                                </span>
                                                                <span className="leading-relaxed">{step}</span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            ) : null}

                                            {/* Tips Callout */}
                                            {section.tips && section.tips.length > 0 ? (
                                                <div className="mt-5 space-y-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
                                                    {section.tips.map((tip) => (
                                                        <div key={tip} className="flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                                                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                                            <span><strong className="font-semibold">ข้อแนะนำ: </strong>{tip}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

                                            {/* Warnings Callout */}
                                            {section.warnings && section.warnings.length > 0 ? (
                                                <div className="mt-5 space-y-2 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4">
                                                    {section.warnings.map((warning) => (
                                                        <div key={warning} className="flex items-start gap-2.5 text-xs text-rose-900 leading-relaxed">
                                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                                                            <span><strong className="font-semibold">ข้อควรระวัง: </strong>{warning}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </Panel>
                                    </section>
                                );
                            })
                        )}

                        {/* Footer Help Banner */}
                        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 p-5 shadow-2xs">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                                        คำแนะนำสำหรับการดำเนินงานคุณภาพให้ได้ประโยชน์สูงสุด
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        บันทึกผลรายงวดสม่ำเสมอ · เชื่อมโยงรหัสลูกเพื่อลดงานซ้ำซ้อน · หากไม่ผ่านเป้าให้เปิดการทบทวน QA เพื่อวางแผนแก้ไขทันที
                                    </p>
                                </div>
                                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
                                    <Link href={route('quality-indicators.index')}>
                                        เริ่มต้นใช้งานตัวชี้วัด
                                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </QualityPage>
    );
}
