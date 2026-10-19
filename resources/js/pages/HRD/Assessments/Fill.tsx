import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Item {
    id: number;
    prompt: string;
}
interface Section {
    id: number;
    title: string;
    items: Item[];
}

const scale = [
    [1, 'ไม่เลย'],
    [2, 'น้อย'],
    [3, 'ปานกลาง'],
    [4, 'เห็นด้วย'],
    [5, 'มาก'],
] as const;

export default function AssessmentFill({
    fiscalLabel,
    form,
    submitted,
    showScore,
}: {
    fiscalLabel: string;
    form: { id: number; title: string; description: string | null; visibility: string; disclaimer: string | null; sections: Section[] };
    submitted: boolean;
    showScore: boolean;
}) {
    const [step, setStep] = useState(0);
    const page = useForm<{ answers: Record<number, number> }>({ answers: {} });
    const sections = form.sections;
    const current = sections[step];
    const totalItems = useMemo(() => sections.reduce((sum, section) => sum + section.items.length, 0), [sections]);
    const answered = Object.values(page.data.answers).filter((value) => value >= 1 && value <= 5).length;
    const sectionDone = current ? current.items.every((item) => page.data.answers[item.id] >= 1) : false;
    const progress = totalItems === 0 ? 0 : Math.round((answered / totalItems) * 100);

    const choose = (itemId: number, value: number) => {
        page.setData('answers', { ...page.data.answers, [itemId]: value });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'พัฒนาบุคลากร', href: '/km/learn/hub' },
            { title: 'รวมแบบประเมิน', href: '/km/learn/assessments' },
            { title: form.title, href: '#' },
        ]}>
            <Head title={form.title} />
            <div className="mx-auto max-w-3xl space-y-4 p-4 pb-28 md:p-6 md:pb-28">
                <div>
                    <p className="text-sm text-muted-foreground">{fiscalLabel}</p>
                    <h1 className="text-2xl font-bold">{form.title}</h1>
                    {form.description && <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>}
                </div>
                {form.disclaimer && (
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{form.disclaimer}</p>
                )}
                <p className="text-sm text-muted-foreground">1 ไม่เห็นด้วยอย่างยิ่ง · 2 ไม่เห็นด้วย · 3 ปานกลาง · 4 เห็นด้วย · 5 เห็นด้วยอย่างยิ่ง</p>
                {submitted ? (
                    <Card>
                        <CardContent className="space-y-3 p-6">
                            <h2 className="text-lg font-semibold">ส่งแบบนี้แล้ว</h2>
                            <p>{showScore ? 'เปิดผลของฉันเพื่อดูคะแนนรายหมวด' : 'แบบนี้ไม่แสดงคะแนนรายคน ผลจะไปอยู่ในการสรุปของกลุ่มงาน'}</p>
                            {showScore && <Button asChild><Link href={route('km.learn.assessments.results')}>ผลของฉัน</Link></Button>}
                        </CardContent>
                    </Card>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); page.post(route('km.learn.assessments.submit', form.id)); }}>
                        <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span>หมวด {step + 1} จาก {sections.length}</span>
                                <span>ตอบแล้ว {answered}/{totalItems}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="mt-3 flex gap-1">
                                {sections.map((section, index) => (
                                    <button
                                        key={section.id}
                                        type="button"
                                        className={`h-1.5 flex-1 rounded-full ${index === step ? 'bg-emerald-600' : index < step ? 'bg-emerald-300' : 'bg-slate-200'}`}
                                        onClick={() => { if (index < step) setStep(index); }}
                                        aria-label={section.title}
                                    />
                                ))}
                            </div>
                        </div>
                        {current && (
                            <Card>
                                <CardContent className="space-y-5 p-4 md:p-6">
                                    <h2 className="text-lg font-semibold">{current.title}</h2>
                                    {current.items.map((item, index) => (
                                        <fieldset key={item.id} className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
                                            <legend className="text-sm font-medium leading-6">{index + 1}. {item.prompt}</legend>
                                            <div className="grid grid-cols-5 gap-2">
                                                {scale.map(([value, label]) => {
                                                    const selected = page.data.answers[item.id] === value;
                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-1 text-center transition ${selected ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'bg-white hover:border-emerald-300'}`}
                                                            onClick={() => choose(item.id, value)}
                                                        >
                                                            <span className="text-lg font-semibold leading-none">{value}</span>
                                                            <span className={`mt-1 text-[11px] leading-tight ${selected ? 'text-white' : 'text-muted-foreground'}`}>{label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </fieldset>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                        {(page.errors.answers || page.errors.form) && (
                            <p className="mt-3 text-sm text-red-600">{page.errors.answers || page.errors.form}</p>
                        )}
                        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur">
                            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                                <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>ย้อนหมวด</Button>
                                {step < sections.length - 1 ? (
                                    <Button type="button" disabled={!sectionDone} onClick={() => setStep((value) => value + 1)}>ถัดไป</Button>
                                ) : (
                                    <Button type="submit" disabled={!sectionDone || page.processing}>ส่งแบบประเมิน</Button>
                                )}
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </AppLayout>
    );
}
