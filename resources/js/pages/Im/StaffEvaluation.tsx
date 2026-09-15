import React, { useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ImPage, StatCard, Panel, Modal, Field, StatusPill, EmptyState } from '@/pages/Im/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { imInput, imSelect, fmtDate } from '@/pages/Im/shared';
import {
    ClipboardCheck,
    Plus,
    Trash2,
    Pencil,
    BarChart3,
    ListChecks,
    Users,
    AlertTriangle,
    CalendarClock,
    FileDown,
} from 'lucide-react';

interface Staff {
    id: number;
    name: string;
}
interface Topic {
    id: number;
    code?: string | null;
    parent_id?: number | null;
    parent_title?: string | null;
    parent_code?: string | null;
    is_group: boolean;
    title: string;
    description?: string | null;
    max_score: number;
    weight: number;
    sort_order: number;
    is_active: boolean;
    children?: Topic[];
}
interface TopicGroup extends Topic {
    children: Topic[];
}
interface ScoreRow {
    id: number;
    topic_id?: number | null;
    topic_title: string;
    max_score: number;
    weight: number;
    score: number;
    note?: string | null;
}
interface Evaluation {
    id: number;
    user_id?: number | null;
    staff_name: string;
    evaluator_name?: string | null;
    period_months: number;
    period_start: string;
    period_end: string;
    evaluated_at?: string | null;
    next_due_at?: string | null;
    total_score?: number | null;
    max_total_score?: number | null;
    percent_score?: number | null;
    overall_comment?: string | null;
    scores: ScoreRow[];
}
interface PeriodOption {
    value: number;
    label: string;
}
interface StaffReportRow {
    staff_name: string;
    user_id?: number | null;
    count: number;
    avg_percent: number;
    latest_percent?: number | null;
    latest_at?: string | null;
    next_due_at?: string | null;
    period_months: number;
    is_overdue: boolean;
}
interface TopicAvg {
    topic_id: number;
    title: string;
    parent_title?: string | null;
    avg_score: number | null;
    max_score: number;
    count: number;
}
interface CycleRow {
    period_start: string;
    period_end: string;
    period_months: number;
    staff_count: number;
    avg_percent: number;
}

interface Props {
    topics: Topic[];
    topicGroups: TopicGroup[];
    ungroupedTopics: Topic[];
    activeTopics: Topic[];
    evaluations: Evaluation[];
    staff: Staff[];
    filters: { period_months: number | null; year: number | null; staff_id: number | null };
    periodOptions: PeriodOption[];
    report: {
        by_staff: StaffReportRow[];
        topic_averages: TopicAvg[];
        due_soon: StaffReportRow[];
        cycles: CycleRow[];
    };
    summary: {
        topics: number;
        groups: number;
        evaluations: number;
        avg_percent: number;
        overdue: number;
        due_soon: number;
    };
}

type Tab = 'topics' | 'evaluations' | 'report';

const periodBadge = (months: number) =>
    months === 3 ? 'bg-sky-100 text-sky-700 border-sky-200' : months === 6 ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200';

