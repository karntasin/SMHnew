import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResponseRow {
    title: string;
    total_score: number;
    band_label: string;
    interpretation: string | null;
    sections: { title: string; score: number; weight: number }[];
}
interface Gap {
    name: string;
    expected_level: number | null;
    self_level: number | null;
    supervisor_level: number | null;
    gap: number | null;
}

export default function AssessmentResults({
    fiscalLabel,
    target,
    isSelf,
    canEdit,
    users,
    responses,
    competency,
}: {
    fiscalLabel: string;
    target: { id: number; name: string };
    isSelf: boolean;
    canEdit: boolean;
    users: { id: number; name: string }[];
    responses: ResponseRow[];
    competency: Gap[];
}) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
            { title: 'รวมแบบประเมิน', href: '/km/learn/assessments' },
            { title: 'ผลของฉัน', href: '/km/learn/assessments/results' },
        ]}>
            <Head title="ผลการประเมิน" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">ผลการประเมิน {fiscalLabel}</h1>
                <p>{target.name}{!isSelf ? ' · แสดงเฉพาะแบบที่ผูกรายชื่อ' : ''}</p>
                {canEdit && (
                    <select className="h-10 rounded-md border px-3 text-sm" value={target.id} onChange={(e) => router.get(route('km.learn.assessments.results'), { user_id: e.target.value })}>
                        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                )}
                {responses.length === 0 && <p className="text-muted-foreground">ยังไม่มีผลแบบสำรวจที่เปิดดูได้</p>}
                {responses.map((row) => (
                    <Card key={row.title}>
                        <CardHeader><CardTitle>{row.title} · {row.total_score} · {row.band_label}</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {row.interpretation && <p className="text-sm">{row.interpretation}</p>}
                            {row.sections?.map((section) => (
                                <div key={section.title} className="text-sm">
                                    <div className="flex justify-between"><span>{section.title}</span><span>{section.score}</span></div>
                                    <div className="h-2 rounded bg-slate-100">
                                        <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(100, section.score)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
                <Card>
                    <CardHeader><CardTitle>ช่องว่างสมรรถนะ</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {competency.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีรายการสมรรถนะ</p>}
                        {competency.map((row) => (
                            <div key={row.name} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
                                <span>{row.name}</span>
                                <span>
                                    คาดหวัง {row.expected_level ?? '-'} · ตนเอง {row.self_level ?? '-'} · หัวหน้า {row.supervisor_level ?? '-'}
                                    {row.gap !== null && row.gap > 0 ? ` · ช่องว่าง ${row.gap}` : ''}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
