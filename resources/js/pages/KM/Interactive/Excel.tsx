import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from '@/lib/axios';
import { QualityPage } from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';
import { Button } from '@/components/ui/button';
import {
    FileSpreadsheet,
    Play,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    Search,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    HelpCircle,
    Eye,
    Sparkles,
    Lightbulb,
    Target,
    Zap,
    Download,
} from 'lucide-react';
import { EXCEL_LESSONS, EXCEL_CATEGORIES, ExcelLesson } from './data/excelLessons';
import ExcelGrid from './components/ExcelGrid';
import ExcelCheatSheetModal from './components/ExcelCheatSheetModal';
import {
    SpreadsheetData,
    evaluateFormula,
    recomputeSpreadsheet,
} from './components/FormulaEvaluator';

interface Props {
    initialProgress: {
        completedLessons: number[];
        currentLessonId: number;
    };
}

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'KM', href: route('km.dashboard') },
    { title: 'การเรียนรู้เชิงโต้ตอบ', href: route('km.interactive.index') },
    { title: 'Excel Master', href: route('km.interactive.excel') },
];

export default function ExcelMaster({ initialProgress }: Props) {
    const [activeLessonIndex, setActiveLessonIndex] = useState<number>(() => {
        const initId = initialProgress.currentLessonId || 1;
        const idx = EXCEL_LESSONS.findIndex((l) => l.id === initId);
        return idx !== -1 ? idx : 0;
    });

    const [currentCategory, setCurrentCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [completedLessons, setCompletedLessons] = useState<Set<number>>(() => {
        const set = new Set<number>(initialProgress.completedLessons || []);
        try {
            const localSaved = localStorage.getItem('km_excel_completed_lessons');
            if (localSaved) {
                const parsed = JSON.parse(localSaved);
                parsed.forEach((id: number) => set.add(id));
            }
        } catch (e) {}
        return set;
    });

    const activeLesson: ExcelLesson = EXCEL_LESSONS[activeLessonIndex] || EXCEL_LESSONS[0];

    // Spreadsheet working data
    const [sheetData, setSheetData] = useState<SpreadsheetData>(() => {
        const clone = JSON.parse(JSON.stringify(activeLesson.initialData));
        return recomputeSpreadsheet(clone);
    });

    const [isChecking, setIsChecking] = useState(false);
    const [challengeFeedback, setChallengeFeedback] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
    }>({ type: null, message: '' });

    const [showHint, setShowHint] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [isCheatOpen, setIsCheatOpen] = useState(false);

    // เมื่อเปลี่ยนบทเรียน ให้โหลดข้อมูลตั้งต้นของบทนั้นใหม่
    useEffect(() => {
        if (activeLesson) {
            const clone = JSON.parse(JSON.stringify(activeLesson.initialData));
            setSheetData(recomputeSpreadsheet(clone));
            setChallengeFeedback({ type: null, message: '' });
            setShowHint(false);
            setShowSolution(false);
        }
    }, [activeLessonIndex]);

    // จัดการเมื่อค่าหรือสูตรในเซลล์เปลี่ยนแปลง
    const handleCellChange = (cellAddress: string, formulaOrValue: string) => {
        const addr = cellAddress.toUpperCase().trim();
        const nextSheet: SpreadsheetData = { ...sheetData };
        const existing = nextSheet[addr] || { value: null };

        const trimmed = formulaOrValue.trim();
        if (trimmed.startsWith('=')) {
            nextSheet[addr] = {
                ...existing,
                formula: trimmed,
                value: evaluateFormula(trimmed, nextSheet),
            };
        } else if (trimmed === '') {
            nextSheet[addr] = {
                ...existing,
                formula: undefined,
                value: null,
            };
        } else if (!isNaN(Number(trimmed))) {
            nextSheet[addr] = {
                ...existing,
                formula: undefined,
                value: parseFloat(trimmed),
            };
        } else {
            nextSheet[addr] = {
                ...existing,
                formula: undefined,
                value: trimmed,
            };
        }

        const recomputed = recomputeSpreadsheet(nextSheet);
        setSheetData(recomputed);
    };

    // ตรวจสอบคำตอบของแบบฝึกหัด
    const handleCheckChallenge = () => {
        if (!activeLesson?.challenge) return;
        const challenge = activeLesson.challenge;
        const targetCellAddr = challenge.targetCell.toUpperCase().trim();
        const cell = sheetData[targetCellAddr];

        if (!cell || (cell.value === null && cell.value === undefined && !cell.formula)) {
            setChallengeFeedback({
                type: 'error',
                message: `กรุณากรอกสูตรคำนวณหรือคำตอบในเซลล์ ${targetCellAddr} ก่อนกดตรวจคำตอบ`,
            });
            return;
        }

        setIsChecking(true);

        const userFormula = (cell.formula || '').trim();
        // Normalize formula for comparison: remove all spaces, make uppercase
        const cleanUserFormula = userFormula.replace(/\s+/g, '').toUpperCase();

        // 1. ตรวจสอบค่าผลลัพธ์
        let isValueCorrect = true;
        if (challenge.expectedValue !== undefined) {
            if (typeof challenge.expectedValue === 'number') {
                const userNum = typeof cell.value === 'number' ? cell.value : parseFloat(String(cell.value || ''));
                const expNum = challenge.expectedValue;
                isValueCorrect = !isNaN(userNum) && Math.abs(userNum - expNum) < 0.001;
            } else if (typeof challenge.expectedValue === 'boolean') {
                isValueCorrect = cell.value === challenge.expectedValue;
            } else {
                const userStr = String(cell.value ?? '').trim().toLowerCase();
                const expStr = String(challenge.expectedValue).trim().toLowerCase();
                isValueCorrect = userStr === expStr;
            }
        }

        // 2. ตรวจสอบสูตร
        let isFormulaCorrect = true;
        if (challenge.expectedFormulaMatch) {
            try {
                const regex = new RegExp(challenge.expectedFormulaMatch, 'i');
                isFormulaCorrect = regex.test(cleanUserFormula);
            } catch (e) {
                isFormulaCorrect = true;
            }
        }

        if (isValueCorrect && isFormulaCorrect) {
            setChallengeFeedback({
                type: 'success',
                message: `🎉 ยอดเยี่ยมมาก! ค่าที่คำนวณได้ในเซลล์ ${targetCellAddr} คือ "${cell.value}" ถูกต้องตรงตามโจทย์`,
            });
            markCompleted(activeLesson.id);
        } else if (!isValueCorrect) {
            setChallengeFeedback({
                type: 'error',
                message: `ค่าผลลัพธ์ในเซลล์ ${targetCellAddr} ยังไม่ถูกต้อง (ค่าที่ได้: "${cell.value ?? 'ว่าง'}", ค่าที่คาดหวัง: "${challenge.expectedValue}") กรุณาตรวจสอบสูตรอีกครั้ง`,
            });
        } else {
            setChallengeFeedback({
                type: 'warning',
                message: `ผลลัพธ์ตัวเลขถูกต้อง แต่สูตรใน ${targetCellAddr} ยังไม่ตรงกับโจทย์ที่ต้องการฝึกฝน (ลองใช้รูปแบบสูตรที่กำหนด เช่น ${challenge.solutionFormula})`,
            });
        }

        setIsChecking(false);
    };

    // บันทึกสถานะบทเรียนที่สำเร็จ
    const markCompleted = (lessonId: number) => {
        const nextSet = new Set(completedLessons);
        nextSet.add(lessonId);
        setCompletedLessons(nextSet);

        const arr = Array.from(nextSet);
        try {
            localStorage.setItem('km_excel_completed_lessons', JSON.stringify(arr));
            axios
                .post(route('km.interactive.progress'), {
                    track: 'excel',
                    completed_lessons: arr,
                    current_lesson_id: activeLesson.id,
                })
                .catch(() => {});
        } catch (e) {}
    };

    // รีเซ็ตตารางของบทเรียนนี้กลับเป็นค่าเริ่มต้น
    const handleResetSheet = () => {
        if (!window.confirm('ต้องการรีเซ็ตตารางบทเรียนนี้กลับเป็นค่าเริ่มต้นใช่หรือไม่?')) return;
        const clone = JSON.parse(JSON.stringify(activeLesson.initialData));
        setSheetData(recomputeSpreadsheet(clone));
        setChallengeFeedback({ type: null, message: '' });
    };

    // ใส่สูตรเฉลยลงในเซลล์เป้าหมายทันที
    const handleApplySolution = () => {
        if (!activeLesson?.challenge) return;
        const targetCell = activeLesson.challenge.targetCell.toUpperCase().trim();
        const solution = activeLesson.challenge.solutionFormula;
        handleCellChange(targetCell, solution);
    };

    // ส่งออกข้อมูลตารางเป็น CSV
    const handleExportCsv = () => {
        const cells = Object.keys(sheetData);
        if (cells.length === 0) return;

        let maxRow = 1;
        let maxCol = 1;
        cells.forEach((addr) => {
            const m = addr.match(/^([A-Z]+)(\d+)$/);
            if (m) {
                const r = parseInt(m[2], 10);
                if (r > maxRow) maxRow = r;
            }
        });

        const rows: string[][] = [];
        const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        for (let r = 1; r <= Math.min(maxRow, 15); r++) {
            const rowVals: string[] = [];
            for (const col of cols) {
                const cell = sheetData[`${col}${r}`];
                const val = cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '';
                rowVals.push(`"${val.replace(/"/g, '""')}"`);
            }
            rows.push(rowVals);
        }

        const csvContent = rows.map((r) => r.join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `excel_lesson_${activeLesson.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // กรองบทเรียน
    const filteredLessons = useMemo(() => {
        return EXCEL_LESSONS.filter((l) => {
            const matchesCat = currentCategory === 'all' || l.category === currentCategory;
            const matchesSearch =
                !searchQuery ||
                l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [currentCategory, searchQuery]);

    const totalLessons = EXCEL_LESSONS.length;
    const completedCount = completedLessons.size;
    const progressPercent = Math.round((completedCount / totalLessons) * 100);

    return (
        <QualityPage
            tone="emerald"
            icon={FileSpreadsheet}
            badge="KM · Interactive Excel"
            title="Excel Master: ฝึกทักษะสูตรคำนวณสเปรดชีตเชิงโต้ตอบ"
            subtitle="เรียนรู้และทดลองเขียนสูตรคำนวณจริงบนตารางในเบราว์เซอร์ พร้อมระบบตรวจความถูกต้องทันที"
            breadcrumbs={breadcrumbs}
            headTitle="Excel Master · การเรียนรู้เชิงโต้ตอบ"
        >
            <KmSubNav active="km.interactive.index" />

            {/* Top Stat Banner */}
            <div className="rounded-3xl border border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                Interactive Formula Engine
                            </span>
                            <span className="text-xs text-muted-foreground">
                                20 บทเรียนตั้งแต่พื้นฐานจนถึงงานโรงพยาบาล
                            </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-foreground">
                            ฝึกเขียนสูตร Excel เสมือนจริงบนเบราว์เซอร์
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            คลิกที่เซลล์ พิมพ์สูตรในแถบ Formula Bar เช่น <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-muted px-1.5 py-0.5 rounded-md">=SUM(B2:B5)</code> หรือ <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-muted px-1.5 py-0.5 rounded-md">=VLOOKUP(...)</code> แล้วกด Enter เพื่อดูผลลัพธ์
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-card border border-border p-3.5 rounded-2xl shrink-0">
                        <div className="text-right">
                            <div className="text-[11px] text-muted-foreground font-medium">ความคืบหน้าภาพรวม</div>
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                {completedCount} / {totalLessons}{' '}
                                <span className="text-xs font-normal text-muted-foreground">({progressPercent}%)</span>
                            </div>
                        </div>
                        <div className="relative h-12 w-12 flex items-center justify-center">
                            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-muted/40"
                                    strokeWidth="3.5"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className="text-emerald-500 transition-all duration-500 ease-out"
                                    strokeDasharray={`${progressPercent}, 100`}
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <span className="absolute text-[11px] font-bold text-foreground">
                                {progressPercent}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Learning Hub Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Sidebar: Lesson Directory */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <h3 className="font-bold text-sm text-foreground">สารบัญบทเรียน</h3>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsCheatOpen(true)}
                                className="h-8 text-xs rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                            >
                                <Zap className="h-3.5 w-3.5 mr-1 text-emerald-500" /> สูตรลัด
                            </Button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ค้นหาบทเรียน เช่น SUM, VLOOKUP..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-input bg-background text-foreground transition focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Category Badges */}
                        <div className="flex flex-wrap gap-1.5">
                            {EXCEL_CATEGORIES.map((cat) => {
                                const isActive = currentCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCurrentCategory(cat.id)}
                                        className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition ${
                                            isActive
                                                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Lesson Items Scroll List */}
                        <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
                            {filteredLessons.map((l) => {
                                const isCurrent = l.id === activeLesson.id;
                                const isDone = completedLessons.has(l.id);

                                return (
                                    <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => {
                                            const idx = EXCEL_LESSONS.findIndex((item) => item.id === l.id);
                                            if (idx !== -1) setActiveLessonIndex(idx);
                                        }}
                                        className={`w-full text-left p-3 rounded-2xl transition border flex items-start gap-3 ${
                                            isCurrent
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-foreground shadow-2xs ring-1 ring-emerald-500/20'
                                                : 'bg-card border-border/70 hover:bg-muted/30 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {isDone ? (
                                                <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                                    <Check className="h-3 w-3 stroke-[3]" />
                                                </div>
                                            ) : (
                                                <div
                                                    className={`h-5 w-5 rounded-full border text-[10px] font-bold flex items-center justify-center ${
                                                        isCurrent
                                                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                                            : 'border-muted-foreground/40 text-muted-foreground'
                                                    }`}
                                                >
                                                    {l.id}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    {l.level}
                                                </span>
                                                {isDone && (
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                        สำเร็จแล้ว
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                className={`text-xs font-semibold truncate ${
                                                    isCurrent ? 'text-foreground' : 'text-foreground/90'
                                                }`}
                                            >
                                                {l.title}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Area: Interactive Sheet & Challenge Workspace */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Lesson Header Card */}
                    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                                        {activeLesson.level}
                                    </span>
                                    {completedLessons.has(activeLesson.id) && (
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> ผ่านบทนี้แล้ว
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                                    {activeLesson.title}
                                </h1>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={activeLessonIndex === 0}
                                    onClick={() => setActiveLessonIndex((prev) => Math.max(0, prev - 1))}
                                    className="h-8 rounded-xl text-xs"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> ก่อนหน้า
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={activeLessonIndex === EXCEL_LESSONS.length - 1}
                                    onClick={() =>
                                        setActiveLessonIndex((prev) => Math.min(EXCEL_LESSONS.length - 1, prev + 1))
                                    }
                                    className="h-8 rounded-xl text-xs"
                                >
                                    ถัดไป <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Lesson Description & Theory */}
                        <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                            {activeLesson.description}
                        </div>

                        {/* Tip Box */}
                        {activeLesson.tip && (
                            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-foreground">
                                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-amber-700 dark:text-amber-300">เคล็ดลับ: </span>
                                    {activeLesson.tip}
                                </div>
                            </div>
                        )}

                        {/* Challenge Box */}
                        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                                    <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    ภารกิจประจำบทเรียน
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-muted-foreground">เซลล์เป้าหมาย:</span>
                                    <span className="font-mono font-bold text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                                        {activeLesson.challenge.targetCell}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-foreground font-medium">
                                {activeLesson.challenge.instruction}
                            </p>

                            {/* Challenge Feedback Message */}
                            {challengeFeedback.type && (
                                <div
                                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                                        challengeFeedback.type === 'success'
                                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                                            : challengeFeedback.type === 'warning'
                                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300'
                                              : 'bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300'
                                    }`}
                                >
                                    {challengeFeedback.type === 'success' ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    )}
                                    <div className="leading-relaxed font-medium">{challengeFeedback.message}</div>
                                </div>
                            )}

                            {/* Hint and Solution toggles */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowHint((prev) => !prev)}
                                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition cursor-pointer"
                                    >
                                        <HelpCircle className="h-3.5 w-3.5" />
                                        {showHint ? 'ซ่อนคำใบ้' : 'ขอคำใบ้'}
                                    </button>
                                    <span className="text-muted-foreground/40">•</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowSolution((prev) => !prev)}
                                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition cursor-pointer"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        {showSolution ? 'ซ่อนเฉลย' : 'ดูเฉลย'}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleResetSheet}
                                        className="h-8 text-xs rounded-xl border-border"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> รีเซ็ตตาราง
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleCheckChallenge}
                                        disabled={isChecking}
                                        className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-bold"
                                    >
                                        <Play className="h-3.5 w-3.5 mr-1 fill-white" /> ตรวจคำตอบ
                                    </Button>
                                </div>
                            </div>

                            {/* Hint Box */}
                            {showHint && (
                                <div className="rounded-xl bg-background/80 border border-border p-3 text-xs text-muted-foreground animate-in fade-in duration-200">
                                    💡 <b>คำใบ้:</b> {activeLesson.challenge.hint}
                                </div>
                            )}

                            {/* Solution Box */}
                            {showSolution && (
                                <div className="rounded-xl bg-background/80 border border-border p-3 space-y-2 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-foreground">เฉลยสูตรคำนวณ:</span>
                                        <button
                                            type="button"
                                            onClick={handleApplySolution}
                                            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Zap className="h-3 w-3" /> ใส่สูตรนี้ลงในเซลล์ทันที
                                        </button>
                                    </div>
                                    <code className="block font-mono text-xs p-2 bg-muted rounded-lg text-emerald-700 dark:text-emerald-300 font-bold overflow-x-auto">
                                        {activeLesson.challenge.solutionFormula}
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Interactive Spreadsheet Grid Component */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                    แผ่นงานจำลอง (Live Spreadsheet)
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    คลิกเซลล์เป้าหมาย <b className="text-foreground">{activeLesson.challenge.targetCell}</b> แล้วพิมพ์สูตรคำนวณ
                                </span>
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleExportCsv}
                                className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                            >
                                <Download className="h-3 w-3 mr-1" /> ส่งออก CSV
                            </Button>
                        </div>

                        <ExcelGrid
                            data={sheetData}
                            targetCell={activeLesson.challenge.targetCell}
                            onCellChange={handleCellChange}
                            maxRows={10}
                            maxCols={7}
                        />
                    </div>
                </div>
            </div>

            {/* Cheat Sheet Modal */}
            <ExcelCheatSheetModal
                isOpen={isCheatOpen}
                onClose={() => setIsCheatOpen(false)}
            />
        </QualityPage>
    );
}