export default function StaffEvaluation({
    topics,
    topicGroups,
    ungroupedTopics,
    activeTopics,
    evaluations,
    staff,
    filters,
    periodOptions,
    report,
    summary,
}: Props) {
    const [tab, setTab] = useState<Tab>('evaluations');
    const [topicModal, setTopicModal] = useState<{ open: boolean; edit?: Topic }>({ open: false });
    const [evalModal, setEvalModal] = useState(false);
    const [detail, setDetail] = useState<Evaluation | null>(null);

    const topicForm = useForm({
        title: '',
        description: '',
        parent_id: '' as string | number,
        is_group: false,
        max_score: 5,
        weight: 1,
        sort_order: 0,
        is_active: true,
    });

    const evalForm = useForm({
        user_id: '' as string | number,
        staff_name: '',
        period_months: filters.period_months || 6,
        period_start: new Date().toISOString().slice(0, 10),
        evaluated_at: new Date().toISOString().slice(0, 10),
        overall_comment: '',
        scores: activeTopics.map((t) => ({ topic_id: t.id, score: Math.ceil(t.max_score / 2), note: '' })),
    });

    const yearOptions = useMemo(() => {
        const y = new Date().getFullYear();
        return [y, y - 1, y - 2, y - 3, y - 4, y - 5];
    }, []);

    const scoredGroups = useMemo(() => {
        const map = new Map<string, Topic[]>();
        activeTopics.forEach((t) => {
            const key = t.parent_title || 'หัวข้อเพิ่มเติม';
            const rows = map.get(key) ?? [];
            rows.push(t);
            map.set(key, rows);
        });
        return Array.from(map.entries());
    }, [activeTopics]);

    const reportGroups = useMemo(() => {
        const map = new Map<string, TopicAvg[]>();
        report.topic_averages.forEach((t) => {
            const key = t.parent_title || 'หัวข้อเพิ่มเติม';
            const rows = map.get(key) ?? [];
            rows.push(t);
            map.set(key, rows);
        });
        return Array.from(map.entries());
    }, [report.topic_averages]);

    const applyFilters = (patch: Partial<typeof filters> & { year?: number | null }) => {
        const yearValue = patch.year === undefined ? filters.year : patch.year;
        router.get(
            route('im.service-desk.evaluation'),
            {
                period_months: patch.period_months === undefined ? filters.period_months || undefined : patch.period_months || undefined,
                year: yearValue ? yearValue : 'all',
                staff_id: patch.staff_id === undefined ? filters.staff_id || undefined : patch.staff_id || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const cyclePdfHref = (periodStart: string, periodMonths: number) =>
        `${route('im.service-desk.evaluation.cycles.export-pdf')}?period_start=${periodStart}&period_months=${periodMonths}`;
    const evaluationPdfHref = (id: number) => route('im.service-desk.evaluation.export-pdf', id);

    const openCreateTopic = (asGroup = false, parentId?: number) => {
        topicForm.setData({
            title: '',
            description: '',
            parent_id: parentId ?? '',
            is_group: asGroup,
            max_score: asGroup ? 0 : 5,
            weight: asGroup ? 0 : 1,
            sort_order: topics.length + 1,
            is_active: true,
        });
        setTopicModal({ open: true });
    };

    const openEditTopic = (t: Topic) => {
        topicForm.setData({
            title: t.title,
            description: t.description ?? '',
            parent_id: t.parent_id ?? '',
            is_group: t.is_group,
            max_score: t.max_score,
            weight: t.weight,
            sort_order: t.sort_order,
            is_active: t.is_active,
        });
        setTopicModal({ open: true, edit: t });
    };

    const submitTopic = (e: React.FormEvent) => {
        e.preventDefault();
        if (topicModal.edit) {
            topicForm.put(route('im.service-desk.evaluation.topics.update', topicModal.edit.id), {
                onSuccess: () => setTopicModal({ open: false }),
            });
        } else {
            topicForm.post(route('im.service-desk.evaluation.topics.store'), {
                onSuccess: () => setTopicModal({ open: false }),
            });
        }
    };

    const openCreateEval = () => {
        evalForm.setData({
            user_id: '',
            staff_name: '',
            period_months: filters.period_months || 6,
            period_start: new Date().toISOString().slice(0, 10),
            evaluated_at: new Date().toISOString().slice(0, 10),
            overall_comment: '',
            scores: activeTopics.map((t) => ({ topic_id: t.id, score: Math.ceil(t.max_score / 2), note: '' })),
        });
        setEvalModal(true);
    };

    const pickStaff = (userId: string) => {
        if (!userId) {
            evalForm.setData('user_id', '');
            return;
        }
        const u = staff.find((s) => String(s.id) === userId);
        evalForm.setData({
            ...evalForm.data,
            user_id: Number(userId),
            staff_name: u?.name || evalForm.data.staff_name,
        });
    };

    const setScore = (topicId: number, patch: Partial<{ score: number; note: string }>) => {
        evalForm.setData(
            'scores',
            evalForm.data.scores.map((s) => (s.topic_id === topicId ? { ...s, ...patch } : s)),
        );
    };

    const submitEval = (e: React.FormEvent) => {
        e.preventDefault();
        evalForm.post(route('im.service-desk.evaluation.store'), {
            onSuccess: () => setEvalModal(false),
        });
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'evaluations', label: 'บันทึกการประเมิน' },
        { key: 'topics', label: 'หัวข้อการประเมิน' },
        { key: 'report', label: 'รายงานผล' },
    ];

    return (
        <ImPage
            active="im.service-desk.evaluation"
            icon={ClipboardCheck}
            badge="หมวดที่ 4"
            title="ประเมินเจ้าหน้าที่ IT"
            subtitle="เกณฑ์ตามมาตรฐาน HA (สรพ.) และ HAIT 7 หมวด · บันทึกผลตามรอบ 3 / 6 / 12 เดือน"
            actions={
                <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={tab === 'topics' ? () => openCreateTopic(false) : openCreateEval}>
                    <Plus className="mr-1 h-4 w-4" />
                    {tab === 'topics' ? 'เพิ่มหัวข้อย่อย' : 'ประเมินเจ้าหน้าที่'}
                </Button>
            }
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <StatCard label="หมวดหลัก" value={summary.groups} icon={ListChecks} tone="indigo" />
                <StatCard label="หัวข้อย่อยที่ใช้ประเมิน" value={summary.topics} icon={ClipboardCheck} tone="sky" />
                <StatCard label="การประเมิน (ปีที่เลือก)" value={summary.evaluations} icon={Users} tone="violet" />
                <StatCard label="คะแนนเฉลี่ย" value={`${summary.avg_percent}%`} icon={BarChart3} tone="emerald" />
                <StatCard label="ครบกำหนดใกล้ถึง" value={summary.due_soon} icon={CalendarClock} tone="amber" />
                <StatCard label="เกินกำหนด" value={summary.overdue} icon={AlertTriangle} tone="rose" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                                tab === t.key ? 'border-sky-400 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200',
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className={imSelect + ' w-auto'}
                        value={filters.year ?? 'all'}
                        onChange={(e) => applyFilters({ year: e.target.value === 'all' ? null : Number(e.target.value) })}
                    >
                        <option value="all">ทุกปี</option>
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>
                                ปี {y + 543}
                            </option>
                        ))}
                    </select>
                    <select
                        className={imSelect + ' w-auto'}
                        value={filters.period_months ?? ''}
                        onChange={(e) => applyFilters({ period_months: e.target.value ? Number(e.target.value) : null })}
                    >
                        <option value="">ทุกรอบ</option>
                        {periodOptions.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                    <select
                        className={imSelect + ' w-auto min-w-[160px]'}
                        value={filters.staff_id ?? ''}
                        onChange={(e) => applyFilters({ staff_id: e.target.value ? Number(e.target.value) : null })}
                    >
                        <option value="">ทุกเจ้าหน้าที่</option>
                        {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {tab === 'topics' && (
                <Panel
                    title="หัวข้อการประเมินเจ้าหน้าที่ IT"
                    description="จัดตามมาตรฐาน HA (สรพ.) และ HAIT ทั้ง 7 หมวด — หัวข้อย่อยมีรายละเอียดสิ่งที่ต้องประเมิน"
                    action={
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openCreateTopic(true)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> เพิ่มหมวดหลัก
                        </Button>
                    }
                >
                    {topicGroups.length === 0 && ungroupedTopics.length === 0 ? (
                        <EmptyState text="ยังไม่มีหัวข้อการประเมิน" />
                    ) : (
                        <div className="space-y-5">
                            {topicGroups.map((group) => (
                                <div key={group.id} className="overflow-hidden rounded-2xl border border-slate-200">
                                    <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50 px-4 py-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {group.code && <StatusPill label={group.code} className="border-sky-200 bg-sky-50 font-mono text-sky-700" />}
                                                <span className="font-semibold text-slate-800">{group.title}</span>
                                                <StatusPill
                                                    label={group.is_active ? 'ใช้งาน' : 'ปิด'}
                                                    className={group.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}
                                                />
                                            </div>
                                            {group.description && <p className="mt-1 text-xs text-slate-500">{group.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="sm" variant="ghost" className="rounded-lg text-sky-700" onClick={() => openCreateTopic(false, group.id)}>
                                                <Plus className="mr-1 h-3.5 w-3.5" /> ย่อย
                                            </Button>
                                            <button onClick={() => openEditTopic(group)} className="text-slate-400 hover:text-sky-600">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => router.delete(route('im.service-desk.evaluation.topics.destroy', group.id))}
                                                className="text-slate-400 hover:text-rose-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {(group.children || []).map((t, idx) => (
                                            <div key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                                                        {t.code && <span className="font-mono text-[11px] text-sky-600">{t.code}</span>}
                                                        <span className="font-medium text-slate-800">{t.title}</span>
                                                        {!t.is_active && <StatusPill label="ปิด" className="border-slate-200 bg-slate-50 text-slate-500" />}
                                                    </div>
                                                    {t.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.description}</p>}
                                                    <div className="mt-1 text-[11px] text-slate-400">
                                                        คะแนนเต็ม {t.max_score} · น้ำหนัก {t.weight}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEditTopic(t)} className="text-slate-400 hover:text-sky-600">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => router.delete(route('im.service-desk.evaluation.topics.destroy', t.id))}
                                                        className="text-slate-400 hover:text-rose-500"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(group.children || []).length === 0 && <div className="px-4 py-3 text-xs text-slate-400">ยังไม่มีหัวข้อย่อยในหมวดนี้</div>}
                                    </div>
                                </div>
                            ))}
                            {ungroupedTopics.length > 0 && (
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold text-slate-700">หัวข้อเพิ่มเติม (นอกหมวดมาตรฐาน)</div>
                                    {ungroupedTopics.map((t) => (
                                        <div key={t.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                                            <div>
                                                <div className="font-semibold text-slate-800">{t.title}</div>
                                                {t.description && <p className="mt-1 text-xs text-slate-500">{t.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEditTopic(t)} className="text-slate-400 hover:text-sky-600">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => router.delete(route('im.service-desk.evaluation.topics.destroy', t.id))}
                                                    className="text-slate-400 hover:text-rose-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'evaluations' && (
                <Panel title="ผลการประเมิน" description="บันทึกการประเมินตามรอบที่กำหนด และดูคะแนนรายหัวข้อ">
                    {evaluations.length === 0 ? (
                        <EmptyState text="ยังไม่มีผลการประเมินในปีที่เลือก" />
                    ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {evaluations.map((e) => (
                                <div key={e.id} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-semibold text-slate-800">{e.staff_name}</div>
                                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                                <StatusPill label={`รอบ ${e.period_months} เดือน`} className={periodBadge(e.period_months)} />
                                                <span className="text-slate-400">
                                                    {fmtDate(e.period_start)} – {fmtDate(e.period_end)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-sky-700">{e.percent_score ?? 0}%</div>
                                            <div className="text-[11px] text-slate-400">
                                                {e.total_score}/{e.max_total_score}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[11px] text-slate-400">
                                        ประเมินเมื่อ {fmtDate(e.evaluated_at)}
                                        {e.evaluator_name ? ` · โดย ${e.evaluator_name}` : ''}
                                        {e.next_due_at ? ` · รอบถัดไป ${fmtDate(e.next_due_at)}` : ''}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setDetail(e)}>
                                            ดูรายละเอียด
                                        </Button>
                                        <Button size="sm" variant="outline" className="rounded-xl" asChild>
                                            <a href={evaluationPdfHref(e.id)} target="_blank" rel="noreferrer">
                                                <FileDown className="mr-1 h-3.5 w-3.5" /> PDF
                                            </a>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-xl text-rose-600"
                                            onClick={() => router.delete(route('im.service-desk.evaluation.destroy', e.id))}
                                        >
                                            <Trash2 className="mr-1 h-3.5 w-3.5" /> ลบ
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'report' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <Panel className="lg:col-span-2" title="รายงาน PDF แยกวงรอบ" description="แต่ละวงรอบมีแบบประเมินครบทุกคน และช่องลงชื่อผู้ตรวจการประเมิน">
                        {report.cycles.length === 0 ? (
                            <EmptyState text="ยังไม่มีวงรอบสำหรับส่งออก PDF" />
                        ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                                {report.cycles.map((cycle) => (
                                    <a
                                        key={`${cycle.period_start}-${cycle.period_months}`}
                                        href={cyclePdfHref(cycle.period_start, cycle.period_months)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-3 text-sm transition hover:border-sky-400 hover:bg-sky-50"
                                    >
                                        <div>
                                            <div className="font-semibold text-slate-800">
                                                {fmtDate(cycle.period_start)} – {fmtDate(cycle.period_end)}
                                            </div>
                                            <div className="mt-1 text-[11px] text-slate-500">
                                                รอบ {cycle.period_months} เดือน · {cycle.staff_count} คน · เฉลี่ย {cycle.avg_percent}%
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                                            <FileDown className="h-4 w-4" /> PDF
                                        </span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </Panel>
                    <Panel title="สรุปตามเจ้าหน้าที่" description="คะแนนเฉลี่ยและกำหนดประเมินรอบถัดไป">
                        {report.by_staff.length === 0 ? (
                            <EmptyState text="ยังไม่มีข้อมูลสำหรับรายงาน" />
                        ) : (
                            <div className="space-y-2">
                                {report.by_staff.map((row) => (
                                    <div key={`${row.user_id}-${row.staff_name}`} className="rounded-xl border border-slate-200 px-3 py-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-sky-600" />
                                                <span className="font-medium text-slate-800">{row.staff_name}</span>
                                            </div>
                                            <span className="text-lg font-bold text-sky-700">{row.avg_percent}%</span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                            <StatusPill label={`รอบ ${row.period_months} ด.`} className={periodBadge(row.period_months)} />
                                            <span>{row.count} ครั้ง</span>
                                            <span>ล่าสุด {fmtDate(row.latest_at)}</span>
                                            <span>รอบถัดไป {fmtDate(row.next_due_at)}</span>
                                            {row.is_overdue && <StatusPill label="เกินกำหนด" className="border-rose-200 bg-rose-50 text-rose-700" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel title="ค่าเฉลี่ยรายหัวข้อ" description="เปรียบเทียบจุดแข็ง/จุดอ่อนตามหมวด HA และ HAIT">
                        {report.topic_averages.every((t) => t.count === 0) ? (
                            <EmptyState text="ยังไม่มีคะแนนรายหัวข้อ" />
                        ) : (
                            <div className="space-y-5">
                                {reportGroups.map(([groupTitle, rows]) => (
                                    <div key={groupTitle}>
                                        <div className="mb-2 text-xs font-bold text-sky-800">{groupTitle}</div>
                                        <div className="space-y-3">
                                            {rows.map((t) => {
                                                const pct = t.avg_score != null ? (t.avg_score / t.max_score) * 100 : 0;
                                                return (
                                                    <div key={t.topic_id}>
                                                        <div className="mb-1 flex justify-between gap-2 text-sm">
                                                            <span className="font-medium text-slate-700">{t.title}</span>
                                                            <span className="shrink-0 text-slate-500">
                                                                {t.avg_score != null ? `${t.avg_score}/${t.max_score}` : '-'}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" style={{ width: `${Math.min(100, pct)}%` }} />
                                                        </div>
                                                        <div className="mt-0.5 text-[11px] text-slate-400">{t.count} รายการ</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    {report.due_soon.length > 0 && (
                        <Panel className="lg:col-span-2" title="ใกล้ครบกำหนด / เกินกำหนด (30 วัน)" description="เจ้าหน้าที่ที่ควรประเมินรอบถัดไป">
                            <div className="grid gap-2 md:grid-cols-2">
                                {report.due_soon.map((row) => (
                                    <div key={`due-${row.user_id}-${row.staff_name}`} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm">
                                        <span className="font-medium text-amber-900">{row.staff_name}</span>
                                        <span className="text-xs text-amber-700">
                                            {row.is_overdue ? 'เกินกำหนด' : 'ครบกำหนด'} {fmtDate(row.next_due_at)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    )}
                </div>
            )}

            <Modal open={topicModal.open} onClose={() => setTopicModal({ open: false })} title={topicModal.edit ? 'แก้ไขหัวข้อ' : topicForm.data.is_group ? 'เพิ่มหมวดหลัก' : 'เพิ่มหัวข้อย่อย'}>
                <form onSubmit={submitTopic} className="space-y-3">
                    <Field label="ประเภท">
                        <select
                            className={imSelect}
                            value={topicForm.data.is_group ? 'group' : 'item'}
                            onChange={(e) => {
                                const isGroup = e.target.value === 'group';
                                topicForm.setData({
                                    ...topicForm.data,
                                    is_group: isGroup,
                                    parent_id: isGroup ? '' : topicForm.data.parent_id,
                                    max_score: isGroup ? 0 : topicForm.data.max_score || 5,
                                    weight: isGroup ? 0 : topicForm.data.weight || 1,
                                });
                            }}
                        >
                            <option value="group">หมวดหลัก (ไม่ให้คะแนน)</option>
                            <option value="item">หัวข้อย่อย (ให้คะแนน)</option>
                        </select>
                    </Field>
                    {!topicForm.data.is_group && (
                        <Field label="อยู่ภายใต้หมวด">
                            <select
                                className={imSelect}
                                value={topicForm.data.parent_id || ''}
                                onChange={(e) => topicForm.setData('parent_id', e.target.value ? Number(e.target.value) : '')}
                            >
                                <option value="">— ไม่ระบุ (หัวข้อเพิ่มเติม) —</option>
                                {topicGroups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.code ? `${g.code} · ` : ''}
                                        {g.title}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}
                    <Field label="ชื่อหัวข้อ" required error={topicForm.errors.title}>
                        <Input className={imInput} value={topicForm.data.title} onChange={(e) => topicForm.setData('title', e.target.value)} />
                    </Field>
                    <Field label="รายละเอียดที่ต้องมีการประเมิน">
                        <textarea className={imInput} rows={3} value={topicForm.data.description} onChange={(e) => topicForm.setData('description', e.target.value)} placeholder="ระบุสิ่งที่ผู้ประเมินต้องดู เช่น พฤติกรรม หลักฐาน เกณฑ์ผ่าน" />
                    </Field>
                    {!topicForm.data.is_group && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="คะแนนเต็ม" required>
                                <Input type="number" min={1} className={imInput} value={topicForm.data.max_score} onChange={(e) => topicForm.setData('max_score', Number(e.target.value))} />
                            </Field>
                            <Field label="น้ำหนัก" required>
                                <Input type="number" step="0.1" min={0} className={imInput} value={topicForm.data.weight} onChange={(e) => topicForm.setData('weight', Number(e.target.value))} />
                            </Field>
                        </div>
                    )}
                    <Field label="สถานะ">
                        <select className={imSelect} value={topicForm.data.is_active ? '1' : '0'} onChange={(e) => topicForm.setData('is_active', e.target.value === '1')}>
                            <option value="1">ใช้งาน</option>
                            <option value="0">ปิดใช้งาน</option>
                        </select>
                    </Field>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setTopicModal({ open: false })}>
                            ยกเลิก
                        </Button>
                        <Button type="submit" disabled={topicForm.processing} className="bg-sky-600 hover:bg-sky-700">
                            บันทึก
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal open={evalModal} onClose={() => setEvalModal(false)} title="ประเมินเจ้าหน้าที่ IT" wide>
                <form onSubmit={submitEval} className="space-y-4">
                    {activeTopics.length === 0 ? (
                        <EmptyState text="กรุณาเพิ่มหัวข้อการประเมินก่อน" />
                    ) : (
                        <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <Field label="เลือกจากผู้ใช้ในระบบ">
                                    <select className={imSelect} value={evalForm.data.user_id || ''} onChange={(e) => pickStaff(e.target.value)}>
                                        <option value="">— พิมพ์ชื่อเอง —</option>
                                        {staff.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="ชื่อเจ้าหน้าที่" required error={evalForm.errors.staff_name}>
                                    <Input className={imInput} value={evalForm.data.staff_name} onChange={(e) => evalForm.setData('staff_name', e.target.value)} />
                                </Field>
                                <Field label="รอบการประเมิน" required>
                                    <select
                                        className={imSelect}
                                        value={evalForm.data.period_months}
                                        onChange={(e) => evalForm.setData('period_months', Number(e.target.value))}
                                    >
                                        {periodOptions.map((p) => (
                                            <option key={p.value} value={p.value}>
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="วันเริ่มรอบ" required>
                                    <Input type="date" className={imInput} value={evalForm.data.period_start} onChange={(e) => evalForm.setData('period_start', e.target.value)} />
                                </Field>
                                <Field label="วันที่ประเมิน">
                                    <Input type="date" className={imInput} value={evalForm.data.evaluated_at} onChange={(e) => evalForm.setData('evaluated_at', e.target.value)} />
                                </Field>
                            </div>

                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="text-sm font-semibold text-slate-800">ให้คะแนนตามหัวข้อย่อย (HA / HAIT)</div>
                                {scoredGroups.map(([groupTitle, rows]) => (
                                    <div key={groupTitle} className="space-y-2">
                                        <div className="sticky top-0 z-10 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">{groupTitle}</div>
                                        {rows.map((t) => {
                                            const row = evalForm.data.scores.find((s) => s.topic_id === t.id);
                                            return (
                                                <div key={t.id} className="grid gap-2 rounded-xl border border-white bg-white p-3 md:grid-cols-[1fr_120px]">
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800">
                                                            {t.code ? <span className="mr-1.5 font-mono text-[11px] text-sky-600">{t.code}</span> : null}
                                                            {t.title}
                                                        </div>
                                                        {t.description && <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{t.description}</div>}
                                                        <Input
                                                            className={imInput + ' mt-2'}
                                                            placeholder="หมายเหตุ (ถ้ามี)"
                                                            value={row?.note || ''}
                                                            onChange={(e) => setScore(t.id, { note: e.target.value })}
                                                        />
                                                    </div>
                                                    <Field label={`คะแนน / ${t.max_score}`}>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={t.max_score}
                                                            step="0.5"
                                                            className={imInput}
                                                            value={row?.score ?? 0}
                                                            onChange={(e) => setScore(t.id, { score: Number(e.target.value) })}
                                                        />
                                                    </Field>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            <Field label="สรุปความเห็นโดยรวม">
                                <textarea className={imInput} rows={3} value={evalForm.data.overall_comment} onChange={(e) => evalForm.setData('overall_comment', e.target.value)} />
                            </Field>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEvalModal(false)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit" disabled={evalForm.processing} className="bg-sky-600 hover:bg-sky-700">
                                    บันทึกผลการประเมิน
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `รายละเอียด · ${detail.staff_name}` : ''} wide>
                {detail && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2 text-sm">
                            <StatusPill label={`รอบ ${detail.period_months} เดือน`} className={periodBadge(detail.period_months)} />
                            <span className="text-slate-500">
                                {fmtDate(detail.period_start)} – {fmtDate(detail.period_end)}
                            </span>
                            <span className="font-bold text-sky-700">{detail.percent_score}%</span>
                            </div>
                            <Button size="sm" variant="outline" className="rounded-xl" asChild>
                                <a href={evaluationPdfHref(detail.id)} target="_blank" rel="noreferrer">
                                    <FileDown className="mr-1 h-3.5 w-3.5" /> PDF
                                </a>
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {detail.scores.map((s) => (
                                <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                    <div>
                                        <div className="font-medium text-slate-800">{s.topic_title}</div>
                                        {s.note && <div className="text-[11px] text-slate-400">{s.note}</div>}
                                    </div>
                                    <div className="font-semibold text-slate-700">
                                        {s.score}/{s.max_score}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {detail.overall_comment && (
                            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                                <div className="mb-1 text-xs font-semibold text-slate-400">ความเห็นโดยรวม</div>
                                {detail.overall_comment}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </ImPage>
    );
}
