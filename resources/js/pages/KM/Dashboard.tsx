import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileText,
    GraduationCap,
    Search,
    Sparkles,
    Database,
    FileSpreadsheet,
    ArrowRight,
} from 'lucide-react';
import { QualityPage, Panel, EmptyState } from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';

interface Asset {
    id: number;
    title: string;
    file_type: string;
    views: number;
    created_at: string;
    uploader: { name: string };
}

interface Course {
    id: number;
    title: string;
    cover_image: string;
}

interface Props {
    recentAssets: Asset[];
    popularAssets: Asset[];
    featuredCourses: Course[];
}

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'KM', href: route('km.dashboard') },
];

export default function KmDashboard({ recentAssets, popularAssets, featuredCourses }: Props) {
    return (
        <QualityPage
            tone="amber"
            icon={GraduationCap}
            badge="ศูนย์พัฒนาคุณภาพ · KM"
            title="ภาพรวมการจัดการความรู้"
            subtitle="ศูนย์รวมองค์ความรู้และระบบการเรียนรู้ออนไลน์ เพื่อพัฒนาศักยภาพบุคลากรอย่างต่อเนื่อง"
            breadcrumbs={breadcrumbs}
            headTitle="ภาพรวม KM"
            subNav={<KmSubNav active="km.dashboard" />}
            actions={
                <>
                    <Button
                        asChild
                        className="rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white shadow-xs"
                    >
                        <Link href={route('km.interactive.index')}>
                            <Sparkles className="mr-2 h-4 w-4" /> การเรียนรู้เชิงโต้ตอบ
                        </Link>
                    </Button>
                    <Button asChild className="rounded-xl bg-amber-600 hover:bg-amber-700">
                        <Link href={route('km.assets.index')}>
                            <FileText className="mr-2 h-4 w-4" /> คลังความรู้
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                        <Link href={route('km.learn.index')}>
                            <GraduationCap className="mr-2 h-4 w-4" /> E-Learning
                        </Link>
                    </Button>
                </>
            }
        >
            <Panel title="ค้นหาความรู้" description="ค้นหาเอกสาร หลักสูตร หรือองค์ความรู้">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="ค้นหาเอกสาร, หลักสูตร, หรือองค์ความรู้..."
                            className="rounded-xl pl-9"
                        />
                    </div>
                    <Button className="rounded-xl bg-amber-600 hover:bg-amber-700">ค้นหา</Button>
                </div>
            </Panel>

            {/* Interactive Learning Highlight Banner */}
            <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-r from-indigo-500/10 via-amber-500/10 to-emerald-500/10 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 text-white px-2.5 py-0.5 text-xs font-bold shadow-2xs">
                                <Sparkles className="h-3 w-3" /> แนะนำใหม่
                            </span>
                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                                In-Browser Interactive Learning
                            </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                            การเรียนรู้เชิงโต้ตอบ: SQL Journey & Excel Master
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            ระบบฝึกเขียนคำสั่ง SQL บนฐานข้อมูลจำลอง (SQLite WASM) และฝึกเขียนสูตร Excel บนสเปรดชีตจริงในเบราว์เซอร์ พร้อมตรวจคำตอบและเฉลยทันที
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-xl border-amber-300 bg-background text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs shadow-2xs"
                        >
                            <Link href={route('km.interactive.sql')}>
                                <Database className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                                SQL Journey
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-xl border-emerald-300 bg-background text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs shadow-2xs"
                        >
                            <Link href={route('km.interactive.excel')}>
                                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                Excel Master
                            </Link>
                        </Button>
                        <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-2xs">
                            <Link href={route('km.interactive.index')}>
                                เข้าห้องเรียนรู้ <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Panel
                    title="เอกสารมาใหม่"
                    description="เอกสารที่เพิ่งเผยแพร่ล่าสุด"
                    action={
                        <Link
                            href={route('km.assets.index')}
                            className="text-xs font-medium text-amber-600 hover:text-amber-800"
                        >
                            ดูทั้งหมด
                        </Link>
                    }
                >
                    {recentAssets.length === 0 ? (
                        <EmptyState text="ยังไม่มีเอกสารใหม่" />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recentAssets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600">
                                            {asset.file_type}
                                        </div>
                                        <div>
                                            <h4 className="line-clamp-1 text-sm font-semibold text-slate-800">
                                                {asset.title}
                                            </h4>
                                            <p className="text-[11px] text-slate-400">
                                                โดย {asset.uploader.name} ·{' '}
                                                {new Date(asset.created_at).toLocaleDateString('th-TH')}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-amber-600" asChild>
                                        <Link href={route('km.assets.show', asset.id)}>เปิดดู</Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title="เอกสารยอดนิยม" description="เอกสารที่มีการเข้าชมสูงสุด">
                    {popularAssets.length === 0 ? (
                        <EmptyState text="ไม่มีข้อมูล" />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {popularAssets.map((asset, index) => (
                                <div
                                    key={asset.id}
                                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                                index < 3
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 className="line-clamp-1 text-sm font-semibold text-slate-800">
                                                {asset.title}
                                            </h4>
                                            <p className="text-[11px] text-slate-400">{asset.views} การเข้าชม</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-amber-600" asChild>
                                        <Link href={route('km.assets.show', asset.id)}>เปิดดู</Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel
                title="หลักสูตรแนะนำ"
                description="หลักสูตร E-Learning ที่น่าสนใจ"
                action={
                    <Button
                        variant="outline"
                        className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                        asChild
                    >
                        <Link href={route('km.learn.index')}>ดูหลักสูตรทั้งหมด</Link>
                    </Button>
                }
            >
                {featuredCourses.length === 0 ? (
                    <EmptyState text="ยังไม่มีหลักสูตรแนะนำในขณะนี้" />
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {featuredCourses.map((course) => (
                            <Link
                                key={course.id}
                                href={route('km.learn.courses.show', course.id)}
                                className="group overflow-hidden rounded-2xl border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <div className="relative h-40 overflow-hidden bg-slate-100">
                                    {course.cover_image ? (
                                        <img
                                            src={course.cover_image}
                                            alt={course.title}
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
                                            <GraduationCap className="h-12 w-12 text-amber-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="line-clamp-2 font-bold text-slate-800 group-hover:text-amber-700">
                                        {course.title}
                                    </h3>
                                    <p className="mt-2 text-xs text-amber-600">เรียนรู้ออนไลน์ →</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
