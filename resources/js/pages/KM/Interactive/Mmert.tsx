import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from '@/lib/axios';
import { QualityPage } from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';
import { Button } from '@/components/ui/button';
import {
    ShieldAlert, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
    BookOpen, GraduationCap, Target, Trophy, RotateCcw, ChevronDown,
    ClipboardList, Users, Radio, Tent, Search, Zap, Star,
    ArrowRight, Info, Check, X,
} from 'lucide-react';
import {
    MMERT_LESSONS, MMERT_CATEGORIES, MMERT_STATS,
    MmertLesson, Question, LessonCategory,
} from './data/mmertLessons';

interface Props {
    initialProgress: {
        completedLessons: number[];
        currentLessonId: number;
    };
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    overview:  ShieldAlert,
    structure: Users,
    methane:   ClipboardList,
    triage:    AlertCircle,
    ics:       Radio,
    amp:       Tent,
    scenario:  Target,
};

const COLOR_MAP: Record<string, string> = {
    blue:   'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    green:  'from-green-500/10 to-green-500/5 border-green-500/20',
    red:    'from-red-500/10 to-red-500/5 border-red-500/20',
    orange: 'from-orange-500/10 to-orange-500/5 border-orange-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    teal:   'from-teal-500/10 to-teal-500/5 border-teal-500/20',
    amber:  'from-amber-500/10 to-amber-500/5 border-amber-500/20',
};

const TEXT_COLOR: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    orange: 'text-orange-600 dark:text-orange-400',
    purple: 'text-purple-600 dark:text-purple-400',
    teal: 'text-teal-600 dark:text-teal-400',
    amber: 'text-amber-600 dark:text-amber-400',
};

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'KM', href: route('km.dashboard') },
    { title: 'การเรียนรู้เชิงโต้ตอบ', href: route('km.interactive.index') },
    { title: 'M-MERT', href: route('km.interactive.mmert') },
];

// ============================================================
// Helper: Parse Markdown (basic)
// ============================================================
function renderMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
        .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-6 mb-3">$1</h2>')
        .replace(/^\| (.*) \|$/gm, (match) => `<tr>${match.replace(/\| (.*?) (?=\|)/g, '<td class="border px-2 py-1 text-sm">$1</td>')}</tr>`)
        .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
        .replace(/\n\n/g, '</p><p class="mb-2">');
}

