import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SatisfactionTemplate({ questions }: { questions: { id: number; question_text: string; is_active: boolean }[] }) {
    const active = questions.filter((question) => question.is_active);
    const { data, setData, put, processing } = useForm({
        questions: active.length ? active.map((question) => ({ id: question.id, question_text: question.question_text })) : [{ id: null as number | null, question_text: '' }],
    });

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'แบบประเมินกลาง', href: '/km/learn/satisfaction-template' }]}>
            <Head title="แบบประเมินกลาง" />
            <div className="mx-auto max-w-2xl space-y-4 p-6">
                <h1 className="text-2xl font-bold">แบบประเมินความพึงพอใจกลาง</h1>
                <Card>
                    <CardHeader><CardTitle>คำถามระดับ 1</CardTitle></CardHeader>
                    <CardContent>
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                put(route('km.learn.satisfaction-template.update'));
                            }}
                        >
                            {data.questions.map((question, index) => (
                                <Input
                                    key={index}
                                    value={question.question_text}
                                    onChange={(e) => {
                                        const next = [...data.questions];
                                        next[index] = { ...question, question_text: e.target.value };
                                        setData('questions', next);
                                    }}
                                />
                            ))}
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setData('questions', [...data.questions, { id: null, question_text: '' }])}>เพิ่มคำถาม</Button>
                                <Button disabled={processing} type="submit">บันทึก</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
