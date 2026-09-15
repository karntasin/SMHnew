import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
    Save,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Zap,
    Loader2,
    ChevronDown,
    ChevronRight,
    FileSearch,
    Sparkles,
    CircleDot,
} from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { maskPatientName } from '@/lib/pii';
import { QualityPage, StatusPill } from '@/components/quality/quality-ui';
import MraSubNav, { mraBreadcrumbs } from './MraSubNav';

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
    weight: number;
    is_conditional?: boolean;
    is_required_section?: boolean;
    criteria: Criteria[];
}

interface AuditResult {
    criteria_id: number;
    result: 'pass' | 'fail' | 'na' | 'pending';
    hosxp_value: string | null;
    auditor_comment: string | null;
}

interface Audit {
    id: number;
    vn: string;
    hn: string;
    patient_name: string;
    visit_date: string;
    status: string;
    audit_type: string;
    chief_complaint: string | null;
    pdx: string | null;
    bp_systolic: number | null;
    bp_diastolic: number | null;
    pulse: number | null;
    temperature: number | null;
    respiratory_rate: number | null;
    accuracy_percentage: number;
}

interface ExistingResult {
    mra_criteria_id: number;
    result: string;
    hosxp_value: string | null;
    auditor_comment: string | null;
}

interface Props {
    audit: Audit;
    categories: Category[];
    existingResults: Record<number, ExistingResult>;
    passingScore?: number;
    standardLabel?: string;
}

type ScoreKey = 'pass' | 'fail' | 'na' | 'pending';

const RESULT_META: Record<
    ScoreKey,
    { label: string; short: string; active: string; idle: string; icon: React.ReactNode }
