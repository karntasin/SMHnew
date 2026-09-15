import React, { useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    Plus,
    RotateCcw,
    Save,
    Trash2,
} from 'lucide-react';
import { QualityPage, Panel, qualityInput } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { GuidePayload, GuideSection } from '@/pages/QualityIndicators/Guide';

const ICON_OPTIONS = [
    'BookOpen',
    'Sparkles',
    'Layers',
    'PlusCircle',
    'ClipboardList',
    'LayoutDashboard',
    'Upload',
    'FileDown',
    'Link2',
    'HelpCircle',
    'Settings',
];

function emptySection(index: number): GuideSection {
    return {
        id: `section-${Date.now()}-${index}`,
        title: 'หัวข้อใหม่',
        icon: 'BookOpen',
        summary: '',
        body: '',
        bullets: [''],
        steps: [''],
        tips: [],
        warnings: [],
    };
}

function ListEditor({
    label,
    hint,
    values,
    onChange,
    placeholder,
}: {
    label: string;
    hint?: string;
    values: string[];
    onChange: (next: string[]) => void;
    placeholder: string;
}) {
    const items = values.length > 0 ? values : [''];

    return (
        <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <Label className="text-slate-700">{label}</Label>
                    {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange([...items, ''])}
                >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    เพิ่ม
                </Button>
            </div>
            <div className="space-y-2">
                {items.map((value, index) => (
                    <div key={`${label}-${index}`} className="flex gap-2">
                        <Textarea
                            value={value}
                            placeholder={placeholder}
                            className={cn(qualityInput, 'min-h-[64px]')}
                            onChange={(e) => {
                                const next = [...items];
                                next[index] = e.target.value;
                                onChange(next);
                            }}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => onChange(items.filter((_, i) => i !== index))}
                            disabled={items.length <= 1 && !items[0]}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function GuideEdit({ guide }: { guide: GuidePayload }) {
    const [resetOpen, setResetOpen] = useState(false);
    const { data, setData, put, processing, errors } = useForm({
        title: guide.title,
        subtitle: guide.subtitle ?? '',
        intro: guide.intro ?? '',
        sections: (guide.sections?.length ? guide.sections : [emptySection(0)]).map((section) => ({
            ...section,
            bullets: section.bullets?.length ? section.bullets : [''],
            steps: section.steps?.length ? section.steps : [''],
            tips: section.tips ?? [],
            warnings: section.warnings ?? [],
        })),
    });

    const breadcrumbs = useMemo(
        () => [
            { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
            { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
            { title: 'คู่มือใช้งาน', href: route('quality-indicators.guide') },
            { title: 'แก้ไขคู่มือ', href: route('quality-indicators.guide.edit') },
        ],
        [],
    );

    const updateSection = (index: number, patch: Partial<GuideSection>) => {
        const next = data.sections.map((section, i) => (i === index ? { ...section, ...patch } : section));
        setData('sections', next);
    };

    const moveSection = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= data.sections.length) return;
        const next = [...data.sections];
        const [item] = next.splice(index, 1);
        next.splice(target, 0, item);
        setData('sections', next);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        put(route('quality-indicators.guide.update'));
    };

    return (
        <QualityPage
            tone="emerald"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · Admin"
            title="แก้ไขคู่มือตัวชี้วัดคุณภาพ"
            subtitle="ปรับเนื้อหาให้เข้าใจง่าย ผู้ใช้เห็นผลทันทีหลังบันทึก"
            breadcrumbs={breadcrumbs}
            headTitle="แก้ไขคู่มือตัวชี้วัด"
            subNav={<IndicatorsSubNav active="quality-indicators.guide" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                        <Link href={route('quality-indicators.guide')}>ดูหน้าคู่มือ</Link>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-amber-200 text-amber-800 hover:bg-amber-50"
                        onClick={() => setResetOpen(true)}
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        คืนค่าเริ่มต้น
                    </Button>
                </div>
            }
        >
            <form onSubmit={submit} className="space-y-6">
                <Panel title="ข้อมูลปกคู่มือ" description="ชื่อ บทนำ และการแนะนำภาพรวม">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">ชื่อคู่มือ</Label>
                            <Input
                                id="title"
                                value={data.title}
                                className={qualityInput}
                                onChange={(e) => setData('title', e.target.value)}
                            />
                            {errors.title ? <p className="text-xs text-rose-600">{errors.title}</p> : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subtitle">คำโปรย / หัวข้อรอง</Label>
                            <Input
                                id="subtitle"
                                value={data.subtitle}
                                className={qualityInput}
                                onChange={(e) => setData('subtitle', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="intro">บทนำ (ขึ้นต้นคู่มือ)</Label>
                            <Textarea
                                id="intro"
                                value={data.intro}
                                className={cn(qualityInput, 'min-h-[120px]')}
                                onChange={(e) => setData('intro', e.target.value)}
                                placeholder="อธิบายสั้น ๆ ว่าคู่มือนี้ช่วยอะไร และเหมาะกับใคร"
                            />
                        </div>
                    </div>
                </Panel>

                {data.sections.map((section, index) => (
                    <Panel
                        key={section.id || `section-${index}`}
                        title={`หัวข้อที่ ${index + 1}`}
                        description="แก้ชื่อ เนื้อหา ขั้นตอน เคล็ดลับ และคำเตือน"
                        action={
                            <div className="flex flex-wrap gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveSection(index, 1)}
                                    disabled={index === data.sections.length - 1}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-rose-600 hover:bg-rose-50"
                                    onClick={() => setData('sections', data.sections.filter((_, i) => i !== index))}
                                    disabled={data.sections.length <= 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        }
                    >
                        <div className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>ชื่อหัวข้อ</Label>
                                    <Input
                                        value={section.title}
                                        className={qualityInput}
                                        onChange={(e) => updateSection(index, { title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>ไอคอน</Label>
                                    <select
                                        value={section.icon || 'BookOpen'}
                                        className={cn(qualityInput, 'h-10')}
                                        onChange={(e) => updateSection(index, { icon: e.target.value })}
                                    >
                                        {ICON_OPTIONS.map((icon) => (
                                            <option key={icon} value={icon}>
                                                {icon}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>สรุปสั้น (แสดงในสารบัญ)</Label>
                                <Input
                                    value={section.summary || ''}
                                    className={qualityInput}
                                    onChange={(e) => updateSection(index, { summary: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>เนื้อหาหลัก</Label>
                                <Textarea
                                    value={section.body || ''}
                                    className={cn(qualityInput, 'min-h-[120px]')}
                                    onChange={(e) => updateSection(index, { body: e.target.value })}
                                    placeholder="อธิบายรายละเอียด — เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่"
                                />
                            </div>

                            <ListEditor
                                label="สิ่งที่ควรรู้ (รายการ)"
                                hint="แต่ละช่อง = 1 ข้อ"
                                values={section.bullets || ['']}
                                placeholder="เช่น รองรับตัวชี้วัด 3 ระดับ"
                                onChange={(bullets) => updateSection(index, { bullets })}
                            />

                            <ListEditor
                                label="ขั้นตอนการใช้งาน"
                                hint="เรียงตามลำดับที่ผู้ใช้ควรทำ"
                                values={section.steps || ['']}
                                placeholder="เช่น กดปุ่มเพิ่มตัวชี้วัด"
                                onChange={(steps) => updateSection(index, { steps })}
                            />

                            <ListEditor
                                label="เคล็ดลับ"
                                values={section.tips || []}
                                placeholder="คำแนะนำที่เป็นประโยชน์"
                                onChange={(tips) => updateSection(index, { tips })}
                            />

                            <ListEditor
                                label="คำเตือน"
                                hint="ใช้ sparingly — จุดที่อาจทำให้ข้อมูลเสียหาย"
                                values={section.warnings || []}
                                placeholder="เช่น การลบไม่สามารถกู้คืนได้"
                                onChange={(warnings) => updateSection(index, { warnings })}
                            />
                        </div>
                    </Panel>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setData('sections', [...data.sections, emptySection(data.sections.length)])}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        เพิ่มหัวข้อ
                    </Button>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="ghost">
                            <Link href={route('quality-indicators.guide')}>ยกเลิก</Link>
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? 'กำลังบันทึก...' : 'บันทึกคู่มือ'}
                        </Button>
                    </div>
                </div>
            </form>

            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>คืนค่าคู่มือเป็นค่าเริ่มต้น?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การกระทำนี้จะเขียนทับเนื้อหาที่แก้ไขไว้ทั้งหมด และโหลดคู่มือต้นฉบับของระบบกลับมา
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => router.post(route('quality-indicators.guide.reset'))}
                        >
                            คืนค่าเริ่มต้น
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </QualityPage>
    );
}
