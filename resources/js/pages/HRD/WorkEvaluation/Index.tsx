import { Head, router, useForm, usePage } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Topic {
    id: number;
    title: string;
    description: string | null;
    rubric: string[];
    max_score: number;
}
interface Group {
    id: number;
    title: string;
    description: string | null;
    children: Topic[];
}
interface CardRow {
    user_id: number;
    staff_name: string;
    count: number;
    avg_percent: number;
    latest_percent: number;
    latest_at: string | null;
    next_due_at: string | null;
    period_months: number;
    is_overdue: boolean;
    job_satisfaction: number | null;
    competency_avg: number | null;
    competency_gaps: number | null;
}
interface Recent {
    id: number;
    staff_name: string;
    percent_score: number;
    period_months: number;
    period_start: string;
    period_end: string;
    evaluated_at: string | null;
    evaluator_name: string | null;
}

const levels = [
    { score: 1, name: 'ต่ำกว่าเกณฑ์' },
    { score: 2, name: 'ควรพัฒนา' },
    { score: 3, name: 'ตามเกณฑ์' },
    { score: 4, name: 'ดี' },
    { score: 5, name: 'ดีเยี่ยม' },
];

export default function WorkEvaluationIndex({
    fiscalLabel,
    canConfigure,
    groups,
    staff,
    cards,
    dueSoon,
    topicAverages,
    cycles,
    summary,
    recent,
    periodOptions,
}: {
    fiscalLabel: string;
    canConfigure: boolean;
    groups: Group[];
    staff: { id: number; name: string }[];
    cards: CardRow[];
    dueSoon: CardRow[];
    topicAverages: { title: string; parent: string | null; avg_score: number | null; count: number }[];
    cycles: { period_start: string; period_end: string; period_months: number; staff_count: number; avg_percent: number }[];
    summary: { people: number; evaluations: number; avg_percent: number };
    recent: Recent[];
    periodOptions: { value: number; label: string }[];
}) {
    const flash = (usePage().props as { flash?: { success?: string } }).flash;
    const [step, setStep] = useState(0);
    const leaves = groups.flatMap((group) => group.children);
    const current = groups[step];
    const initialScores: Record<number, number | ''> = {};
    leaves.forEach((topic) => { initialScores[topic.id] = ''; });
    const form = useForm({
        user_id: staff[0]?.id ?? '',
        period_months: 6,
        period_start: new Date().toISOString().slice(0, 10),
        evaluated_at: new Date().toISOString().slice(0, 10),
        overall_comment: '',
        scores: initialScores,
    });
    const topicForm = useForm({ parent_id: groups[0]?.id ?? '', title: '', description: '' });
    const answered = leaves.filter((topic) => Number(form.data.scores[topic.id]) >= 1).length;
    const sectionDone = current ? current.children.every((topic) => Number(form.data.scores[topic.id]) >= 1) : false;
    const ready = leaves.every((topic) => Number(form.data.scores[topic.id]) >= 1);
    const preview = leaves.length === 0 ? 0 : Math.round((leaves.reduce((sum, topic) => sum + Number(form.data.scores[topic.id] || 0), 0) / (leaves.length * 5)) * 1000) / 10;
    const progress = leaves.length === 0 ? 0 : Math.round((answered / leaves.length) * 100);

    const choose = (topicId: number, score: number) => {
        form.setData('scores', { ...form.data.scores, [topicId]: score });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.post(route('km.learn.work-evaluations.store'), {
            user_id: form.data.user_id,
            period_months: form.data.period_months,
            period_start: form.data.period_start,
            evaluated_at: form.data.evaluated_at,
            overall_comment: form.data.overall_comment,
            scores: leaves.map((topic) => ({ topic_id: topic.id, score: Number(form.data.scores[topic.id]) })),
        }, {
            onSuccess: () => form.setData('scores', initialScores),
        });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
            { title: 'ประเมินการทำงาน', href: '/km/learn/work-evaluations' },
        ]}>
            <Head title="ประเมินการทำงาน" />
            <div className="space-y-4 p-4 pb-28 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold">ประเมินการทำงาน</h1>
                    <p className="text-sm text-muted-foreground">วงรอบเริ่มต้น 6 เดือน · {fiscalLabel} · หัวหน้าแผนกเห็นเฉพาะคนในแผนก</p>
                </div>
                {flash?.success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{flash.success}</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">คนที่มีผลประเมิน</p><p className="text-2xl font-semibold">{summary.people}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">จำนวนครั้ง</p><p className="text-2xl font-semibold">{summary.evaluations}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">คะแนนเฉลี่ย</p><p className="text-2xl font-semibold">{summary.avg_percent}</p></CardContent></Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>บันทึกการประเมิน</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={submit}>
                            <div className="grid gap-3 md:grid-cols-4">
                                <label className="text-sm">บุคลากร
                                    <select className="mt-1 h-10 w-full rounded-md border px-3" value={form.data.user_id} onChange={(e) => form.setData('user_id', Number(e.target.value))}>
                                        {staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                                    </select>
                                </label>
                                <label className="text-sm">วงรอบ
                                    <select className="mt-1 h-10 w-full rounded-md border px-3" value={form.data.period_months} onChange={(e) => form.setData('period_months', Number(e.target.value))}>
                                        {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                </label>
                                <label className="text-sm">วันเริ่มรอบ
                                    <input className="mt-1 h-10 w-full rounded-md border px-3" type="date" value={form.data.period_start} onChange={(e) => form.setData('period_start', e.target.value)} />
                                </label>
                                <label className="text-sm">วันประเมิน
                                    <input className="mt-1 h-10 w-full rounded-md border px-3" type="date" value={form.data.evaluated_at} onChange={(e) => form.setData('evaluated_at', e.target.value)} />
                                </label>
                            </div>
                            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                1 ต่ำกว่าเกณฑ์ ทำไม่ได้หรือต้องแก้ไขบ่อย · 2 ควรพัฒนา ทำได้บางครั้งและต้องกำกับ · 3 ตามเกณฑ์ ทำได้สม่ำเสมอ · 4 ดี ดีกว่าเกณฑ์และช่วยผู้อื่นได้ · 5 ดีเยี่ยม เป็นแบบอย่างได้โดยไม่ต้องกำกับ
                            </div>
                            <div className="mb-2 mt-4 flex items-center justify-between text-sm">
                                <span>หมวด {Math.min(step + 1, groups.length)} จาก {groups.length}</span>
                                <span>เลือกแล้ว {answered}/{leaves.length}</span>
                            </div>
                            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            {current && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-lg font-semibold">{current.title}</h2>
                                        <p className="text-sm text-muted-foreground">{current.description}</p>
                                    </div>
                                    {current.children.map((topic) => (
                                        <fieldset key={topic.id} className="space-y-2">
                                            <legend className="text-sm font-medium">{topic.title}</legend>
                                            <p className="text-xs text-muted-foreground">สิ่งที่ให้สังเกต: {topic.description}</p>
                                            <div className="grid gap-2">
                                                {levels.map((level) => {
                                                    const selected = Number(form.data.scores[topic.id]) === level.score;
                                                    const behavior = topic.rubric?.[level.score - 1] || level.name;
                                                    return (
                                                        <button
                                                            key={level.score}
                                                            type="button"
                                                            className={`rounded-xl border px-4 py-3 text-left transition ${selected ? 'border-emerald-600 bg-emerald-50' : 'bg-white hover:border-emerald-300'}`}
                                                            onClick={() => choose(topic.id, level.score)}
                                                        >
                                                            <span className={`mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>{level.score}</span>
                                                            <span className="text-sm font-medium">{level.name}</span>
                                                            <span className="mt-1 block pl-10 text-sm text-slate-600">{behavior}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </fieldset>
                                    ))}
                                    {step === groups.length - 1 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">คะแนนรวมที่เลือกไว้ {preview}%</p>
                                            <textarea className="w-full rounded-md border px-3 py-2 text-sm" placeholder="ความเห็นรวม" value={form.data.overall_comment} onChange={(e) => form.setData('overall_comment', e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur">
                                <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                                    <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>ย้อนหมวด</Button>
                                    {step < groups.length - 1 ? (
                                        <Button type="button" disabled={!sectionDone} onClick={() => setStep((value) => value + 1)}>ถัดไป</Button>
                                    ) : (
                                        <Button type="submit" disabled={!ready || staff.length === 0}>บันทึกผลการประเมิน</Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {dueSoon.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>ครบรอบภายใน 30 วัน</CardTitle></CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            {dueSoon.map((row) => (
                                <p key={row.user_id}>{row.staff_name} · ครบ {row.next_due_at}{row.is_overdue ? ' · เลยกำหนด' : ''}</p>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div>
                    <h2 className="mb-2 text-lg font-semibold">การ์ดรายคน</h2>
                    <p className="mb-3 text-sm text-muted-foreground">แสดงคะแนนประเมินการทำงาน ความพึงพอใจในงาน และสมรรถนะที่ยืนยันแล้ว ความพึงพอใจต่อองค์กรและสุขภาวะจิตไม่แสดงชื่อบนการ์ดนี้</p>
                    <div className="grid gap-3 md:grid-cols-2">
                        {cards.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีผลการประเมิน</p>}
                        {cards.map((row) => (
                            <Card key={row.user_id}>
                                <CardHeader><CardTitle>{row.staff_name}</CardTitle></CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    <p>ประเมินการทำงานล่าสุด {row.latest_percent} · เฉลี่ย {row.avg_percent} · {row.count} ครั้ง</p>
                                    <p>ประเมินเมื่อ {row.latest_at} · ครบรอบ {row.next_due_at}{row.is_overdue ? ' · เลยกำหนด' : ''}</p>
                                    <p>ความพึงพอใจในงาน {row.job_satisfaction ?? 'ยังไม่ส่ง'}</p>
                                    <p>สมรรถนะที่ยืนยันเฉลี่ย {row.competency_avg ?? '-'} · ช่องว่าง {row.competency_gaps ?? '-'}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>ค่าเฉลี่ยรายหัวข้อ</CardTitle></CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            {topicAverages.map((row) => (
                                <p key={row.title}>{row.parent ? `${row.parent} · ` : ''}{row.title} · {row.avg_score ?? '-'} ({row.count})</p>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>สรุปรอบ</CardTitle></CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            {cycles.length === 0 && <p className="text-muted-foreground">ยังไม่มีรอบ</p>}
                            {cycles.map((row) => (
                                <p key={`${row.period_start}-${row.period_months}`}>{row.period_start} – {row.period_end} · ทุก {row.period_months} เดือน · {row.staff_count} คน · เฉลี่ย {row.avg_percent}</p>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>รายการล่าสุด</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {recent.map((row) => (
                            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2">
                                <span>{row.staff_name} · {row.percent_score} · {row.period_start} ถึง {row.period_end} · โดย {row.evaluator_name}</span>
                                <Button size="sm" variant="outline" onClick={() => { if (confirm('ลบผลการประเมินนี้?')) router.delete(route('km.learn.work-evaluations.destroy', row.id)); }}>ลบ</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {canConfigure && (
                    <Card>
                        <CardHeader><CardTitle>เพิ่มหัวข้อ</CardTitle></CardHeader>
                        <CardContent>
                            <form className="grid gap-2 md:grid-cols-[12rem_1fr_auto]" onSubmit={(e) => { e.preventDefault(); topicForm.post(route('km.learn.work-evaluations.topics.store'), { onSuccess: () => topicForm.reset('title', 'description') }); }}>
                                <select className="h-10 rounded-md border px-3" value={topicForm.data.parent_id} onChange={(e) => topicForm.setData('parent_id', Number(e.target.value))}>
                                    {groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
                                </select>
                                <input className="h-10 rounded-md border px-3" placeholder="ชื่อหัวข้อ" value={topicForm.data.title} onChange={(e) => topicForm.setData('title', e.target.value)} />
                                <Button type="submit">เพิ่ม</Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