> = {
    pass: {
        label: 'ผ่าน',
        short: '1',
        active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30',
        idle: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    fail: {
        label: 'ไม่ผ่าน',
        short: '0',
        active: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30',
        idle: 'border-rose-200 text-rose-700 hover:bg-rose-50',
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
    na: {
        label: 'N/A',
        short: '–',
        active: 'bg-slate-600 text-white border-slate-600 shadow-sm',
        idle: 'border-slate-200 text-slate-600 hover:bg-slate-50',
        icon: <MinusCircle className="h-3.5 w-3.5" />,
    },
    pending: {
        label: 'รอตรวจ',
        short: '?',
        active: 'bg-amber-500 text-white border-amber-500',
        idle: 'border-amber-200 text-amber-700',
        icon: <CircleDot className="h-3.5 w-3.5" />,
    },
};

export default function MraAuditForm({
    audit,
    categories,
    existingResults,
    passingScore = 80,
    standardLabel = 'MRA 2563',
}: Props) {
    const [results, setResults] = useState<Record<number, AuditResult>>({});
    const [summaryNotes, setSummaryNotes] = useState('');
    const [isAutoChecking, setIsAutoChecking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(categories[0]?.id ?? null);
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
        new Set(categories.filter((c) => !c.is_conditional).map((c) => c.id)),
    );
    const [autoSummary, setAutoSummary] = useState<{ pass: number; fail: number; skip: number } | null>(null);

    useEffect(() => {
        const initialResults: Record<number, AuditResult> = {};
        const hasExisting = Object.keys(existingResults || {}).length > 0;

        categories.forEach((category) => {
            const defaultResult = !hasExisting && category.is_conditional ? 'na' : 'pending';
            category.criteria.forEach((criterion) => {
                initialResults[criterion.id] = {
                    criteria_id: criterion.id,
                    result: defaultResult,
                    hosxp_value: null,
                    auditor_comment: null,
                };
            });
        });

        Object.values(existingResults || {}).forEach((existing) => {
            if (existing.mra_criteria_id) {
                initialResults[existing.mra_criteria_id] = {
                    criteria_id: existing.mra_criteria_id,
                    result: existing.result as ScoreKey,
                    hosxp_value: existing.hosxp_value,
                    auditor_comment: existing.auditor_comment,
                };
            }
        });

        setResults(initialResults);
    }, [categories, existingResults]);

    const handleAutoCheck = async () => {
        if (!audit.vn) {
            toast.error('ไม่มี VN สำหรับตรวจสอบอัตโนมัติ');
            return;
        }

        setIsAutoChecking(true);
        try {
            const response = await axios.get('/mra/auto-check', {
                params: { vn: audit.vn, audit_type: audit.audit_type },
            });

            const autoChecks = response.data.auto_checks || {};
            let pass = 0;
            let fail = 0;
            let skip = 0;

            setResults((prev) => {
                const updated = { ...prev };
                Object.values(autoChecks).forEach((check: any) => {
                    if (!check?.criteria_id) return;
                    if (check.passed === null || check.passed === undefined) {
                        skip++;
                        updated[check.criteria_id] = {
                            ...updated[check.criteria_id],
                            criteria_id: check.criteria_id,
                            hosxp_value: check.value?.toString?.() || updated[check.criteria_id]?.hosxp_value || null,
                        };
                        return;
                    }
                    if (check.passed) pass++;
                    else fail++;
                    updated[check.criteria_id] = {
                        ...updated[check.criteria_id],
                        criteria_id: check.criteria_id,
                        result: check.passed ? 'pass' : 'fail',
                        hosxp_value: check.value?.toString?.() || null,
                    };
                });
                return updated;
            });

            setAutoSummary({ pass, fail, skip });
            toast.success(`ตรวจอัตโนมัติแล้ว · ผ่าน ${pass} · ไม่พบ/ไม่ผ่าน ${fail} · ต้องตรวจเอง ${skip}`);
        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาดในการตรวจสอบอัตโนมัติ');
        } finally {
            setIsAutoChecking(false);
        }
    };

    const setResult = (criteriaId: number, result: 'pass' | 'fail' | 'na') => {
        setResults((prev) => ({
            ...prev,
            [criteriaId]: {
                ...prev[criteriaId],
                criteria_id: criteriaId,
                result,
            },
        }));
    };

    const setCategoryResult = (category: Category, result: ScoreKey) => {
        setResults((prev) => {
            const updated = { ...prev };
            category.criteria.forEach((criterion) => {
                updated[criterion.id] = {
                    ...updated[criterion.id],
                    criteria_id: criterion.id,
                    result,
                };
            });
            return updated;
        });
    };

    const setComment = (criteriaId: number, comment: string) => {
        setResults((prev) => ({
            ...prev,
            [criteriaId]: {
                ...prev[criteriaId],
                auditor_comment: comment,
            },
        }));
    };

    const toggleCategory = (categoryId: number) => {
        setActiveCategoryId(categoryId);
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) next.delete(categoryId);
            else next.add(categoryId);
            return next;
        });
    };

    const scores = useMemo(() => {
        let totalMax = 0;
        let totalObtained = 0;
        let totalChecked = 0;
        let totalPending = 0;
        let passCount = 0;
        let failCount = 0;
        let naCount = 0;

        const categoryScores: Record<
            number,
            { max: number; obtained: number; checked: number; total: number; pending: number }
        > = {};

        categories.forEach((category) => {
            categoryScores[category.id] = {
                max: 0,
                obtained: 0,
                checked: 0,
                total: category.criteria.length,
                pending: 0,
            };

            category.criteria.forEach((criterion) => {
                const result = results[criterion.id];
                if (result?.result === 'pass') {
                    categoryScores[category.id].obtained += criterion.max_score;
                    categoryScores[category.id].max += criterion.max_score;
                    categoryScores[category.id].checked++;
                    totalObtained += criterion.max_score;
                    totalMax += criterion.max_score;
                    totalChecked++;
                    passCount++;
                } else if (result?.result === 'fail') {
                    categoryScores[category.id].max += criterion.max_score;
                    categoryScores[category.id].checked++;
                    totalMax += criterion.max_score;
                    totalChecked++;
                    failCount++;
                } else if (result?.result === 'na') {
                    categoryScores[category.id].checked++;
                    totalChecked++;
                    naCount++;
                } else {
                    categoryScores[category.id].pending++;
                    totalPending++;
                }
            });
        });

        const accuracy = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const progress = totalChecked + totalPending > 0 ? (totalChecked / (totalChecked + totalPending)) * 100 : 0;

        return {
            totalMax,
            totalObtained,
            accuracy,
            progress,
            totalChecked,
            totalPending,
            passCount,
            failCount,
            naCount,
            categoryScores,
        };
    }, [results, categories]);

    const handleSave = async (finalize = false) => {
        setIsSaving(true);
        try {
            await axios.post(`/mra/${audit.id}/audit`, {
                results: Object.values(results),
                summary_notes: summaryNotes,
                finalize,
            });
            toast.success(finalize ? 'บันทึกและสรุปผลเรียบร้อยแล้ว' : 'บันทึกแบบร่างเรียบร้อยแล้ว');
            if (finalize) router.visit(`/mra/${audit.id}`);
        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const passedGate = scores.accuracy >= passingScore && scores.totalMax > 0;

    return (
        <QualityPage
            tone="indigo"
            icon={FileSearch}
            badge="ศูนย์พัฒนาคุณภาพ · MRA"
            title="ประเมินคุณภาพเวชระเบียน"
            subtitle={`${standardLabel} · ${maskPatientName(audit.patient_name)}`}
            breadcrumbs={mraBreadcrumbs({ title: `ประเมิน #${audit.id}`, href: `/mra/${audit.id}/audit` })}
            headTitle={`ประเมินเวชระเบียน - ${audit.hn}`}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
                        onClick={handleAutoCheck}
                        disabled={isAutoChecking}
                    >
                        {isAutoChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                        ตรวจจาก HOSxP
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => handleSave(false)} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        บันทึกแบบร่าง
                    </Button>
                    <Button
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleSave(true)}
                        disabled={isSaving || scores.totalPending > 0}
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        สรุปผล
                    </Button>
                </div>
            }
            subNav={<MraSubNav active="mra.index" />}
        >
            <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                {/* Sidebar */}
                <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-900 p-5 text-white shadow-xl shadow-indigo-900/20">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200/80">
                            <Sparkles className="h-3.5 w-3.5" />
                            สรุปคะแนนสด
                        </div>
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <div className="text-4xl font-bold tracking-tight">{scores.accuracy.toFixed(1)}%</div>
                                <div className="mt-1 text-sm text-sky-100/80">
                                    {scores.totalObtained}/{scores.totalMax} คะแนน
                                </div>
                            </div>
                            <StatusPill
                                label={passedGate ? `ผ่าน ≥${passingScore}%` : `เป้า ${passingScore}%`}
                                className={
                                    passedGate
                                        ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100'
                                        : 'border-amber-300/40 bg-amber-400/20 text-amber-100'
                                }
                            />
                        </div>
                        <div className="mt-4">
                            <div className="mb-1 flex justify-between text-xs text-sky-100/70">
                                <span>ความคืบหน้า</span>
                                <span>
                                    {scores.totalChecked}/{scores.totalChecked + scores.totalPending}
                                </span>
                            </div>
                            <Progress value={scores.progress} className="h-2 bg-white/10" />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-2xl bg-white/10 px-2 py-2">
                                <div className="text-lg font-bold text-emerald-300">{scores.passCount}</div>
                                <div className="text-[11px] text-sky-100/70">ผ่าน</div>
                            </div>
                            <div className="rounded-2xl bg-white/10 px-2 py-2">
                                <div className="text-lg font-bold text-rose-300">{scores.failCount}</div>
                                <div className="text-[11px] text-sky-100/70">ไม่ผ่าน</div>
                            </div>
                            <div className="rounded-2xl bg-white/10 px-2 py-2">
                                <div className="text-lg font-bold text-slate-200">{scores.naCount}</div>
                                <div className="text-[11px] text-sky-100/70">N/A</div>
                            </div>
                        </div>
                        {autoSummary ? (
                            <p className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-sky-100/80">
                                รอบล่าสุดจาก HOSxP: ผ่าน {autoSummary.pass} · ไม่ผ่าน {autoSummary.fail} · ต้องตรวจเอง{' '}
                                {autoSummary.skip}
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">ผู้ป่วย</div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">HN</span>
                                <span className="font-mono font-semibold text-slate-800">{audit.hn}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">VN</span>
                                <span className="font-mono text-slate-800">{audit.vn || '-'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">วันที่</span>
                                <span className="text-slate-800">{audit.visit_date}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="text-slate-500">ประเภท</span>
                                <StatusPill
                                    label={audit.audit_type.toUpperCase()}
                                    className={
                                        audit.audit_type === 'opd'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-violet-200 bg-violet-50 text-violet-700'
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                            <div>
                                <div className="text-xs text-slate-400">Chief complaint</div>
                                <div className="mt-0.5 text-slate-700">{audit.chief_complaint || '—'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">PDx</div>
                                <div className="mt-0.5 font-medium text-slate-800">{audit.pdx || '—'}</div>
                            </div>
                            {(audit.bp_systolic || audit.pulse) && (
                                <div>
                                    <div className="text-xs text-slate-400">Vital signs</div>
                                    <div className="mt-0.5 text-slate-700">
                                        BP {audit.bp_systolic || '-'}/{audit.bp_diastolic || '-'} · P {audit.pulse || '-'} · T{' '}
                                        {audit.temperature || '-'} · R {audit.respiratory_rate || '-'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">หมวดการตรวจ</div>
                        <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                            {categories.map((category) => {
                                const catScore = scores.categoryScores[category.id];
                                const catAccuracy = catScore.max > 0 ? (catScore.obtained / catScore.max) * 100 : 0;
                                const active = activeCategoryId === category.id;
                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveCategoryId(category.id);
                                            setExpandedCategories((prev) => new Set(prev).add(category.id));
                                            document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition',
                                            active ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50',
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-semibold text-slate-800">{category.code}</div>
                                            <div className="truncate text-[11px] text-slate-500">{category.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div
                                                className={cn(
                                                    'text-sm font-bold',
                                                    catScore.max === 0
                                                        ? 'text-slate-400'
                                                        : catAccuracy >= passingScore
                                                          ? 'text-emerald-600'
                                                          : 'text-amber-600',
                                                )}
                                            >
                                                {catScore.max === 0 ? 'N/A' : `${catAccuracy.toFixed(0)}%`}
                                            </div>
                                            {catScore.pending > 0 ? (
                                                <div className="text-[10px] text-rose-500">ค้าง {catScore.pending}</div>
                                            ) : (
                                                <div className="text-[10px] text-slate-400">
                                                    {catScore.obtained}/{catScore.max}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* Main evaluation */}
                <div className="space-y-4">
                    <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
                        กด <strong>ผ่าน / ไม่ผ่าน / N/A</strong> ทีละข้อ · หมวดเงื่อนไขที่ไม่เกี่ยวข้องใช้ <strong>N/A ทั้งหมวด</strong> ·
                        ปุ่ม <strong>ตรวจจาก HOSxP</strong> จะเติมเฉพาะข้อที่ดึงข้อมูลได้ และข้อที่ต้องดูเอกสารจะคงไว้ให้ตรวจเอง
                    </div>

                    {categories.map((category) => {
                        const isExpanded = expandedCategories.has(category.id);
                        const catScore = scores.categoryScores[category.id];
                        let lastGroupKey: string | null | undefined;

                        return (
                            <section
                                key={category.id}
                                id={`cat-${category.id}`}
                                className="scroll-mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5"
                            >
                                <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggleCategory(category.id)}>
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                            )}
                                            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                                {category.code}
                                            </span>
                                            {category.is_conditional ? (
                                                <StatusPill label="เงื่อนไข" className="border-amber-200 bg-amber-50 text-amber-800" />
                                            ) : (
                                                <StatusPill label="บังคับ" className="border-sky-200 bg-sky-50 text-sky-800" />
                                            )}
                                        </div>
                                        <h2 className="mt-1.5 text-base font-bold text-slate-900 sm:text-lg">{category.name}</h2>
                                        {category.hint ? <p className="mt-1 text-xs text-slate-500">{category.hint}</p> : null}
                                    </button>
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-right">
                                            <div className="text-lg font-bold text-slate-800">
                                                {catScore.obtained}/{catScore.max}
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                {catScore.pending > 0 ? `ค้าง ${catScore.pending} ข้อ` : 'ครบแล้ว'}
                                            </div>
                                        </div>
                                        {category.is_conditional ? (
                                            <>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-xl"
                                                    onClick={() => setCategoryResult(category, 'na')}
                                                >
                                                    N/A ทั้งหมวด
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="rounded-xl"
                                                    onClick={() => setCategoryResult(category, 'pending')}
                                                >
                                                    รีเซ็ต
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                {isExpanded ? (
                                    <div className="space-y-3 p-3 sm:p-4">
                                        {category.criteria.map((criterion) => {
                                            const result = results[criterion.id];
                                            const current = (result?.result || 'pending') as ScoreKey;
                                            const showGroupHeader = criterion.group_key && criterion.group_key !== lastGroupKey;
                                            if (criterion.group_key) lastGroupKey = criterion.group_key;

                                            return (
                                                <React.Fragment key={criterion.id}>
                                                    {showGroupHeader ? (
                                                        <div className="rounded-2xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">
                                                            {criterion.group_title || criterion.group_key}
                                                        </div>
                                                    ) : null}
                                                    <div
                                                        className={cn(
                                                            'rounded-2xl border px-3 py-3 transition sm:px-4',
                                                            current === 'pass' && 'border-emerald-200 bg-emerald-50/50',
                                                            current === 'fail' && 'border-rose-200 bg-rose-50/50',
                                                            current === 'na' && 'border-slate-200 bg-slate-50/80',
                                                            current === 'pending' && 'border-slate-200 bg-white',
                                                        )}
                                                    >
                                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                                                        {criterion.code}
                                                                    </span>
                                                                    {criterion.is_bonus ? (
                                                                        <StatusPill
                                                                            label="โบนัส +1"
                                                                            className="border-amber-200 bg-amber-50 text-amber-800"
                                                                        />
                                                                    ) : null}
                                                                    {criterion.data_type !== 'manual' ? (
                                                                        <StatusPill
                                                                            label="Auto"
                                                                            className="border-violet-200 bg-violet-50 text-violet-700"
                                                                        />
                                                                    ) : null}
                                                                </div>
                                                                <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
                                                                    {criterion.name}
                                                                </p>
                                                                {result?.hosxp_value ? (
                                                                    <div className="mt-2 inline-flex max-w-full items-start gap-2 rounded-xl border border-violet-100 bg-violet-50/80 px-2.5 py-1.5 text-xs text-violet-900">
                                                                        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                                        <span className="break-all">
                                                                            HOSxP: {result.hosxp_value}
                                                                        </span>
                                                                    </div>
                                                                ) : null}
                                                            </div>

                                                            <div className="flex shrink-0 gap-1.5">
                                                                {(['pass', 'fail', 'na'] as const).map((key) => {
                                                                    const meta = RESULT_META[key];
                                                                    const active = current === key;
                                                                    return (
                                                                        <button
                                                                            key={key}
                                                                            type="button"
                                                                            onClick={() => setResult(criterion.id, key)}
                                                                            className={cn(
                                                                                'inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-semibold transition',
                                                                                active ? meta.active : meta.idle,
                                                                            )}
                                                                            title={`${meta.label} (${meta.short})`}
                                                                        >
                                                                            {meta.icon}
                                                                            {meta.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {current === 'fail' ? (
                                                            <div className="mt-3">
                                                                <Textarea
                                                                    value={result?.auditor_comment || ''}
                                                                    onChange={(e) => setComment(criterion.id, e.target.value)}
                                                                    placeholder="ระบุเหตุผลที่ไม่ผ่าน..."
                                                                    className="min-h-[72px] rounded-xl border-rose-200 bg-white"
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </section>
                        );
                    })}

                    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">หมายเหตุสรุป</h3>
                        <Textarea
                            value={summaryNotes}
                            onChange={(e) => setSummaryNotes(e.target.value)}
                            placeholder="สรุปประเด็นสำคัญจากการประเมิน..."
                            className="min-h-24 rounded-2xl"
                        />
                    </section>
                </div>
            </div>

            <div className="sticky bottom-3 z-20 mt-2 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>
                        ตรวจแล้ว {scores.totalChecked}/{scores.totalChecked + scores.totalPending}
                    </span>
                    <StatusPill
                        label={`${scores.accuracy.toFixed(1)}%`}
                        className={
                            passedGate
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                        }
                    />
                    {scores.totalPending > 0 ? (
                        <StatusPill label={`ค้าง ${scores.totalPending} ข้อ`} className="border-rose-200 bg-rose-50 text-rose-700" />
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl border-violet-200"
                        onClick={handleAutoCheck}
                        disabled={isAutoChecking}
                    >
                        {isAutoChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                        ตรวจจาก HOSxP
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => handleSave(false)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        บันทึกแบบร่าง
                    </Button>
                    <Button
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleSave(true)}
                        disabled={isSaving || scores.totalPending > 0}
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        สรุปผลและบันทึก
                    </Button>
                </div>
            </div>
        </QualityPage>
    );
}
