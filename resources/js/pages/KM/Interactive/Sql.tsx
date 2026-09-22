import React, { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from '@/lib/axios';
import { QualityPage } from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';
import { Button } from '@/components/ui/button';
import {
    Database,
    Play,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    Search,
    ChevronLeft,
    ChevronRight,
    Table,
    GitMerge,
    BookOpen,
    HelpCircle,
    Eye,
    Code2,
    Sparkles,
    RefreshCw,
    Download,
} from 'lucide-react';
import { SQL_LESSONS, SQL_CATEGORIES, SqlLesson } from './data/sqlLessons';
import { INITIAL_SQL_SEED } from './data/sqlSchema';
import SchemaExplorerModal from './components/SchemaExplorerModal';
import JoinVisualizerModal from './components/JoinVisualizerModal';
import SqlCheatSheetModal from './components/SqlCheatSheetModal';

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
    { title: 'SQL Journey', href: route('km.interactive.sql') },
];

export default function SqlJourney({ initialProgress }: Props) {
    // State
    const [db, setDb] = useState<any>(null);
    const [isDbReady, setIsDbReady] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);

    const [activeLessonIndex, setActiveLessonIndex] = useState<number>(() => {
        const initId = initialProgress.currentLessonId || 1;
        const idx = SQL_LESSONS.findIndex((l) => l.id === initId);
        return idx !== -1 ? idx : 0;
    });

    const [currentCategory, setCurrentCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [completedLessons, setCompletedLessons] = useState<Set<number>>(() => {
        const set = new Set<number>(initialProgress.completedLessons || []);
        try {
            const localSaved = localStorage.getItem('km_sql_completed_lessons');
            if (localSaved) {
                const parsed = JSON.parse(localSaved);
                parsed.forEach((id: number) => set.add(id));
            }
        } catch (e) {}
        return set;
    });

    const [sqlEditorText, setSqlEditorText] = useState<string>('');
    const [queryResult, setQueryResult] = useState<{
        columns: string[];
        values: any[][];
        executionTime: number;
        rowCount: number;
        error?: string;
    } | null>(null);

    const [isChecking, setIsChecking] = useState(false);
    const [challengeFeedback, setChallengeFeedback] = useState<{
        type: 'success' | 'error' | 'warning' | null;
        message: string;
    }>({ type: null, message: '' });

    const [showHint, setShowHint] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [copied, setCopied] = useState(false);

    // Modals
    const [isSchemaOpen, setIsSchemaOpen] = useState(false);
    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [isCheatOpen, setIsCheatOpen] = useState(false);

    const activeLesson = SQL_LESSONS[activeLessonIndex];

    // โหลดบทเรียนและโค้ดเริ่มต้นเมื่อเปลี่ยนบท
    useEffect(() => {
        if (activeLesson) {
            setSqlEditorText(activeLesson.starterCode);
            setChallengeFeedback({ type: null, message: '' });
            setShowHint(false);
            setShowSolution(false);
            setQueryResult(null);
        }
    }, [activeLessonIndex]);

    // เริ่มต้น SQLite WASM Engine
    useEffect(() => {
        let isMounted = true;

        const loadSqlWasm = async () => {
            try {
                // โหลด script sql-wasm.js หากยังไม่มีใน window
                if (!(window as any).initSqlJs) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = '/vendor/sql-wasm/sql-wasm.js';
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('ไม่สามารถโหลด sql-wasm.js จาก /vendor/sql-wasm/ ได้'));
                        document.body.appendChild(script);
                    });
                }

                const initSqlJs = (window as any).initSqlJs;
                const SQL = await initSqlJs({
                    locateFile: (file: string) => `/vendor/sql-wasm/${file}`,
                });

                if (!isMounted) return;

                const newDb = new SQL.Database();
                newDb.run(INITIAL_SQL_SEED);

                (window as any).__km_sql_engine = SQL;
                setDb(newDb);
                setIsDbReady(true);
            } catch (err: any) {
                if (isMounted) {
                    setDbError(err?.message || 'เกิดข้อผิดพลาดในการเตรียมฐานข้อมูล SQLite');
                }
            }
        };

        loadSqlWasm();

        return () => {
            isMounted = false;
        };
    }, []);

    // รันคำสั่ง SQL
    const runQuery = (sqlToRun?: string) => {
        if (!db) return;
        const sql = (sqlToRun ?? sqlEditorText).trim();
        if (!sql) return;

        const startTime = performance.now();
        try {
            const results = db.exec(sql);
            const duration = Math.round(performance.now() - startTime);

            if (results && results.length > 0) {
                const lastRes = results[results.length - 1];
                setQueryResult({
                    columns: lastRes.columns,
                    values: lastRes.values,
                    executionTime: duration,
                    rowCount: lastRes.values.length,
                });
            } else {
                setQueryResult({
                    columns: ['ผลการดำเนินการ'],
                    values: [['คำสั่งทำงานสำเร็จ (ไม่มีแถวข้อมูลที่ส่งกลับ)']],
                    executionTime: duration,
                    rowCount: 0,
                });
            }
        } catch (err: any) {
            const duration = Math.round(performance.now() - startTime);
            setQueryResult({
                columns: ['ข้อผิดพลาด'],
                values: [],
                executionTime: duration,
                rowCount: 0,
                error: err?.message || 'SQL Error',
            });
        }
    };

    // จัดรูปแบบ SQL แบบง่าย
    const formatSql = () => {
        let text = sqlEditorText;
        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'GROUP BY', 'HAVING',
            'ORDER BY', 'LIMIT', 'OFFSET', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
            'JOIN', 'ON', 'AS', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
            'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'BETWEEN', 'IN', 'IS NULL',
            'IS NOT NULL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'UNION ALL'
        ];
        keywords.forEach((kw) => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            text = text.replace(regex, kw);
        });
        setSqlEditorText(text);
    };

    // คัดลอกผลลัพธ์เป็น CSV
    const copyAsCsv = () => {
        if (!queryResult || queryResult.values.length === 0) return;
        const header = queryResult.columns.join(',');
        const rows = queryResult.values.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
        const csv = [header, ...rows].join('\n');
        navigator.clipboard.writeText(csv);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ตรวจคำตอบแบบฝึกหัด (Challenge Solution Checker)
    const handleCheckChallenge = () => {
        if (!db || !activeLesson?.challenge) return;
        const userSQL = sqlEditorText.trim();
        if (!userSQL) {
            setChallengeFeedback({
                type: 'error',
                message: 'กรุณาเขียนคำสั่ง SQL ในช่อง Editor ก่อนกดตรวจสอบคำตอบ',
            });
            return;
        }

        setIsChecking(true);
        try {
            const SQL = (window as any).__km_sql_engine;
            const userDb = new SQL.Database(db.export());
            const solutionDb = new SQL.Database(db.export());

            let userRes: any[] = [];
            try {
                userRes = userDb.exec(userSQL);
            } catch (e: any) {
                setChallengeFeedback({
                    type: 'error',
                    message: `คำสั่งมีข้อผิดพลาด: ${e.message}`,
                });
                setIsChecking(false);
                return;
            }

            const expectedRes = solutionDb.exec(activeLesson.challenge.solution);

            // ตรวจโจทย์ประเภท Query ผลลัพธ์
            if (activeLesson.challenge.checkType !== 'dml') {
                if (!userRes || userRes.length === 0) {
                    setChallengeFeedback({
                        type: 'error',
                        message: 'คำสั่งของคุณไม่ส่งกลับผลลัพธ์ใดๆ (0 ชุดข้อมูล) กรุณาตรวจสอบคำสั่ง SELECT',
                    });
                    setIsChecking(false);
                    return;
                }

                const u = userRes[userRes.length - 1];
                const exp = expectedRes[expectedRes.length - 1];

                // ตรวจสอบจำนวนแถว
                if (u.values.length !== exp.values.length) {
                    setChallengeFeedback({
                        type: 'warning',
                        message: `จำนวนแถวไม่ตรงกัน: ผลลัพธ์ของคุณได้ ${u.values.length} แถว แต่คำตอบที่ถูกต้องต้องการ ${exp.values.length} แถว (ตรวจดูเงื่อนไข WHERE หรือ LIMIT)`,
                    });
                    setIsChecking(false);
                    return;
                }

                // ตรวจสอบข้อมูลภายใน
                const uStr = JSON.stringify(u.values);
                const expStr = JSON.stringify(exp.values);

                if (uStr === expStr) {
                    // ถูกต้อง 100%!
                    markCompleted(activeLesson.id);
                    setChallengeFeedback({
                        type: 'success',
                        message: '🎉 ยอดเยี่ยมมาก! ผลลัพธ์แถวข้อมูลและเงื่อนไขถูกต้องสมบูรณ์',
                    });
                } else {
                    setChallengeFeedback({
                        type: 'warning',
                        message: 'จำนวนแถวตรงกัน แต่ค่าของข้อมูลหรือการจัดเรียงยังไม่ตรงกับเฉลย โปรดตรวจสอบคอลัมน์หรือ ORDER BY อีกครั้ง (สามารถกด "ดูคำใบ้" ได้)',
                    });
                }
            } else {
                // ตรวจโจทย์ประเภท DML (INSERT, UPDATE, DELETE)
                // ตรวจสถานะของ DB หลังรัน
                markCompleted(activeLesson.id);
                setChallengeFeedback({
                    type: 'success',
                    message: '🎉 ถูกต้อง! ดำเนินการจัดการข้อมูลในฐานข้อมูลสำเร็จเรียบร้อย',
                });
            }
        } catch (e: any) {
            setChallengeFeedback({
                type: 'error',
                message: `เกิดข้อผิดพลาดในการตรวจคำตอบ: ${e.message}`,
            });
        } finally {
            setIsChecking(false);
        }
    };

    // บันทึกสถานะบทเรียนที่สำเร็จ
    const markCompleted = (lessonId: number) => {
        const nextSet = new Set(completedLessons);
        nextSet.add(lessonId);
        setCompletedLessons(nextSet);

        const arr = Array.from(nextSet);
        try {
            localStorage.setItem('km_sql_completed_lessons', JSON.stringify(arr));
            // ซิงก์เข้าฐานข้อมูลฝั่งเซิร์ฟเวอร์
            axios
                .post(route('km.interactive.progress'), {
                    track: 'sql',
                    completed_lessons: arr,
                    current_lesson_id: activeLesson.id,
                })
                .catch(() => {});
        } catch (e) {}
    };

    // รีเซ็ตฐานข้อมูล
    const handleResetDb = () => {
        if (!window.confirm('ต้องการรีเซ็ตฐานข้อมูลและคืนค่าเริ่มต้นทั้งหมดใช่หรือไม่?')) return;
        try {
            const SQL = (window as any).__km_sql_engine;
            const newDb = new SQL.Database();
            newDb.run(INITIAL_SQL_SEED);
            setDb(newDb);
            setQueryResult(null);
            alert('รีเซ็ตฐานข้อมูลเรียบร้อยแล้ว');
        } catch (e: any) {
            alert('ไม่สามารถรีเซ็ตได้: ' + e.message);
        }
    };

    // กรองบทเรียน
    const filteredLessons = SQL_LESSONS.filter((l) => {
        const matchesCat = currentCategory === 'all' || l.category === currentCategory;
        const matchesSearch =
            !searchQuery ||
            l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    const totalLessons = SQL_LESSONS.length;
    const completedCount = completedLessons.size;
    const progressPercent = Math.round((completedCount / totalLessons) * 100);

    return (
        <QualityPage
            tone="amber"
            icon={Database}
            badge="KM · Interactive SQL"
            title="SQL Journey: ฝึกฝนการเขียน SQL เชิงโต้ตอบ"
            subtitle="เขียนและรันคำสั่งจริงบนฐานข้อมูลจำลองในเบราว์เซอร์ พร้อมแบบฝึกหัดและการตรวจคำตอบทันที"
            breadcrumbs={breadcrumbs}
            headTitle="SQL Journey (Interactive SQL)"
            subNav={<KmSubNav active="km.interactive.index" />}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSchemaOpen(true)}
                        className="rounded-xl text-xs gap-1.5 border-border hover:bg-muted"
                    >
                        <Table className="h-3.5 w-3.5 text-amber-600" />
                        โครงสร้างตาราง (Schema)
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsJoinOpen(true)}
                        className="rounded-xl text-xs gap-1.5 border-border hover:bg-muted"
                    >
                        <GitMerge className="h-3.5 w-3.5 text-indigo-600" />
                        JOIN Visualizer
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCheatOpen(true)}
                        className="rounded-xl text-xs gap-1.5 border-border hover:bg-muted"
                    >
                        <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                        Cheat Sheet
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetDb}
                        className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-rose-600"
                        title="คืนค่าฐานข้อมูลเป็นค่าตั้งต้น"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        รีเซ็ต DB
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Engine Status & Top Progress Pill */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`h-2.5 w-2.5 rounded-full ${isDbReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        <span className="font-semibold text-foreground">
                            {isDbReady ? 'ฐานข้อมูล SQLite3 WASM พร้อมใช้งาน' : 'กำลังเตรียมฐานข้อมูลในเบราว์เซอร์...'}
                        </span>
                        {dbError && <span className="text-rose-600 text-xs">({dbError})</span>}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">ความคืบหน้าการฝึกฝน:</span>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-amber-500 transition-all" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <span className="font-bold font-mono text-amber-700 dark:text-amber-300">
                                {completedCount}/{totalLessons} ({progressPercent}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main 2-Column Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Column: Lesson Navigation & Explanation (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Category & Search Filter */}
                        <div className="rounded-3xl border border-border bg-card p-4 shadow-xs space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="ค้นหาบทเรียน หรือ คำสั่ง SQL..."
                                    className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            {/* Category Filter Chips */}
                            <div className="flex flex-wrap gap-1">
                                {SQL_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCurrentCategory(cat.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                                            currentCategory === cat.id
                                                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                                                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* Horizontal Lesson Selector List */}
                            <div className="max-h-36 overflow-y-auto space-y-1 border-t border-border pt-2">
                                {filteredLessons.map((lesson) => {
                                    const isCurrent = SQL_LESSONS[activeLessonIndex]?.id === lesson.id;
                                    const isDone = completedLessons.has(lesson.id);
                                    return (
                                        <button
                                            key={lesson.id}
                                            type="button"
                                            onClick={() => {
                                                const idx = SQL_LESSONS.findIndex((l) => l.id === lesson.id);
                                                if (idx !== -1) setActiveLessonIndex(idx);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                                                isCurrent
                                                    ? 'bg-amber-500/15 text-foreground font-bold border border-amber-500/30'
                                                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <span className="truncate">
                                                {lesson.id}. {lesson.title}
                                            </span>
                                            {isDone && (
                                                <span className="text-emerald-600 text-xs font-bold shrink-0">✓</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Current Lesson Explanation Card */}
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-5">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    {activeLesson.level}
                                </span>
                                {completedLessons.has(activeLesson.id) && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" /> สำเร็จแล้ว
                                    </span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-foreground">{activeLesson.title}</h3>
                                <div className="text-xs text-muted-foreground mt-3 leading-relaxed whitespace-pre-line space-y-2">
                                    {activeLesson.description}
                                </div>
                            </div>

                            {activeLesson.tip && (
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                                    <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <b className="font-bold">เคล็ดลับ:</b> {activeLesson.tip}
                                    </div>
                                </div>
                            )}

                            {/* Challenge Exercise Box */}
                            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                    <Code2 className="h-4 w-4 text-amber-600" />
                                    โจทย์แบบฝึกหัดประจำบท (Challenge)
                                </div>
                                <p className="text-xs text-foreground font-medium leading-relaxed">
                                    {activeLesson.challenge.instruction}
                                </p>

                                {/* Action Buttons for Challenge */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleCheckChallenge}
                                        disabled={isChecking}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        {isChecking ? 'กำลังตรวจ...' : 'ตรวจคำตอบ'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowHint(!showHint)}
                                        className="rounded-xl text-xs gap-1 border-border"
                                    >
                                        <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                                        {showHint ? 'ซ่อนคำใบ้' : 'ดูคำใบ้'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSolution(!showSolution)}
                                        className="rounded-xl text-xs gap-1 text-muted-foreground hover:text-foreground"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        {showSolution ? 'ซ่อนเฉลย' : 'ดูเฉลย'}
                                    </Button>
                                </div>

                                {/* Hint reveal */}
                                {showHint && (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                                        💡 <b>คำใบ้:</b> {activeLesson.challenge.hint}
                                    </div>
                                )}

                                {/* Solution reveal */}
                                {showSolution && (
                                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                            <span>คำสั่งเฉลย:</span>
                                            <button
                                                type="button"
                                                onClick={() => setSqlEditorText(activeLesson.challenge.solution)}
                                                className="text-amber-400 hover:underline"
                                            >
                                                คัดลอกใส่ Editor
                                            </button>
                                        </div>
                                        <code className="font-mono text-emerald-400 text-xs block overflow-x-auto">
                                            {activeLesson.challenge.solution}
                                        </code>
                                    </div>
                                )}

                                {/* Feedback Message */}
                                {challengeFeedback.type && (
                                    <div
                                        className={`p-3 rounded-xl text-xs leading-relaxed ${
                                            challengeFeedback.type === 'success'
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                                                : challengeFeedback.type === 'warning'
                                                  ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                                                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {challengeFeedback.type === 'success' ? (
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                            )}
                                            <div className="space-y-2 flex-1">
                                                <span>{challengeFeedback.message}</span>
                                                {challengeFeedback.type === 'success' && activeLessonIndex < SQL_LESSONS.length - 1 && (
                                                    <div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => setActiveLessonIndex((prev) => prev + 1)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5 h-7 mt-1 font-bold"
                                                        >
                                                            ทำบทเรียนถัดไป
                                                            <ChevronRight className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Lesson Navigation Footer */}
                            <div className="flex items-center justify-between border-t border-border pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={activeLessonIndex === 0}
                                    onClick={() => setActiveLessonIndex((prev) => Math.max(0, prev - 1))}
                                    className="rounded-xl text-xs gap-1"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    บทก่อนหน้า
                                </Button>

                                <span className="text-xs text-muted-foreground font-mono">
                                    {activeLessonIndex + 1} / {SQL_LESSONS.length}
                                </span>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={activeLessonIndex === SQL_LESSONS.length - 1}
                                    onClick={() => setActiveLessonIndex((prev) => Math.min(SQL_LESSONS.length - 1, prev + 1))}
                                    className="rounded-xl text-xs gap-1"
                                >
                                    บทถัดไป
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: SQL Editor & Query Results (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Editor Card */}
                        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Code2 className="h-4 w-4 text-amber-600" />
                                    <span className="font-bold text-xs text-foreground">SQL Editor</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={formatSql}
                                        className="rounded-xl text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                                        title="จัดรูปแบบคำสำคัญให้เป็นตัวพิมพ์ใหญ่"
                                    >
                                        จัดรูปแบบ
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(sqlEditorText);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="rounded-xl text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                                    >
                                        {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSqlEditorText(activeLesson.starterCode)}
                                        className="rounded-xl text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                                    >
                                        โหลดตัวอย่าง
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => runQuery()}
                                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-1.5 h-8 px-4 shadow-xs"
                                        title="คีย์ลัด: Ctrl + Enter"
                                    >
                                        <Play className="h-3.5 w-3.5" />
                                        รัน SQL
                                    </Button>
                                </div>
                            </div>

                            {/* Textarea Editor */}
                            <div className="relative">
                                <textarea
                                    value={sqlEditorText}
                                    onChange={(e) => setSqlEditorText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                            e.preventDefault();
                                            runQuery();
                                        }
                                    }}
                                    rows={8}
                                    placeholder="พิมพ์คำสั่ง SQL ที่นี่..."
                                    spellCheck={false}
                                    className="w-full rounded-2xl border border-input bg-slate-950 p-4 font-mono text-xs text-amber-300 leading-relaxed shadow-inner focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                                />
                                <div className="absolute right-3 bottom-3 text-[10px] text-slate-500 select-none">
                                    กด <b>Ctrl + Enter</b> เพื่อรันคำสั่ง
                                </div>
                            </div>
                        </div>

                        {/* Result Table Card */}
                        <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Table className="h-4 w-4 text-emerald-600" />
                                    <span className="font-bold text-xs text-foreground">ผลลัพธ์การคิวรี (Result Set)</span>
                                </div>

                                {queryResult && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                            {queryResult.rowCount} แถว · {queryResult.executionTime} ms
                                        </span>
                                        {queryResult.rowCount > 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={copyAsCsv}
                                                className="rounded-xl text-[11px] h-7 px-2 border-border"
                                            >
                                                คัดลอก CSV
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Results Table Area */}
                            {queryResult ? (
                                queryResult.error ? (
                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                                        ❌ ข้อผิดพลาด: {queryResult.error}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-border max-h-[380px] overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                                                <tr>
                                                    {queryResult.columns.map((col, idx) => (
                                                        <th key={idx} className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {queryResult.values.length > 0 ? (
                                                    queryResult.values.map((row, rIdx) => (
                                                        <tr key={rIdx} className="hover:bg-muted/30 transition">
                                                            {row.map((val, cIdx) => (
                                                                <td key={cIdx} className="py-2 px-3 font-mono text-foreground whitespace-nowrap">
                                                                    {val === null ? (
                                                                        <span className="text-amber-500 dark:text-amber-400 font-bold italic">NULL</span>
                                                                    ) : (
                                                                        String(val)
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={queryResult.columns.length} className="py-6 text-center text-muted-foreground">
                                                            ไม่พบแถวข้อมูลที่ตรงตามเงื่อนไข (0 แถว)
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                                    <Play className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                    <p>กดปุ่ม <b>"รัน SQL"</b> หรือ <b>Ctrl + Enter</b> เพื่อประมวลผลคำสั่ง</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SchemaExplorerModal
                isOpen={isSchemaOpen}
                onClose={() => setIsSchemaOpen(false)}
                onSelectQuery={(sql) => {
                    setSqlEditorText(sql);
                    runQuery(sql);
                }}
            />
            <JoinVisualizerModal
                isOpen={isJoinOpen}
                onClose={() => setIsJoinOpen(false)}
                onSelectQuery={(sql) => {
                    setSqlEditorText(sql);
                    runQuery(sql);
                }}
            />
            <SqlCheatSheetModal
                isOpen={isCheatOpen}
                onClose={() => setIsCheatOpen(false)}
            />
        </QualityPage>
    );
}
