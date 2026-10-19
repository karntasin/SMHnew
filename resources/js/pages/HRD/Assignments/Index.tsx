import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Option { id: number; name: string }
interface CourseOption { id: number; title: string; is_mandatory: boolean }

export default function Assignments({
    assignments,
    courses,
    users,
    departments,
    positions,
}: {
    assignments: { data: { id: number; due_date: string; status: string; course?: { title: string }; user?: { name: string } }[] };
    courses: CourseOption[];
    users: Option[];
    departments: Option[];
    positions: Option[];
}) {
    const { data, setData, post, processing } = useForm({
        course_id: courses[0]?.id ? String(courses[0].id) : '',
        target: 'department',
        target_id: '',
        due_date: '',
    });
    const options = data.target === 'user' ? users : data.target === 'position' ? positions : departments;

    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'มอบหมายหลักสูตร', href: '/km/learn/assignments' }]}>
            <Head title="มอบหมายหลักสูตร" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">มอบหมายหลักสูตรบังคับ</h1>
                <Card>
                    <CardHeader><CardTitle>มอบหมายใหม่</CardTitle></CardHeader>
                    <CardContent>
                        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); post(route('km.learn.assignments.store')); }}>
                            <div>
                                <Label>หลักสูตร</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={data.course_id} onChange={(e) => setData('course_id', e.target.value)}>
                                    {courses.map((course) => <option key={course.id} value={course.id}>{course.title}{course.is_mandatory ? ' (บังคับ)' : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>มอบให้</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={data.target} onChange={(e) => setData('target', e.target.value)}>
                                    <option value="user">รายคน</option>
                                    <option value="department">รายกลุ่มงาน</option>
                                    <option value="position">รายตำแหน่ง</option>
                                </select>
                            </div>
                            <div>
                                <Label>กลุ่มเป้าหมาย</Label>
                                <select className="h-10 w-full rounded-md border px-3 text-sm" value={data.target_id} onChange={(e) => setData('target_id', e.target.value)}>
                                    <option value="">เลือก</option>
                                    {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>กำหนดเสร็จ</Label>
                                <Input type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} required />
                            </div>
                            <Button disabled={processing} type="submit">มอบหมาย</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>บุคลากร</TableHead>
                                    <TableHead>หลักสูตร</TableHead>
                                    <TableHead>กำหนด</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignments.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.user?.name}</TableCell>
                                        <TableCell>{row.course?.title}</TableCell>
                                        <TableCell>{row.due_date}</TableCell>
                                        <TableCell>{row.status}</TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="outline" onClick={() => router.delete(route('km.learn.assignments.destroy', row.id))}>ยกเลิก</Button>
                                        </TableCell>
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
