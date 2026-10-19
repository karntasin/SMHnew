import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Reports({
    fiscalLabel,
    summary,
}: {
    fiscalLabel: string;
    summary: Record<string, number | null>;
}) {
    const cards = [
        ['ชั่วโมงเฉลี่ยต่อคน', summary.avg_hours],
        ['ชั่วโมงรวม', summary.total_hours],
        ['อัตราผ่านหลักสูตรบังคับ (%)', summary.mandatory_rate ?? '-'],
        ['ความพึงพอใจเฉลี่ย', summary.satisfaction ?? '-'],
        ['ก่อนเรียนเฉลี่ย', summary.pre_avg ?? '-'],
        ['หลังเรียนเฉลี่ย', summary.post_avg ?? '-'],
        ['ติดตามการนำไปใช้', `${summary.behavior_done}/${summary.behavior_total}`],
        ['อัตราประเมินสมรรถนะ (%)', summary.assessment_rate],
        ['IDP ที่ปิดแล้ว', `${summary.idp_done}/${summary.idp_total}`],
    ];

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'รายงาน HA', href: '/km/learn/reports' }]}>
            <Head title="รายงาน HRD สำหรับ HA" />
            <div className="space-y-4 p-6 print:p-0">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">รายงานพัฒนาบุคลากร {fiscalLabel}</h1>
                    <button className="rounded-md border px-3 py-2 text-sm print:hidden" onClick={() => window.print()}>พิมพ์</button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {cards.map(([label, value]) => (
                        <Card key={String(label)}>
                            <CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
                            <CardContent className="text-3xl font-bold">{value}</CardContent>
                        </Card>
                    ))}
                </div>
                <p className="text-sm text-muted-foreground">ตัวเลขคำนวณจากหลักสูตรที่จบ อบรมภายนอกที่อนุมัติแล้ว และการประเมินในปีงบประมาณนี้ จำนวนบุคลากรที่ใช้เป็นฐานคือ {summary.staff} คน</p>
            </div>
        </AppLayout>
    );
}
