import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CourseEvaluation({
    course,
    summary,
}: {
    course: { id: number; title: string };
    summary: {
        enrolled: number;
        completed: number;
        avg_pre: number | null;
        avg_post: number | null;
        avg_satisfaction: number | null;
        satisfaction_count: number;
    };
}) {
    const items = [
        ['ผู้ลงทะเบียน', summary.enrolled],
        ['เรียนจบ', summary.completed],
        ['คะแนนก่อนเรียนเฉลี่ย', summary.avg_pre ?? '-'],
        ['คะแนนหลังเรียนเฉลี่ย', summary.avg_post ?? '-'],
        ['ความพึงพอใจเฉลี่ย', summary.avg_satisfaction ?? '-'],
        ['จำนวนผู้ประเมิน', summary.satisfaction_count],
    ];

    return (
        <AppLayout breadcrumbs={[
            { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
            { title: 'หลักสูตร', href: '/km/learn/courses' },
            { title: course.title, href: `/km/learn/courses/${course.id}` },
            { title: 'สรุปผลหลักสูตร', href: '#' },
        ]}>
            <Head title={`สรุปผล ${course.title}`} />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <div className="grid gap-4 md:grid-cols-3">
                    {items.map(([label, value]) => (
                        <Card key={String(label)}>
                            <CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
                            <CardContent className="text-3xl font-bold">{value}</CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
