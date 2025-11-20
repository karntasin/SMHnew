import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface IndexProps {
    requests: {
        data: any[];
        links: any[];
    };
}

export default function Index({ requests }: IndexProps) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },
            { title: 'รายการทั้งหมด', href: '#' }
        ]}>
            <Head title="รายการแจ้งซ่อม" />

            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">รายการแจ้งซ่อม</h1>
                    <Link href={route('maintenance.requests.create')}>
                        <Button>แจ้งซ่อมใหม่</Button>
                    </Link>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เลขที่ใบงาน</TableHead>
                                    <TableHead>หัวข้อ</TableHead>
                                    <TableHead>หมวดหมู่</TableHead>
                                    <TableHead>ความสำคัญ</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>วันที่แจ้ง</TableHead>
                                    <TableHead>จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            ไม่พบรายการแจ้งซ่อม
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    requests.data.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.ticket_number}</TableCell>
                                            <TableCell>{req.title}</TableCell>
                                            <TableCell>{req.category?.name || '-'}</TableCell>
                                            <TableCell>
                                                {req.priority && (
                                                    <Badge variant="outline" style={{ borderColor: req.priority.color, color: req.priority.color }}>
                                                        {req.priority.name}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    req.status === 'completed' ? 'default' : 
                                                    req.status === 'pending' ? 'secondary' : 'outline'
                                                }>
                                                    {req.status === 'pending' ? 'รอดำเนินการ' : 
                                                     req.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                                                     req.status === 'completed' ? 'เสร็จสิ้น' : req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(req.created_at).toLocaleDateString('th-TH')}</TableCell>
                                            <TableCell>
                                                <Link href={route('maintenance.requests.show', req.id)}>
                                                    <Button variant="ghost" size="sm">ดูรายละเอียด</Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
