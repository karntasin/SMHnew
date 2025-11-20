import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Document {
    id: number;
    document_number: string;
    subject: string;
    status: string;
    created_at: string;
    urgency: string;
    created_by: { name: string };
}

interface IndexProps {
    documents: {
        data: Document[];
        links: any[];
    };
}

export default function Index({ documents }: IndexProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <Badge variant="outline">ร่าง</Badge>;
            case 'pending_approval': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">รออนุมัติ</Badge>;
            case 'approved': return <Badge variant="default" className="bg-green-100 text-green-800">อนุมัติแล้ว</Badge>;
            case 'sent': return <Badge variant="default" className="bg-blue-100 text-blue-800">ส่งออกแล้ว</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบรับส่งหนังสือ', href: '/documents' }]}>
            <Head title="ระบบรับส่งหนังสือ" />
            
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">รายการหนังสือ</h1>
                    <Link href={route('documents.create')}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            สร้างหนังสือใหม่
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>รายการหนังสือทั้งหมด</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เลขที่หนังสือ</TableHead>
                                    <TableHead>เรื่อง</TableHead>
                                    <TableHead>ความเร่งด่วน</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>ผู้สร้าง</TableHead>
                                    <TableHead>วันที่</TableHead>
                                    <TableHead>จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            ไม่พบข้อมูลหนังสือ
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    documents.data.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium">{doc.document_number}</TableCell>
                                            <TableCell>
                                                <div className="max-w-[300px] truncate" title={doc.subject}>
                                                    {doc.subject}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {doc.urgency === 'urgent' ? <span className="text-red-600 font-bold">ด่วน</span> :
                                                 doc.urgency === 'very_urgent' ? <span className="text-red-800 font-bold">ด่วนที่สุด</span> : 'ปกติ'}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(doc.status)}</TableCell>
                                            <TableCell>{doc.created_by?.name}</TableCell>
                                            <TableCell>{new Date(doc.created_at).toLocaleDateString('th-TH')}</TableCell>
                                            <TableCell>
                                                <Link href={route('documents.show', doc.id)}>
                                                    <Button variant="ghost" size="sm">รายละเอียด</Button>
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
