import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Eye, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
    id: number;
    document_number: string;
    subject: string;
    urgency: string;
    created_at: string;
    distributions: {
        id: number;
        status: string;
        user?: {
            name: string;
        };
        department?: {
            name: string;
        };
        acknowledged_at: string | null;
    }[];
}

interface SentProps {
    documents: {
        data: Document[];
        links: any[];
    };
}

export default function Sent({ documents }: SentProps) {
    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบรับส่งหนังสือ', href: '/documents' }, { title: 'หนังสือออก', href: '#' }]}>
            <Head title="หนังสือออก" />
            
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Send className="h-6 w-6" />
                        หนังสือออก / ติดตามสถานะ
                    </h1>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {documents.data.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    ไม่มีรายการหนังสือที่ส่งออก
                                </div>
                            ) : (
                                documents.data.map((doc) => (
                                    <div key={doc.id} className="p-4 hover:bg-accent/50 transition-colors">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Link href={route('documents.show', { document: doc.id })} className="font-semibold hover:underline text-lg">
                                                        {doc.subject}
                                                    </Link>
                                                    {doc.urgency === 'urgent' && <Badge variant="destructive">ด่วน</Badge>}
                                                    {doc.urgency === 'very_urgent' && <Badge variant="destructive">ด่วนที่สุด</Badge>}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    เลขที่: {doc.document_number} | 
                                                    ส่งเมื่อ: {new Date(doc.created_at).toLocaleString('th-TH')}
                                                </p>
                                                
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-sm font-medium text-muted-foreground">ผู้รับ:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {doc.distributions.map((dist) => (
                                                            <div key={dist.id} className={cn(
                                                                "flex items-center gap-1 text-xs px-2 py-1 rounded border",
                                                                dist.status === 'acknowledged' 
                                                                    ? "bg-green-50 border-green-200 text-green-700" 
                                                                    : "bg-gray-50 border-gray-200 text-gray-600"
                                                            )}>
                                                                {dist.status === 'acknowledged' ? (
                                                                    <CheckCircle className="h-3 w-3" />
                                                                ) : (
                                                                    <Clock className="h-3 w-3" />
                                                                )}
                                                                <span>
                                                                    {dist.user?.name || dist.department?.name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <Link 
                                                    href={route('documents.show', { document: doc.id })}
                                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    ดูรายละเอียด
                                                </Link>
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
