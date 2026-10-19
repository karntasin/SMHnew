import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Question {
    id: number;
    question_text: string;
}

export default function SatisfactionForm({
    course,
    questions,
    existing,
}: {
    course: { id: number; title: string };
    questions: Question[];
    existing: { score: number } | null;
}) {
    const { data, setData, post, processing } = useForm({
        answers: Object.fromEntries(questions.map((question) => [question.id, 5])) as Record<number, number>,
    });

    return (
        <AppLayout breadcrumbs={[
            { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
            { title: 'การอบรมของฉัน', href: '/km/learn/my-training' },
            { title: 'แบบประเมินความพึงพอใจ', href: '#' },
        ]}>
            <Head title="แบบประเมินความพึงพอใจ" />
            <div className="mx-auto max-w-2xl space-y-4 p-6">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-muted-foreground">ให้คะแนน 1 ถึง 5 หลังเรียนจบ แบบนี้ใช้ร่วมกันทุกหลักสูตร</p>
                {existing && <p className="text-sm text-emerald-700">เคยส่งแล้ว คะแนนเฉลี่ย {existing.score} ส่งอีกครั้งจะทับของเดิม</p>}
                <Card>
                    <CardHeader><CardTitle>ความพึงพอใจ</CardTitle></CardHeader>
                    <CardContent>
                        <form
                            className="space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                post(route('km.learn.courses.satisfaction.store', course.id));
                            }}
                        >
                            {questions.map((question) => (
                                <div key={question.id} className="space-y-1">
                                    <Label>{question.question_text}</Label>
                                    <select
                                        className="h-10 w-full rounded-md border px-3 text-sm"
                                        value={data.answers[question.id]}
                                        onChange={(e) => setData('answers', { ...data.answers, [question.id]: Number(e.target.value) })}
                                    >
                                        {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
                                    </select>
                                </div>
                            ))}
                            <Button disabled={processing} type="submit">ส่งแบบประเมิน</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
