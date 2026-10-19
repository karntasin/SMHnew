import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS: Record<string, string> = {
    assigned: 'มอบหมายแล้ว',
    in_progress: 'กำลังเรียน',
    completed: 'ครบ',
    overdue: 'เลยกำหนด',
    expired: 'ใบรับรองหมดอายุ',
};

export default function Compliance({
    items,
    byDepartment,
    expiring,
}: {
    items: { id: number; user: string; course: string; mandatory: boolean; due_date: string | null; expires_at: string | null; status: string }[];
    byDepartment: { name: string; total: number; completed: number; rate: number }[];
    expiring: { user: string; course: string; expires_at: string }[];
}) {
    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'ความครบถ้วน', href: '/km/learn/compliance' }]}>
            <Head title="ความครบถ้วนของการอบรม" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">ความครบถ้วนรายหน่วยงาน</h1>
                <div className="grid gap-3 md:grid-cols-3">
                    {byDepartment.map((row) => (
                        <Card key={row.name}>
                            <CardHeader><CardTitle className="text-base">{row.name}</CardTitle></CardHeader>
                            <CardContent>{row.completed}/{row.total} คน-หลักสูตร · {row.rate}%</CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader><CardTitle>ใกล้หมดอายุภายใน 60 วัน</CardTitle></CardHeader>
                    <CardContent>
                        {expiring.length === 0 ? 'ไม่มีรายการ' : expiring.map((row, index) => (
                            <p key={index}>{row.user} · {row.course} · {row.expires_at}</p>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>บุคลากร</TableHead>
                                    <TableHead>หลักสูตร</TableHead>
                                    <TableHead>บังคับ</TableHead>
                                    <TableHead>กำหนด</TableHead>
                                    <TableHead>หมดอายุ</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.user}</TableCell>
                                        <TableCell>{item.course}</TableCell>
                                        <TableCell>{item.mandatory ? 'ใช่' : '-'}</TableCell>
                                        <TableCell>{item.due_date || '-'}</TableCell>
                                        <TableCell>{item.expires_at || '-'}</TableCell>
                                        <TableCell>{STATUS[item.status] || item.status}</TableCell>
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
