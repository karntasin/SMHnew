import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Inbox as InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Distribution {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    acknowledged_at: string | null;
    document: {
        id: number;
        document_number: string;
        subject: string;
        urgency: string;
        created_by: {
            name: string;
        };
    };
    department?: {
        name: string;
    };
}

interface InboxProps {
    distributions: {
        data: Distribution[];
        links: any[];
    };
    status: string;
}

export default function Inbox({ distributions, status }: InboxProps) {
    const { post, processing } = useForm();

    const handleAcknowledge = (id: number) => {
        post(route('documents.acknowledge', { distribution: id }));
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบรับส่งหนังสือ', href: '/documents' }, { title: 'หนังสือเข้า', href: '#' }]}>
            <Head title="หนังสือเข้า" />
            
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <InboxIcon className="h-6 w-6" />
                        หนังสือเข้า / รอรับทราบ
                    </h1>
                </div>

                <div className="flex space-x-2 border-b pb-2">
                    <Link 
                        href={route('documents.inbox', { status: 'pending' })}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                            status === 'pending' 
                                ? "border-b-2 border-primary text-primary" 
                                : "text-muted-foreground"
                        )}
                    >
                        รอรับทราบ
                    </Link>
                    <Link 
                        href={route('documents.inbox', { status: 'history' })}
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
                            status === 'history' 
                                ? "border-b-2 border-primary text-primary" 
                                : "text-muted-foreground"
                        )}
                    >
                        ประวัติการรับทราบ
                    </Link>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {distributions.data.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    ไม่มีรายการหนังสือ
                                </div>
                            ) : (
                                distributions.data.map((dist) => (
                                    <div key={dist.id} className="p-4 hover:bg-accent/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Link href={route('documents.show', { document: dist.document.id })} className="font-semibold hover:underline text-lg">
                                                        {dist.document.subject}
                                                    </Link>
                                                    {dist.document.urgency === 'urgent' && <Badge variant="destructive">ด่วน</Badge>}
                                                    {dist.document.urgency === 'very_urgent' && <Badge variant="destructive">ด่วนที่สุด</Badge>}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    เลขที่: {dist.document.document_number} | 
                                                    ผู้ส่ง: {dist.document.created_by?.name} | 
                                                    ส่งเมื่อ: {new Date(dist.created_at).toLocaleString('th-TH')}
                                                </p>
                                                {dist.department && (
                                                    <Badge variant="outline" className="mt-1">
                                                        ส่งถึงแผนก: {dist.department.name}
                                                    </Badge>
                                                )}
                                                {dist.note && (
                                                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-100">
                                                        <span className="font-semibold">ข้อความ:</span> {dist.note}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {dist.status === 'pending' ? (
                                                    <Button 
                                                        onClick={() => handleAcknowledge(dist.id)} 
                                                        disabled={processing}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        กดรับทราบ
                                                    </Button>
                                                ) : (
                                                    <div className="text-right">
                                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                            รับทราบแล้ว
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {new Date(dist.acknowledged_at!).toLocaleString('th-TH')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
