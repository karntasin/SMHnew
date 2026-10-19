import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Row {
    competency_id: number;
    name: string;
    expected_level: number | null;
    indicators: { level: number; behavior: string }[];
}
interface Saved {
    self_level: number | null;
    supervisor_level: number | null;
}

const crumbs = [
    { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
    { title: 'รวมแบบประเมิน', href: '/km/learn/assessments' },
    { title: 'สมรรถนะการปฏิบัติงาน', href: '/km/learn/assessments/competency' },
];

function behaviorFor(row: Row, level: number) {
    return row.indicators?.find((indicator) => indicator.level === level)?.behavior ?? `ระดับ ${level}`;
}

export default function CompetencyAssessment({
    fiscalLabel,
    fiscalYear,
    target,
    isSelf,
    rows,
    saved,
    canEdit,
    users,
    suggestions,
}: {
    fiscalLabel: string;
    fiscalYear: number;
    target: { id: number; name: string };
    isSelf: boolean;
    rows: Row[];
    saved: Record<string, Saved>;
    canEdit: boolean;
    users: { id: number; name: string }[];
    suggestions: { id: number; proposed_level: number; user?: { name: string }; competency?: { name: string }; course?: { title: string } }[];
}) {
    const [step, setStep] = useState(0);
    const initialSelf: Record<string, number | ''> = {};
    const initialSupervisor: Record<string, number | ''> = {};
    rows.forEach((row) => {
        const current = saved[row.competency_id] || saved[String(row.competency_id)];
        initialSelf[row.competency_id] = current?.self_level || '';
        initialSupervisor[row.competency_id] = current?.supervisor_level || '';
    });
    const form = useForm({
        user_id: target.id,
        fiscal_year: fiscalYear,
        self: initialSelf,
        supervisor: initialSupervisor,
    });
    const row = rows[step];
    const answered = rows.filter((item) => {
        const selfLevel = Number(form.data.self[item.competency_id] || 0);
        const supervisorLevel = Number(form.data.supervisor[item.competency_id] || 0);
        if (isSelf) return selfLevel >= 1;
        return supervisorLevel >= 1;
    }).length;
    const currentReady = row ? (isSelf
        ? Number(form.data.self[row.competency_id] || 0) >= 1
        : Number(form.data.supervisor[row.competency_id] || 0) >= 1) : false;
    const progress = rows.length === 0 ? 0 : Math.round((answered / rows.length) * 100);
    const confirmed = row ? Number(form.data.supervisor[row.competency_id] || 0) : 0;
    const gap = row?.expected_level && confirmed ? row.expected_level - confirmed : null;

    const setLevel = (field: 'self' | 'supervisor', level: number) => {
        if (!row) return;
        form.setData(field, { ...form.data[field], [row.competency_id]: level });
    };

    return (
        <AppLayout breadcrumbs={crumbs}>
            <Head title="สมรรถนะการปฏิบัติงาน" />
            <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">สมรรถนะการปฏิบัติงาน</h1>
                        <p className="text-sm text-muted-foreground">{fiscalLabel} · {target.name}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={route('km.learn.assessments.results', { user_id: target.id })}>ดูช่องว่างสมรรถนะ</Link>
                    </Button>
                </div>
                {canEdit && (
                    <select
                        className="h-10 rounded-md border px-3 text-sm"
                        value={target.id}
                        onChange={(e) => {
                            setStep(0);
                            router.get(route('km.learn.assessments.competency'), { user_id: e.target.value });
                        }}
                    >
                        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                )}
                {canEdit && suggestions.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>รอหัวหน้ายืนยันเลื่อนระดับจากหลักสูตร</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {suggestions.map((suggestion) => (
                                <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span>{suggestion.user?.name} · {suggestion.competency?.name} → ระดับ {suggestion.proposed_level} ({suggestion.course?.title})</span>
                                    <span className="space-x-2">
                                        <Button size="sm" onClick={() => router.put(route('km.learn.competency-suggestions.review', suggestion.id), { decision: 'accepted' })}>ยืนยัน</Button>
                                        <Button size="sm" variant="outline" onClick={() => router.put(route('km.learn.competency-suggestions.review', suggestion.id), { decision: 'rejected' })}>ไม่ยืนยัน</Button>
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                {rows.length === 0 ? (
                    <p className="text-muted-foreground">ยังไม่มีสมรรถนะให้ประเมิน</p>
                ) : row && (
                    <form onSubmit={(e) => { e.preventDefault(); form.post(route('km.learn.assessments.store')); }}>
                        <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span>รายการ {step + 1} จาก {rows.length}</span>
                                <span>เลือกแล้ว {answered}/{rows.length}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                        <Card>
                            <CardContent className="space-y-5 p-4 md:p-6">
                                <div>
                                    <h2 className="text-lg font-semibold">{row.name}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        ระดับที่ตำแหน่งคาดหวัง: {row.expected_level ?? 'ยังไม่กำหนด'}
                                        {gap !== null && gap > 0 ? ` · ช่องว่าง ${gap} ระดับ` : ''}
                                    </p>
                                </div>
                                {isSelf && (
                                    <LevelCards
                                        title="ประเมินตนเอง"
                                        selected={Number(form.data.self[row.competency_id] || 0)}
                                        row={row}
                                        onSelect={(level) => setLevel('self', level)}
                                    />
                                )}
                                {canEdit && (
                                    <LevelCards
                                        title="หัวหน้ายืนยัน"
                                        selected={Number(form.data.supervisor[row.competency_id] || 0)}
                                        row={row}
                                        onSelect={(level) => setLevel('supervisor', level)}
                                    />
                                )}
                            </CardContent>
                        </Card>
                        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur">
                            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                                <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>ย้อนรายการ</Button>
                                {step < rows.length - 1 ? (
                                    <Button type="button" disabled={!currentReady} onClick={() => setStep((value) => value + 1)}>ถัดไป</Button>
                                ) : (
                                    <Button type="submit" disabled={!currentReady || form.processing}>บันทึกแบบประเมิน</Button>
                                )}
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </AppLayout>
    );
}

function LevelCards({
    title,
    selected,
    row,
    onSelect,
}: {
    title: string;
    selected: number;
    row: Row;
    onSelect: (level: number) => void;
}) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            <div className="grid gap-2">
                {[1, 2, 3, 4, 5].map((level) => {
                    const active = selected === level;
                    return (
                        <button
                            key={level}
                            type="button"
                            className={`rounded-xl border px-4 py-3 text-left transition ${active ? 'border-emerald-600 bg-emerald-50' : 'bg-white hover:border-emerald-300'}`}
                            onClick={() => onSelect(level)}
                        >
                            <span className={`mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${active ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>{level}</span>
                            <span className="text-sm">{behaviorFor(row, level)}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
