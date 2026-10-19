import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Passport({
    fiscalLabel,
    target,
    hours,
    enrollments,
    externalRecords,
    skills,
    clearance,
    idps,
    canEdit,
    users,
}: {
    fiscalLabel: string;
    target: { id: number; name: string; department: string | null; position: string | null };
    hours: number;
    enrollments: { id: number; status: string; completed_at: string | null; course?: { title: string; hours: number } }[];
    externalRecords: { id: number; title: string; hours: number; status: string }[];
    skills: { id: number; level: number; competency?: { name: string } }[];
    clearance: { cleared_at: string } | null;
    idps: { id: number; title: string; status: string }[];
    canEdit: boolean;
    users: { id: number; name: string }[];
}) {
    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'แฟ้มประวัติ', href: '/km/learn/passport' }]}>
            <Head title={`แฟ้มพัฒนาบุคลากร ${target.name}`} />
            <div className="space-y-4 p-6 print:p-0">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{target.name}</h1>
                        <p className="text-muted-foreground">{target.department || 'ไม่ระบุหน่วยงาน'} · {target.position || 'ไม่ระบุตำแหน่ง'}</p>
                        <p>ชั่วโมงพัฒนา {fiscalLabel}: {hours}</p>
                        <p>ปฐมนิเทศ: {clearance ? 'ขึ้นปฏิบัติงานอิสระแล้ว' : 'ยังไม่รับรอง'}</p>
                    </div>
                    <button className="rounded-md border px-3 py-2 text-sm print:hidden" onClick={() => window.print()}>พิมพ์</button>
                </div>
                {canEdit && (
                    <select className="h-10 rounded-md border px-3 text-sm print:hidden" value={target.id} onChange={(e) => router.get(route('km.learn.passport'), { user_id: e.target.value })}>
                        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                )}
                <Card>
                    <CardHeader><CardTitle>หลักสูตรในระบบ</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        {enrollments.map((row) => <p key={row.id}>{row.course?.title} · {row.course?.hours} ชม. · {row.status}</p>)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>อบรมภายนอก</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        {externalRecords.map((row) => <p key={row.id}>{row.title} · {row.hours} ชม. · {row.status}</p>)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>สมรรถนะ</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        {skills.map((skill) => <p key={skill.id}>{skill.competency?.name} · ระดับ {skill.level}</p>)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>แผนพัฒนารายบุคคลปีนี้</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        {idps.map((plan) => <p key={plan.id}>{plan.title} · {plan.status === 'done' ? 'ทำแล้ว' : 'ยังทำ'}</p>)}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
