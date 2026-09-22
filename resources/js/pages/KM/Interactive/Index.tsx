import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { QualityPage } from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';
import { Button } from '@/components/ui/button';
import {
    Sparkles,
    Database,
    FileSpreadsheet,
    ArrowRight,
    CheckCircle2,
    Play,
    Zap,
    ShieldCheck,
    HelpCircle,
    TrendingUp,
    GraduationCap,
} from 'lucide-react';
import { SQL_LESSONS } from './data/sqlLessons';
import { EXCEL_LESSONS } from './data/excelLessons';
import { MMERT_LESSONS } from './data/mmertLessons';
import { ShieldAlert } from 'lucide-react';

interface Props {
    sqlStats: {
        completedLessons: number[];
        currentLessonId: number;
    };
    excelStats: {
        completedLessons: number[];
        currentLessonId: number;
    };
    mmertStats: {
        completedLessons: number[];
        currentLessonId: number;
    };
}

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'KM', href: route('km.dashboard') },
    { title: 'การเรียนรู้เชิงโต้ตอบ', href: route('km.interactive.index') },
];

export default function InteractiveIndex({ sqlStats, excelStats, mmertStats }: Props) {
    // คำนวณความคืบหน้า (รวมทั้งจาก Props และ localStorage เผื่อผู้ใช้เรียนแบบออฟไลน์)
    const [localSqlDone, setLocalSqlDone] = React.useState<number[]>(sqlStats.completedLessons || []);
    const [localExcelDone, setLocalExcelDone] = React.useState<number[]>(excelStats.completedLessons || []);
    const [localMmertDone, setLocalMmertDone] = React.useState<number[]>(mmertStats?.completedLessons || []);

    React.useEffect(() => {
        try {
            const savedSql = localStorage.getItem('km_sql_completed_lessons');
            if (savedSql) {
                const parsed = JSON.parse(savedSql);
                setLocalSqlDone((prev) => Array.from(new Set([...prev, ...parsed])));
            }
            const savedExcel = localStorage.getItem('km_excel_completed_lessons');
            if (savedExcel) {
                const parsed = JSON.parse(savedExcel);
                setLocalExcelDone((prev) => Array.from(new Set([...prev, ...parsed])));
            }
            const savedMmert = localStorage.getItem('km_mmert_completed');
            if (savedMmert) {
                const parsed = JSON.parse(savedMmert);
                setLocalMmertDone((prev) => Array.from(new Set([...prev, ...parsed])));
            }
        } catch (e) {
            // ละเว้น
        }
    }, []);

    const sqlTotal = SQL_LESSONS.length;
    const sqlCount = localSqlDone.length;
    const sqlPct = Math.round((sqlCount / sqlTotal) * 100);

    const excelTotal = EXCEL_LESSONS.length;
    const excelCount = localExcelDone.length;
    const excelPct = Math.round((excelCount / excelTotal) * 100);

    const mmertTotal = MMERT_LESSONS.length;
    const mmertCount = localMmertDone.length;
    const mmertPct = Math.round((mmertCount / mmertTotal) * 100);

    const totalLessons = sqlTotal + excelTotal + mmertTotal;
    const totalDone = sqlCount + excelCount + mmertCount;
    const totalPct = Math.round((totalDone / totalLessons) * 100);

    return (
        <QualityPage
            tone="amber"
            icon={Sparkles}
            badge="ศูนย์พัฒนาคุณภาพ · KM Interactive"
            title="การเรียนรู้เชิงโต้ตอบ (Interactive Learning Lab)"
            subtitle="ฝึกฝนทักษะการเขียนคำสั่ง SQL และสูตรคำนวณ Excel แบบลงมือปฏิบัติจริงบนเบราว์เซอร์ พร้อมระบบตรวจคำตอบทันที"
            breadcrumbs={breadcrumbs}
            headTitle="การเรียนรู้เชิงโต้ตอบ (SQL & Excel)"
            subNav={<KmSubNav active="km.interactive.index" />}
        >
            <div className="space-y-8">
                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 p-8 shadow-xs">
                    <div className="relative z-10 max-w-3xl space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            ระบบเรียนรู้เชิงโต้ตอบแบบ Hands-on แห่งแรกของโรงพยาบาล
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            พัฒนาทักษะข้อมูลระดับมืออาชีพ ด้วยการเขียนจริงและเห็นผลลัพธ์ทันที
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            จำลองสภาพแวดล้อมฐานข้อมูลจริงด้วย SQLite WebAssembly และสเปรดชีต Excel เสมือนจริง ทำงานบนเบราว์เซอร์ 100% 
                            ปลอดภัย ไม่ส่งผลกระทบต่อระบบจริง พร้อมโจทย์ท้าทายที่อ้างอิงจากงานโรงพยาบาล
                        </p>
                    </div>

                    {/* Overall Stats Pill */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-6">
                        <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
                            <GraduationCap className="h-4 w-4 text-amber-600" />
                            ความคืบหน้ารวมทั้งหมด:
                            <span className="font-bold text-amber-700 dark:text-amber-300">
                                {totalDone}/{totalLessons} บทเรียน ({totalPct}%)
                            </span>
                        </div>
                        <div className="h-2 w-48 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                                style={{ width: `${totalPct}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* 3 Main Track Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Track 1: SQL Journey */}
                    <div className="rounded-3xl border border-border bg-card p-7 shadow-xs hover:border-amber-500/40 transition flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Database className="h-7 w-7" />
                                </div>
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    {sqlTotal} บทเรียน
                                </span>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    SQL Journey: ฝึกฝน SQL เชิงโต้ตอบ
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                    เรียนรู้ภาษา SQL ตั้งแต่คำสั่ง SELECT, WHERE, การจัดกลุ่ม GROUP BY, การเชื่อมโยงตาราง INNER/LEFT JOIN 
                                    จนถึงการดึงข้อมูลผู้ป่วย การสั่งยา และวิเคราะห์รายงานคลินิก
                                </p>
                            </div>

                            {/* Features list */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>SQLite 3 WASM 100%</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Schema Explorer</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>JOIN Visualizer</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>ตรวจคำตอบอัตโนมัติ</span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5 pt-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">ความคืบหน้า</span>
                                    <span className="font-bold text-foreground">
                                        {sqlCount} / {sqlTotal} บท ({sqlPct}%)
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 transition-all duration-500"
                                        style={{ width: `${sqlPct}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <Button
                            asChild
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-2xl py-6 font-bold text-sm gap-2 shadow-xs"
                        >
                            <Link href={route('km.interactive.sql')}>
                                {sqlCount > 0 ? 'เรียนต่อจากที่ค้างไว้' : 'เริ่มเรียนรู้ SQL Journey'}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    {/* Track 2: Excel Master */}
                    <div className="rounded-3xl border border-border bg-card p-7 shadow-xs hover:border-emerald-500/40 transition flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <FileSpreadsheet className="h-7 w-7" />
                                </div>
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    {excelTotal} บทเรียน
                                </span>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Excel Master: ฝึกฝน Excel เชิงโต้ตอบ
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                    ฝึกเขียนสูตรและฟังก์ชันคำนวณยอดนิยม เช่น SUM, IF, AND/OR, COUNTIF, SUMIF, VLOOKUP, XLOOKUP, DATEDIF 
                                    บนหน้าตารางสเปรดชีตจริงพร้อม Formula Bar คำนวณสด
                                </p>
                            </div>

                            {/* Features list */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>Interactive Grid & FX Bar</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>VLOOKUP & XLOOKUP</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>COUNTIF & SUMIF</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>คำนวณอายุ DATEDIF</span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5 pt-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">ความคืบหน้า</span>
                                    <span className="font-bold text-foreground">
                                        {excelCount} / {excelTotal} บท ({excelPct}%)
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-600 transition-all duration-500"
                                        style={{ width: `${excelPct}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <Button
                            asChild
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-6 font-bold text-sm gap-2 shadow-xs"
                        >
                            <Link href={route('km.interactive.excel')}>
                                {excelCount > 0 ? 'เรียนต่อจากที่ค้างไว้' : 'เริ่มเรียนรู้ Excel Master'}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Why Interactive Learning section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                        <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                            <Zap className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground">เรียนรู้แบบลงมือทำจริง (Active Learning)</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            เปลี่ยนจากการอ่านทฤษฎีหรือดูวิดีโอเพียงอย่างเดียว มาเป็นการพิมพ์คำสั่งจริงและดูผลลัพธ์ทันที ช่วยให้จดจำได้แม่นยำขึ้น 75%
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                        <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground">ปลอดภัย 100% (Isolated Sandbox)</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            ระบบทำงานบนหน่วยความจำของเบราว์เซอร์ ผู้เรียนสามารถทดลองเขียนคำสั่งลบ หรือแก้ไขข้อมูลได้เต็มที่ โดยสามารถกดรีเซ็ตคืนค่าเดิมได้ตลอดเวลา
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                        <div className="h-8 w-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground">สอดคล้องกับงานโรงพยาบาลจริง</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            มีกรณีศึกษาจากฐานข้อมูลผู้ป่วย (HN), การตรวจรักษา (VN), และการจ่ายยา รวมถึงตัวชี้วัดโรงพยาบาลที่พบในงานประจำวัน
                        </p>
                    </div>
                </div>
            </div>
        </QualityPage>
    );
}

