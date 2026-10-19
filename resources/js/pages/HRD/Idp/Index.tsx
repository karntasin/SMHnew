import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const METHOD: Record<string, string> = { course: 'หลักสูตรในระบบ', external: 'อบรมภายนอก', ojt: 'เรียนรู้หน้างาน' };

export default function IdpIndex({
    fiscalLabel,
    fiscalYear,
    target,
    plans,
    courses,
    competencies,
    canEdit,
    users,
    closed,
    total,
}: {
    fiscalLabel: string;
    fiscalYear: number;
    target: { id: number; name: string };
    plans: { id: number; title: string; method: string; status: string; course?: { title: string }; competency?: { name: string } }[];
    courses: { id: number; title: string }[];
    competencies: { id: number; name: string }[];
    canEdit: boolean;
    users: { id: number; name: string }[];
    closed: number;
    total: number;
}) {
    const form = useForm({
        user_id: target.id,
        fiscal_year: fiscalYear,
        competency_id: '',
        method: 'course',
        course_id: '',
        title: '',
        due_date: '',
    });

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'แผนพัฒนารายบุคคล', href: '/km/learn/idp' }]}>
            <Head title="แผนพัฒนารายบุคคล" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">IDP {fiscalLabel}</h1>
                <p>{target.name} · ปิดแล้ว {closed}/{total}</p>
                {canEdit && (
                    <select className="h-10 rounded-md border px-3 text-sm" value={target.id} onChange={(e) => router.get(route('km.learn.idp'), { user_id: e.target.value })}>
                        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                )}
                <Button variant="outline" onClick={() => router.post(route('km.learn.idp.generate'), { user_id: target.id })}>สร้างจากช่องว่างสมรรถนะ</Button>
                <Card>
                    <CardHeader><CardTitle>เพิ่มวิธีพัฒนา</CardTitle></CardHeader>
                    <CardContent>
                        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); form.post(route('km.learn.idp.store')); }}>
                            <div>
                                <Label>เรื่อง</Label>
                                <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} required />
                            </div>
                            <div>
                                <Label>สมรรถนะ</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.competency_id} onChange={(e) => form.setData('competency_id', e.target.value)}>
                                    <option value="">ไม่ระบุ</option>
                                    {competencies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>วิธี</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.method} onChange={(e) => form.setData('method', e.target.value)}>
                                    <option value="course">หลักสูตรในระบบ</option>
                                    <option value="external">อบรมภายนอก</option>
                                    <option value="ojt">เรียนรู้หน้างาน</option>
                                </select>
                            </div>
                            <div>
                                <Label>หลักสูตร</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.course_id} onChange={(e) => form.setData('course_id', e.target.value)}>
                                    <option value="">ไม่ระบุ</option>
                                    {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                                </select>
                            </div>
                            <Input type="date" value={form.data.due_date} onChange={(e) => form.setData('due_date', e.target.value)} />
                            <Button type="submit">เพิ่มรายการ</Button>
                        </form>
                    </CardContent>
                </Card>
                {plans.map((plan) => (
                    <Card key={plan.id}>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="font-medium">{plan.title}</p>
                                <p className="text-sm text-muted-foreground">{METHOD[plan.method]} · {plan.competency?.name} · {plan.course?.title} · {plan.status === 'done' ? 'ทำแล้ว' : 'ยังทำ'}</p>
                            </div>
                            {plan.status !== 'done' && (
                                <Button size="sm" onClick={() => router.put(route('km.learn.idp.complete', plan.id))}>ทำแล้ว</Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AppLayout>
    );
}