// ============================================================
// MCQ Question Component
// ============================================================
function MCQQuestion({
    question, onAnswer, answered, selectedId,
}: {
    question: Question;
    onAnswer: (id: string, correct: boolean) => void;
    answered: boolean;
    selectedId: string | null;
}) {
    return (
        <div className="space-y-3">
            {question.options!.map((opt) => {
                let cls =
                    'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer flex gap-3 items-start ';
                if (!answered) {
                    cls += 'border-border hover:border-primary hover:bg-primary/5';
                } else if (opt.isCorrect) {
                    cls += 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-300';
                } else if (opt.id === selectedId && !opt.isCorrect) {
                    cls += 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300';
                } else {
                    cls += 'border-border opacity-50';
                }
                return (
                    <button
                        key={opt.id}
                        className={cls}
                        disabled={answered}
                        onClick={() => onAnswer(opt.id, opt.isCorrect)}
                    >
                        <span className="mt-0.5 shrink-0">
                            {answered && opt.isCorrect && <Check className="h-4 w-4 text-green-500" />}
                            {answered && opt.id === selectedId && !opt.isCorrect && <X className="h-4 w-4 text-red-500" />}
                            {(!answered || (answered && !opt.isCorrect && opt.id !== selectedId)) && (
                                <span className="h-4 w-4 rounded-full border-2 border-current inline-block" />
                            )}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ============================================================
// Ordering Question Component
// ============================================================
function OrderingQuestion({
    question, onAnswer, answered,
}: {
    question: Question;
    onAnswer: (correct: boolean) => void;
    answered: boolean;
}) {
    const [items, setItems] = useState(() =>
        [...question.orderingItems!].sort(() => Math.random() - 0.5),
    );
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [checked, setChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    const handleDragStart = (i: number) => setDragIndex(i);
    const handleDrop = (i: number) => {
        if (dragIndex === null || dragIndex === i) return;
        const newItems = [...items];
        const [moved] = newItems.splice(dragIndex, 1);
        newItems.splice(i, 0, moved);
        setItems(newItems);
        setDragIndex(null);
    };

    const handleCheck = () => {
        const correct = items.every((item, idx) => item.correctOrder === idx + 1);
        setIsCorrect(correct);
        setChecked(true);
        onAnswer(correct);
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">ลากเพื่อเรียงลำดับ จากบนลงล่าง</p>
            {items.map((item, idx) => (
                <div
                    key={item.id}
                    draggable={!checked && !answered}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(idx)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm cursor-grab select-none transition-all
                        ${!checked && !answered ? 'hover:border-primary hover:bg-primary/5 border-border' : ''}
                        ${checked && item.correctOrder === idx + 1 ? 'border-green-500 bg-green-500/10' : ''}
                        ${checked && item.correctOrder !== idx + 1 ? 'border-red-400 bg-red-500/10' : ''}
                    `}
                >
                    <span className="text-muted-foreground font-mono text-xs w-5">{idx + 1}.</span>
                    <span className="flex-1">{item.text}</span>
                    {checked && item.correctOrder === idx + 1 && <Check className="h-4 w-4 text-green-500" />}
                    {checked && item.correctOrder !== idx + 1 && <X className="h-4 w-4 text-red-500" />}
                </div>
            ))}
            {!answered && !checked && (
                <Button onClick={handleCheck} className="mt-2">
                    ตรวจคำตอบ
                </Button>
            )}
            {checked && (
                <div className={`p-3 rounded-lg text-sm font-medium ${isCorrect ? 'bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                    {isCorrect ? '✅ ถูกต้อง!' : '❌ ลำดับยังไม่ถูกต้อง ลองดูเฉลยในคำอธิบายด้านล่าง'}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Matching Question Component
// ============================================================
function MatchingQuestion({
    question, onAnswer, answered,
}: {
    question: Question;
    onAnswer: (correct: boolean) => void;
    answered: boolean;
}) {
    const pairs = question.matchingPairs!;
    const [selected, setSelected] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
    const [matched, setMatched] = useState<string[]>([]);
    const [wrong, setWrong] = useState<string[]>([]);

    const handleLeft = (left: string) => {
        if (matched.includes(left) || answered) return;
        setSelected((s) => ({ ...s, left }));
    };
    const handleRight = (right: string) => {
        if (wrong.includes(right) || answered) return;
        if (!selected.left) return;
        const leftItem = pairs.find((p) => p.left === selected.left);
        if (leftItem && leftItem.right === right) {
            setMatched((m) => [...m, selected.left!, right]);
        } else {
            setWrong((w) => [...w, selected.left!, right]);
            setTimeout(() => setWrong([]), 1000);
        }
        setSelected({ left: null, right: null });
        if (matched.length + 2 >= pairs.length * 2) {
            onAnswer(true);
        }
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">คลิกเพื่อเลือก</p>
                {pairs.map((p) => (
                    <button
                        key={p.left}
                        disabled={matched.includes(p.left) || answered}
                        onClick={() => handleLeft(p.left)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all
                            ${matched.includes(p.left) ? 'border-green-500 bg-green-500/10 opacity-60' : ''}
                            ${selected.left === p.left ? 'border-primary bg-primary/10 font-medium' : ''}
                            ${!matched.includes(p.left) && selected.left !== p.left ? 'border-border hover:border-primary' : ''}
                        `}
                    >
                        {p.left}
                    </button>
                ))}
            </div>
            <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">จับคู่กับ</p>
                {pairs.map((p) => (
                    <button
                        key={p.right}
                        disabled={matched.includes(p.right) || answered}
                        onClick={() => handleRight(p.right)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all
                            ${matched.includes(p.right) ? 'border-green-500 bg-green-500/10 opacity-60' : ''}
                            ${wrong.includes(p.right) ? 'border-red-500 bg-red-500/10' : ''}
                            ${!matched.includes(p.right) && !wrong.includes(p.right) ? 'border-border hover:border-primary' : ''}
                        `}
                    >
                        {p.right}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Checklist Question Component
// ============================================================
function ChecklistQuestion({
    question, onAnswer, answered,
}: {
    question: Question;
    onAnswer: (correct: boolean) => void;
    answered: boolean;
}) {
    const items = question.checklistItems!;
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [checked, setChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    const toggle = (id: string) => {
        if (checked || answered) return;
        setSelected((s) => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCheck = () => {
        const required = items.filter((i) => i.isRequired).map((i) => i.id);
        const notRequired = items.filter((i) => !i.isRequired).map((i) => i.id);
        const correct =
            required.every((id) => selected.has(id)) &&
            notRequired.every((id) => !selected.has(id));
        setIsCorrect(correct);
        setChecked(true);
        onAnswer(correct);
    };

    return (
        <div className="space-y-2">
            <p className="text-xs text-muted-foreground">เลือกทุกข้อที่ถูกต้อง</p>
            {items.map((item) => {
                const isSelected = selected.has(item.id);
                let cls = 'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm cursor-pointer transition-all ';
                if (!checked) {
                    cls += isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary';
                } else if (item.isRequired && isSelected) {
                    cls += 'border-green-500 bg-green-500/10';
                } else if (item.isRequired && !isSelected) {
                    cls += 'border-red-500 bg-red-500/10';
                } else if (!item.isRequired && isSelected) {
                    cls += 'border-red-500 bg-red-500/10';
                } else {
                    cls += 'border-border opacity-60';
                }
                return (
                    <div key={item.id} className={cls} onClick={() => toggle(item.id)}>
                        <span className={`mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <span className="flex-1">{item.text}</span>
                        {checked && item.isRequired && isSelected && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                        {checked && item.isRequired && !isSelected && <X className="h-4 w-4 text-red-500 shrink-0" />}
                        {checked && !item.isRequired && isSelected && <X className="h-4 w-4 text-red-500 shrink-0" />}
                    </div>
                );
            })}
            {!checked && !answered && (
                <Button onClick={handleCheck} className="mt-2">ตรวจคำตอบ</Button>
            )}
            {checked && (
                <div className={`p-3 rounded-lg text-sm font-medium ${isCorrect ? 'bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-orange-500/10 text-orange-700 dark:text-orange-300'}`}>
                    {isCorrect ? '✅ ถูกต้องทุกข้อ!' : '⚠️ มีบางข้อที่ยังไม่ถูกต้อง ดูเฉลยในคำอธิบายด้านล่าง'}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================
export default function MmertJourney({ initialProgress }: Props) {
    const [activeLessonIndex, setActiveLessonIndex] = useState<number>(() => {
        const initId = initialProgress.currentLessonId || 1;
        const idx = MMERT_LESSONS.findIndex((l) => l.id === initId);
        return idx !== -1 ? idx : 0;
    });
    const [currentCategory, setCurrentCategory] = useState<string>('all');
    const [completedLessons, setCompletedLessons] = useState<Set<number>>(() => {
        const set = new Set<number>(initialProgress.completedLessons || []);
        try {
            const local = localStorage.getItem('km_mmert_completed');
            if (local) JSON.parse(local).forEach((id: number) => set.add(id));
        } catch {}
        return set;
    });

    // Per-lesson quiz state
    const [answers, setAnswers] = useState<Record<number, { selectedId: string | null; correct: boolean }>>({});
    const [shownExplanations, setShownExplanations] = useState<Set<number>>(new Set());
    const [earnedPoints, setEarnedPoints] = useState(0);
    const [lessonScore, setLessonScore] = useState(0);
    const [showContent, setShowContent] = useState(true);

    const lesson = MMERT_LESSONS[activeLessonIndex];
    const filteredLessons = currentCategory === 'all'
        ? MMERT_LESSONS
        : MMERT_LESSONS.filter((l) => l.category === currentCategory);

    const totalPct = Math.round((completedLessons.size / MMERT_LESSONS.length) * 100);

    const saveProgress = async (lessonId: number) => {
        try {
            const newCompleted = Array.from(new Set([...completedLessons, lessonId]));
            localStorage.setItem('km_mmert_completed', JSON.stringify(newCompleted));
            setCompletedLessons(new Set(newCompleted));
            await axios.post(route('km.interactive.progress'), {
                track: 'mmert',
                completed_lessons: newCompleted,
                current_lesson_id: lessonId,
            });
        } catch {}
    };

    const handleAnswer = (questionId: number, selectedId: string | null, correct: boolean) => {
        if (answers[questionId]) return; // already answered
        setAnswers((a) => ({ ...a, [questionId]: { selectedId, correct } }));
        const q = lesson.questions.find((q) => q.id === questionId)!;
        if (correct) {
            setEarnedPoints((p) => p + q.points);
            setLessonScore((s) => s + q.points);
        }
        setShownExplanations((s) => new Set([...s, questionId]));
    };

    const allAnswered = lesson.questions.every((q) => answers[q.id]);

    useEffect(() => {
        if (allAnswered) {
            saveProgress(lesson.id);
        }
    }, [allAnswered]);

    const goToLesson = (idx: number) => {
        setActiveLessonIndex(idx);
        setAnswers({});
        setShownExplanations(new Set());
        setLessonScore(0);
        setShowContent(true);
        window.scrollTo(0, 0);
    };

    const maxPoints = lesson.questions.reduce((a, q) => a + q.points, 0);

    return (
        <QualityPage
            tone="red"
            icon={ShieldAlert}
            badge="ศูนย์พัฒนาคุณภาพ · KM Interactive · M-MERT"
            title="M-MERT Interactive Learning Lab"
            subtitle="การเรียนรู้เชิงโต้ตอบด้านการแพทย์ฉุกเฉินภัยพิบัติ สำหรับ รพ.ค่ายสุรสิงหนาท อ้างอิงมาตรฐาน สธ. กรมการแพทย์ สพฉ. และ ปภ."
            breadcrumbs={breadcrumbs}
            headTitle="M-MERT Interactive Learning Lab"
            subNav={<KmSubNav active="km.interactive.mmert" />}
        >
            <div className="flex flex-col xl:flex-row gap-6">
                {/* ===== Sidebar ===== */}
                <aside className="xl:w-72 shrink-0 space-y-4">
                    {/* Progress */}
                    <div className="rounded-2xl border bg-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">ความคืบหน้า</span>
                            <span className="text-xs text-muted-foreground">{completedLessons.size}/{MMERT_LESSONS.length} บท</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${totalPct}%` }} />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{earnedPoints}</span>
                            <span className="text-muted-foreground">คะแนนรวม</span>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="rounded-2xl border bg-card p-4 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">หมวดหมู่</p>
                        {MMERT_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setCurrentCategory(cat.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2
                                    ${currentCategory === cat.id ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Lesson List */}
                    <div className="rounded-2xl border bg-card p-4 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">บทเรียน</p>
                        {filteredLessons.map((l, idx) => {
                            const realIdx = MMERT_LESSONS.findIndex((x) => x.id === l.id);
                            return (
                                <button
                                    key={l.id}
                                    onClick={() => goToLesson(realIdx)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2
                                        ${activeLessonIndex === realIdx ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                    {completedLessons.has(l.id) ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                    ) : (
                                        <span className="h-3.5 w-3.5 rounded-full border border-current shrink-0" />
                                    )}
                                    <span className="truncate">{l.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* ===== Main Content ===== */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Lesson Header */}
                    <div className={`rounded-2xl border bg-gradient-to-br p-6 ${COLOR_MAP[lesson.color] || COLOR_MAP.blue}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{lesson.icon}</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${TEXT_COLOR[lesson.color]}`}>{lesson.level}</span>
                                    {completedLessons.has(lesson.id) && (
                                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full border border-green-500/20">
                                            <CheckCircle2 className="h-3 w-3" /> เสร็จแล้ว
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-black text-foreground">{lesson.title}</h2>
                                <p className="text-sm text-muted-foreground">{lesson.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-2xl font-black text-foreground">{lessonScore}/{maxPoints}</div>
                                <div className="text-xs text-muted-foreground">คะแนนบทนี้</div>
                            </div>
                        </div>

                        {/* Key Points */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {lesson.keyPoints.map((kp, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs bg-background/50 rounded-lg px-3 py-2">
                                    <Zap className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${TEXT_COLOR[lesson.color]}`} />
                                    <span>{kp}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Toggle */}
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        <button
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                            onClick={() => setShowContent((s) => !s)}
                        >
                            <div className="flex items-center gap-2 font-semibold">
                                <BookOpen className="h-4 w-4 text-primary" />
                                เนื้อหาประจำบท
                            </div>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showContent ? 'rotate-180' : ''}`} />
                        </button>
                        {showContent && (
                            <div
                                className="px-6 pb-6 prose prose-sm dark:prose-invert max-w-none overflow-x-auto"
                                dangerouslySetInnerHTML={{
                                    __html: lesson.content
                                        .replace(/```[\s\S]*?```/g, (match) => {
                                            const code = match.replace(/```\w*\n?/, '').replace(/```$/, '');
                                            return `<pre class="bg-muted rounded-xl p-4 text-xs overflow-x-auto whitespace-pre font-mono my-4">${code}</pre>`;
                                        })
                                        .replace(/\n\| (.*) \|\n/g, (match, row) => {
                                            const cells = row.split(' | ').map((c: string) => `<td class="border border-border px-3 py-1.5 text-sm">${c}</td>`).join('');
                                            return `<tr>${cells}</tr>`;
                                        })
                                        .replace(/\|\s*[-:]+\s*\|[\s\S]*?\n(?=\|)/g, '')
                                        .replace(/(<tr>[\s\S]*?<\/tr>)+/g, (m) => `<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-border rounded-lg">${m}</table></div>`)
                                        .replace(/### (.*)\n/g, '<h3 class="text-base font-bold mt-5 mb-2">$1</h3>')
                                        .replace(/## (.*)\n/g, '<h2 class="text-lg font-bold mt-6 mb-3 border-b pb-1">$1</h2>')
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
                                        .replace(/^(\d+)\. (.*)/gm, '<div class="flex gap-2 my-1 text-sm"><span class="font-bold text-primary shrink-0">$1.</span><span>$2</span></div>')
                                        .replace(/^- (.*)/gm, '<div class="flex gap-2 my-0.5 text-sm"><span class="text-primary shrink-0">•</span><span>$1</span></div>')
                                        .replace(/\n\n/g, '<br/>')
                                }}
                            />
                        )}
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            <h3 className="text-base font-bold">แบบทดสอบประจำบท</h3>
                            <span className="ml-auto text-xs text-muted-foreground">{Object.keys(answers).length}/{lesson.questions.length} ข้อ</span>
                        </div>

                        {lesson.questions.map((q, qIdx) => {
                            const isAnswered = !!answers[q.id];
                            const showExp = shownExplanations.has(q.id);

                            return (
                                <div key={q.id} className={`rounded-2xl border bg-card p-5 transition-all ${isAnswered ? 'border-border' : 'border-primary/20'}`}>
                                    <div className="flex items-start gap-3 mb-4">
                                        <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2 py-1 shrink-0">
                                            ข้อ {qIdx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold leading-relaxed">{q.question}</p>
                                            <span className="text-xs text-muted-foreground mt-1">{q.points} คะแนน</span>
                                        </div>
                                        {isAnswered && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${answers[q.id].correct ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                                {answers[q.id].correct ? `+${q.points}` : '+0'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Render by type */}
                                    {(q.type === 'mcq' || q.type === 'scenario') && (
                                        <MCQQuestion
                                            question={q}
                                            onAnswer={(id, correct) => handleAnswer(q.id, id, correct)}
                                            answered={isAnswered}
                                            selectedId={answers[q.id]?.selectedId ?? null}
                                        />
                                    )}
                                    {q.type === 'ordering' && (
                                        <OrderingQuestion
                                            question={q}
                                            onAnswer={(correct) => handleAnswer(q.id, null, correct)}
                                            answered={isAnswered}
                                        />
                                    )}
                                    {q.type === 'matching' && (
                                        <MatchingQuestion
                                            question={q}
                                            onAnswer={(correct) => handleAnswer(q.id, null, correct)}
                                            answered={isAnswered}
                                        />
                                    )}
                                    {q.type === 'checklist' && (
                                        <ChecklistQuestion
                                            question={q}
                                            onAnswer={(correct) => handleAnswer(q.id, null, correct)}
                                            answered={isAnswered}
                                        />
                                    )}

                                    {/* Explanation */}
                                    {showExp && (
                                        <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-blue-700 dark:text-blue-300 flex gap-2">
                                            <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{q.explanation}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Completion Banner */}
                        {allAnswered && (
                            <div className={`rounded-2xl p-6 text-center border ${lessonScore === maxPoints ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                <div className="text-4xl mb-3">{lessonScore === maxPoints ? '🏆' : '✅'}</div>
                                <p className="font-black text-xl mb-1">
                                    {lessonScore === maxPoints ? 'ยอดเยี่ยม! ตอบถูกทุกข้อ' : 'บทเรียนนี้เสร็จสมบูรณ์'}
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    คะแนนที่ได้: <strong>{lessonScore}/{maxPoints}</strong> คะแนน
                                </p>
                                <div className="flex gap-3 justify-center flex-wrap">
                                    {activeLessonIndex < MMERT_LESSONS.length - 1 && (
                                        <Button onClick={() => goToLesson(activeLessonIndex + 1)} className="gap-2">
                                            บทถัดไป <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => { setAnswers({}); setShownExplanations(new Set()); setLessonScore(0); }} className="gap-2">
                                        <RotateCcw className="h-4 w-4" /> ทำซ้ำ
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            disabled={activeLessonIndex === 0}
                            onClick={() => goToLesson(activeLessonIndex - 1)}
                            className="gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" /> บทก่อนหน้า
                        </Button>
                        <Button
                            variant="outline"
                            disabled={activeLessonIndex === MMERT_LESSONS.length - 1}
                            onClick={() => goToLesson(activeLessonIndex + 1)}
                            className="gap-2"
                        >
                            บทถัดไป <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </QualityPage>
    );
}
