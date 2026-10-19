import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DepartmentRow {
    department: string;
    count: number;
    average: number;
    bands: { develop: number; meet: number; good: number };
}
interface PersonRow {
    name: string;
    department: string;
    score: number;
    band_label: string;
}
interface FormBlock {
    title: string;
    visibility: string;
    count: number;
    average: number | null;
    bands: { develop: number; meet: number; good: number };
    departments: DepartmentRow[];
    people: PersonRow[];
}
interface CompetencyGap {
    name: string;
    competency: string;
    expected_level: number | null;
    supervisor_level: number;
    gap: number;
}

const visibilityNote: Record<string, string> = {
    anonymous: 'ไม่แสดงชื่อ',
    named: 'เปิดผลรายคนได้',
    aggregate: 'แสดงเฉพาะค่าเฉลี่ยและช่วงคะแนน',
};

export default function AssessmentSummary({
    fiscalLabel,
    forms,
    competency,
}: {
    fiscalLabel: string;
    forms: FormBlock[];
    competency: CompetencyGap[];
}) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
            { title: 'รวมแบบประเมิน', href: '/km/learn/assessments' },
            { title: 'สรุปองค์กร', href: '/km/learn/assessments/summary' },
        ]}>
            <Head title="สรุปผลการประเมิน" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">สรุปผลการประเมิน {fiscalLabel}</h1>
                {forms.map((form) => (
                    <Card key={form.title}>
                        <CardHeader>
                            <CardTitle>{form.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {visibilityNote[form.visibility]} · ผู้ตอบ {form.count} · ค่าเฉลี่ย {form.average ?? '-'} · ควรพัฒนา {form.bands.develop} · ตามเกณฑ์ {form.bands.meet} · อยู่ในเกณฑ์ดี {form.bands.good}
                            </p>
                            {form.departments.map((row) => (
                                <div key={row.department} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
                                    <span>{row.department}</span>
                                    <span>{row.count} คน · เฉลี่ย {row.average} · ควรพัฒนา {row.bands.develop} · ตามเกณฑ์ {row.bands.meet} · ดี {row.bands.good}</span>
                                </div>
                            ))}
                            {form.people.length > 0 && (
                                <div className="space-y-1 pt-2">
                                    <p className="text-sm font-medium">ผลรายคน</p>
                                    {form.people.map((person) => (
                                        <div key={`${person.name}-${person.department}`} className="flex justify-between text-sm">
                                            <span>{person.name} · {person.department}</span>
                                            <span>{person.score} · {person.band_label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                <Card>
                    <CardHeader><CardTitle>ช่องว่างสมรรถนะที่หัวหน้ายืนยันแล้ว</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {competency.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีช่องว่างที่ต่ำกว่าระดับคาดหวัง</p>}
                        {competency.map((row, index) => (
                            <div key={`${row.name}-${row.competency}-${index}`} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
                                <span>{row.name} · {row.competency}</span>
                                <span>คาดหวัง {row.expected_level} · ยืนยัน {row.supervisor_level} · ช่องว่าง {row.gap}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
