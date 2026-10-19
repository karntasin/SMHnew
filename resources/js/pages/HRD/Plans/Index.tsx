import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Plans({
    fiscalLabel,
    fiscalYear,
    plans,
    courses,
}: {
    fiscalLabel: string;
    fiscalYear: number;
    plans: { id: number; title: string; target_group: string | null; quarter: number | null; target_hours: number | null; target_pass_rate: number | null; budget: number; actual_hours: number; actual_pass_rate: number | null; course?: { title: string } }[];
    courses: { id: number; title: string }[];
}) {
    const form = useForm({
        fiscal_year: fiscalYear,
        title: '',
        target_group: '',
        quarter: '',
        target_hours: '',
        target_pass_rate: '',
        budget: '',
        course_id: '',
    });

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'แผนประจำปี', href: '/km/learn/plans' }]}>
            <Head title="แผนพัฒนาบุคลากรประจำปี" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">แผนพัฒนาบุคลากร {fiscalLabel}</h1>
                <Card>
                    <CardHeader><CardTitle>เพิ่มรายการแผน</CardTitle></CardHeader>
                    <CardContent>
                        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); form.post(route('km.learn.plans.store')); }}>
                            <div><Label>เรื่อง</Label><Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} required /></div>
                            <div><Label>กลุ่มเป้าหมาย</Label><Input value={form.data.target_group} onChange={(e) => form.setData('target_group', e.target.value)} /></div>
                            <div>
                                <Label>ไตรมาส</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.quarter} onChange={(e) => form.setData('quarter', e.target.value)}>
                                    <option value="">ทั้งปี</option>
                                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
                                </select>
                            </div>
                            <div><Label>เป้าหมายชั่วโมง</Label><Input type="number" value={form.data.target_hours} onChange={(e) => form.setData('target_hours', e.target.value)} /></div>
                            <div><Label>เป้าหมายอัตราผ่าน (%)</Label><Input type="number" value={form.data.target_pass_rate} onChange={(e) => form.setData('target_pass_rate', e.target.value)} /></div>
                            <div><Label>งบประมาณ</Label><Input type="number" value={form.data.budget} onChange={(e) => form.setData('budget', e.target.value)} /></div>
                            <div>
                                <Label>หลักสูตรที่เทียบผล</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.data.course_id} onChange={(e) => form.setData('course_id', e.target.value)}>
                                    <option value="">ทั้งองค์กร</option>
                                    {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                                </select>
                            </div>
                            <Button type="submit">เพิ่มในแผน</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เรื่อง</TableHead>
                                    <TableHead>เป้าหมายชม.</TableHead>
                                    <TableHead>ผลชม.</TableHead>
                                    <TableHead>เป้าผ่าน</TableHead>
                                    <TableHead>ผลผ่าน</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell>{plan.title}<div className="text-xs text-muted-foreground">{plan.target_group} {plan.course?.title}</div></TableCell>
                                        <TableCell>{plan.target_hours ?? '-'}</TableCell>
                                        <TableCell>{plan.actual_hours}</TableCell>
                                        <TableCell>{plan.target_pass_rate ?? '-'}</TableCell>
                                        <TableCell>{plan.actual_pass_rate ?? '-'}</TableCell>
                                        <TableCell><Button size="sm" variant="outline" onClick={() => router.delete(route('km.learn.plans.destroy', plan.id))}>ลบ</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
