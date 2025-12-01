import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, File } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
    stats: {
        total: number;
        pending: number;
        completed: number;
    };
    deptStats: {
        name: string;
        received_count: number;
    }[];
    recent: any[];
}

export default function Dashboard({ stats, deptStats, recent }: DashboardProps) {
    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบรับส่งหนังสือ', href: '/documents' }, { title: 'แดชบอร์ด', href: '#' }]}>
            <Head title="แดชบอร์ดเอกสาร" />
            
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold">ภาพรวมระบบรับส่งหนังสือ</h1>

                <div className="grid gap-4 md:grid-cols-3">
                    <Link href={route('documents.index')}>
                        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">หนังสือทั้งหมด</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('documents.index', { status: 'pending' })}>
                        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
                                <Clock className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.pending}</div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href={route('documents.index', { status: 'completed' })}>
                        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">เสร็จสิ้น</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.completed}</div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>สถิติการรับหนังสือแยกตามแผนก</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptStats}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="received_count" fill="#8884d8" name="จำนวนหนังสือที่รับ" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>หนังสือล่าสุด</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recent.length === 0 ? (
                                    <p className="text-muted-foreground">ไม่มีรายการล่าสุด</p>
                                ) : (
                                    recent.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium">{doc.title}</p>
                                                <p className="text-sm text-muted-foreground">{doc.document_number || '-'} • {new Date(doc.created_at).toLocaleDateString('th-TH')}</p>
                                            </div>
                                            <Link href={route('documents.show', doc.id)} className="text-sm text-blue-600 hover:underline">
                                                ดูรายละเอียด
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
