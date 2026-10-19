import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FormCard {
    id: number;
    code: string | null;
    title: string;
    description: string | null;
    kind: string;
    visibility: string;
    submitted: boolean;
    score: number | null;
    band_label: string | null;
    status_label: string;
}

const visibilityLabel: Record<string, string> = {
    anonymous: 'ไม่ระบุชื่อ',
    named: 'ผูกรายชื่อ',
    aggregate: 'สรุปโดยไม่แสดงชื่อ',
};

export default function AssessmentCatalog({
    fiscalLabel,
    canManageStaff,
    canConfigure,
    forms,
}: {
    fiscalLabel: string;
    canManageStaff: boolean;
    canConfigure: boolean;
    forms: FormCard[];
}) {
    const flash = (usePage().props as { flash?: { success?: string } }).flash;

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'รวมแบบประเมิน', href: '/km/learn/assessments' }]}>
            <Head title="รวมแบบประเมิน" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">รวมแบบประเมิน</h1>
                        <p className="text-muted-foreground">{fiscalLabel} · คะแนน 0–100 · ต่ำกว่า 60 ควรพัฒนา · 60–79 ตามเกณฑ์ · 80 ขึ้นไปอยู่ในเกณฑ์ดี</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild><Link href={route('km.learn.assessments.results')}>ผลของฉัน</Link></Button>
                        {canManageStaff && (
                            <Button variant="outline" asChild><Link href={route('km.learn.assessments.summary')}>สรุปตามสิทธิ์</Link></Button>
                        )}
                        {canConfigure && (
                            <Button asChild><Link href={route('km.learn.assessments.builder')}>สร้างแบบ</Link></Button>
                        )}
                    </div>
                </div>
                {flash?.success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{flash.success}</p>}
                <div className="grid gap-4 md:grid-cols-2">
                    {forms.map((form) => (
                        <Card key={form.id}>
                            <CardHeader>
                                <CardTitle>{form.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">{form.description}</p>
                                <p className="text-sm">{visibilityLabel[form.visibility] || form.visibility} · {form.status_label}</p>
                                {form.kind === 'competency' && form.score !== null && (
                                    <p className="text-sm">ระดับตนเองเฉลี่ย {form.score}</p>
                                )}
                                {form.kind !== 'competency' && form.score !== null && (
                                    <p className="text-sm">คะแนน {form.score} · {form.band_label}</p>
                                )}
                                <Button asChild>
                                    <Link href={form.kind === 'competency' ? route('km.learn.assessments.competency') : route('km.learn.assessments.fill', form.id)}>
                                        {form.submitted ? 'ดูสถานะ' : 'ทำแบบประเมิน'}
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
