import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';

interface RecordRow {
    id: number;
    title: string;
    hours: number;
    start_date: string;
    status: string;
    certificate_path: string | null;
    remarks: string | null;
    user?: { name: string };
}

export default function ExternalApprovals({ records }: { records: { data: RecordRow[] } }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }, { title: 'อนุมัติอบรมภายนอก', href: '/km/learn/external-approvals' }]}>
            <Head title="อนุมัติอบรมภายนอก" />
            <div className="space-y-4 p-6">
                <h1 className="text-2xl font-bold">อนุมัติอบรมภายนอก</h1>
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ผู้ยื่น</TableHead>
                                    <TableHead>หลักสูตร</TableHead>
                                    <TableHead>ชั่วโมง</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>หลักฐาน</TableHead>
                                    <TableHead>คำตัดสิน</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.map((record) => (
                                    <ReviewRow key={record.id} record={record} />
                                ))}
                                {records.data.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">ไม่มีรายการ</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function ReviewRow({ record }: { record: RecordRow }) {
    const [remarks, setRemarks] = useState(record.remarks || '');
    const review = (status: 'approved' | 'rejected') => {
        router.put(route('km.learn.external-records.review', record.id), { status, remarks });
    };

    return (
        <TableRow>
            <TableCell>{record.user?.name}</TableCell>
            <TableCell>{record.title}</TableCell>
            <TableCell>{record.hours}</TableCell>
            <TableCell>{record.status}</TableCell>
            <TableCell>
                {record.certificate_path ? <a className="underline" href={`/storage/${record.certificate_path}`} target="_blank" rel="noreferrer">เปิดไฟล์</a> : '-'}
            </TableCell>
            <TableCell className="space-y-2">
                {record.status === 'pending' ? (
                    <>
                        <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="เหตุผลถ้าตีกลับ" />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => review('approved')}>อนุมัติ</Button>
                            <Button size="sm" variant="outline" onClick={() => review('rejected')}>ตีกลับ</Button>
                        </div>
                    </>
                ) : record.remarks || '-'}
            </TableCell>
        </TableRow>
    );
}
