import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    guideCategories,
    guideModules,
    quickStartSteps,
    faqItems,
} from '@/data/user-guide';
import {
    BookOpen,
    Search,
    ChevronRight,
    Lightbulb,
    Users,
    ExternalLink,
    HelpCircle,
    Sparkles,
    ListChecks,
    X,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'แดชบอร์ด', href: '/dashboard' },
    { title: 'คู่มือการใช้งาน', href: '/help' },
];

export default function HelpIndex({
    pdfAvailable = false,
    pdfUrl = null,
}: {
    pdfAvailable?: boolean;
    pdfUrl?: string | null;
}) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');

    const filteredModules = useMemo(() => {
        const q = search.trim().toLowerCase();

        return guideModules.filter((mod) => {
            const matchCategory = activeCategory === 'all' || mod.category === activeCategory;
            if (!matchCategory) return false;
            if (!q) return true;

            const haystack = [
                mod.title,
                mod.subtitle,
                mod.audience,
                ...mod.features,
                ...mod.steps.map((s) => `${s.title} ${s.description}`),
                ...(mod.tips ?? []),
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [search, activeCategory]);

    const filteredFaq = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return faqItems;
        return faqItems.filter(
            (item) =>
                item.question.toLowerCase().includes(q) ||
                item.answer.toLowerCase().includes(q),
        );
    }, [search]);

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="คู่มือการใช้งาน">
            <Head title="คู่มือการใช้งาน" />

            <div className="mx-auto max-w-6xl space-y-6 pb-10">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-violet-800 to-purple-700 p-8 text-white shadow-2xl md:p-10">
                    <div className="absolute inset-0 opacity-[0.07]" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }} />
                    <div className="absolute -right-16 -top-16 size-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
                    <div className="absolute -bottom-20 -left-10 size-48 rounded-full bg-indigo-300/15 blur-2xl" />

                    <div className="relative z-10">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider text-purple-100">
                            SMH HOSPITAL DASHBOARD
                        </div>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/25">
                                <BookOpen className="size-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold md:text-3xl">คู่มือการใช้งานระบบ</h1>
                                <p className="text-sm text-purple-200/90">ฉบับปรับปรุงใหม่ — กระชับ อ่านง่าย มีภาพหน้าจอจริง</p>
                            </div>
                        </div>
                        <p className="max-w-2xl text-purple-100/90 leading-relaxed">
                            คู่มือฉบับนี้ครอบคลุมทุกระบบในแอปพลิเคชัน ออกแบบสำหรับผู้ใช้งานครั้งแรก
                            ค้นหาได้ทันที และมีขั้นตอนใช้งานแบบทีละขั้น
                        </p>

                        {pdfAvailable && pdfUrl && (
                            <div className="mt-4 flex flex-wrap gap-3">
                                <Button asChild size="sm" className="rounded-lg bg-white text-purple-700 hover:bg-purple-50">
                                    <a href={pdfUrl} download="SMH-คู่มือการใช้งาน.pdf">
                                        <Download className="size-4" />
                                        ดาวน์โหลดคู่มือ PDF
                                    </a>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="rounded-lg border-white/40 text-white hover:bg-white/10">
                                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="size-4" />
                                        เปิด PDF ในแท็บใหม่
                                    </a>
                                </Button>
                            </div>
                        )}

                        <div className="relative mt-6 max-w-xl">
                            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหาระบบ ฟีเจอร์ หรือคำถามที่พบบ่อย..."
                                className="h-12 rounded-xl border-0 bg-white pl-12 pr-10 text-foreground shadow-lg placeholder:text-muted-foreground"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Quick Start */}
                <section>
                    <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="size-5 text-primary" />
                        <h2 className="text-lg font-bold">เริ่มต้นใน 4 ขั้นตอน</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {quickStartSteps.map((item) => (
                            <div
                                key={item.step}
                                className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                                    {item.step}
                                </div>
                                <h3 className="font-semibold">{item.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Category Filter */}
                <section>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant={activeCategory === 'all' ? 'default' : 'outline'}
                            onClick={() => setActiveCategory('all')}
                            className="rounded-full"
                        >
                            ทั้งหมด
                        </Button>
                        {guideCategories.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <Button
                                    key={cat.id}
                                    size="sm"
                                    variant={activeCategory === cat.id ? 'default' : 'outline'}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className="rounded-full gap-1.5"
                                >
                                    <Icon className="size-3.5" />
                                    {cat.label}
                                </Button>
                            );
                        })}
                    </div>

                    {activeCategory !== 'all' && (
                        <p className="mb-4 text-sm text-muted-foreground">
                            {guideCategories.find((c) => c.id === activeCategory)?.description}
                        </p>
                    )}
                </section>

                {/* Module Guides */}
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ListChecks className="size-5 text-primary" />
                            <h2 className="text-lg font-bold">
                                คู่มือแต่ละระบบ
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    ({filteredModules.length} รายการ)
                                </span>
                            </h2>
                        </div>
                    </div>

                    {filteredModules.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                            <HelpCircle className="mx-auto mb-3 size-10 opacity-40" />
                            <p>ไม่พบเนื้อหาที่ตรงกับการค้นหา</p>
                            <Button variant="link" onClick={() => { setSearch(''); setActiveCategory('all'); }}>
                                ล้างตัวกรอง
                            </Button>
                        </div>
                    ) : (
                        <Accordion type="multiple" className="space-y-3">
                            {filteredModules.map((mod) => {
                                const Icon = mod.icon;
                                return (
                                    <AccordionItem
                                        key={mod.id}
                                        value={mod.id}
                                        className="overflow-hidden rounded-xl border border-border/60 bg-card px-0 shadow-sm"
                                    >
                                        <AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                                            <div className="flex min-w-0 flex-1 items-start gap-4 text-left">
                                                <div
                                                    className={cn(
                                                        'flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                                                        mod.gradient,
                                                    )}
                                                >
                                                    <Icon className="size-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-semibold">{mod.title}</h3>
                                                        {mod.href && (
                                                            <Link
                                                                href={mod.href}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                            >
                                                                เปิดระบบ
                                                                <ExternalLink className="size-3" />
                                                            </Link>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                                        {mod.subtitle}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            <Users className="mr-1 size-3" />
                                                            {mod.audience}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="px-5 pb-5">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                {/* Features */}
                                                <div>
                                                    <h4 className="mb-2 text-sm font-semibold text-primary">
                                                        ทำอะไรได้บ้าง
                                                    </h4>
                                                    <ul className="space-y-1.5">
                                                        {mod.features.map((feature, i) => (
                                                            <li
                                                                key={i}
                                                                className="flex items-start gap-2 text-sm text-muted-foreground"
                                                            >
                                                                <ChevronRight className="mt-0.5 size-4 shrink-0 text-primary/60" />
                                                                {feature}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Steps */}
                                                <div>
                                                    <h4 className="mb-2 text-sm font-semibold text-primary">
                                                        ขั้นตอนการใช้งาน
                                                    </h4>
                                                    <ol className="space-y-3">
                                                        {mod.steps.map((step, i) => (
                                                            <li key={i} className="flex gap-3">
                                                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                                    {i + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="text-sm font-medium">{step.title}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {step.description}
                                                                    </p>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </div>

                                            {mod.tips && mod.tips.length > 0 && (
                                                <div className="mt-4 rounded-lg border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                                                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                                                        <Lightbulb className="size-4" />
                                                        เคล็ดลับ
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {mod.tips.map((tip, i) => (
                                                            <li key={i} className="text-sm text-amber-900/80 dark:text-amber-200/80">
                                                                • {tip}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {mod.href && (
                                                <div className="mt-4">
                                                    <Button asChild size="sm" className="rounded-lg">
                                                        <Link href={mod.href}>
                                                            ไปที่ {mod.title}
                                                            <ChevronRight className="size-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </section>

                {/* FAQ */}
                <section>
                    <div className="mb-4 flex items-center gap-2">
                        <HelpCircle className="size-5 text-primary" />
                        <h2 className="text-lg font-bold">คำถามที่พบบ่อย</h2>
                    </div>
                    <Accordion type="single" collapsible className="rounded-xl border border-border/60 bg-card">
                        {filteredFaq.map((item, i) => (
                            <AccordionItem key={i} value={`faq-${i}`} className="border-border/40 px-4">
                                <AccordionTrigger className="text-left font-medium hover:no-underline">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed">
                                    {item.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>

                {/* Footer CTA */}
                <section className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
                    <h3 className="font-semibold">ยังต้องการความช่วยเหลือ?</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        ติดต่อผู้ดูแลระบบของโรงพยาบาล หรือแจ้งปัญหาผ่านระบบแจ้งซ่อม IT
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/maintenance/requests/create">แจ้งปัญหาระบบ IT</Link>
                        </Button>
                        <Button asChild size="sm">
                            <Link href="/dashboard">กลับแดชบอร์ด</Link>
                        </Button>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
