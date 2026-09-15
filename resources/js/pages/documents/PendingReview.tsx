import React from 'react';
import { Link } from '@inertiajs/react';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Eye, User } from 'lucide-react';

interface DocumentAction {
    id: number;
    comment: string | null;
    created_at: string;
    sender?: { name: string };
    receiver_user?: { name: string };
}

interface Document {
    id: number;
    document_number: string | null;
    title: string;
    document_date: string;
    summary_for_director: string | null;
    status: string;
    creator: { name: string };
    department: { name: string } | null;
    actions: DocumentAction[];
}

interface PendingReviewProps {
    documents: {
        data: Document[];
        links: { url: string | null; label: string; active: boolean }[];
    };
}

export default function PendingReview({ documents }: PendingReviewProps) {
    const getSubmitAction = (doc: Document) =>
        doc.actions?.find((a) => a.sender) ?? doc.actions?.[0];

    return (
        <DocumentShell
            active="documents.pendingReview"
            title="ระหว่างนำเรียน"
            breadcrumbs={documentBreadcrumbs([{ title: 'ระหว่างนำเรียน', href: route('documents.pendingReview') }])}
        >
            <section className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-900 p-6 text-white shadow-2xl md:p-8">
                <h1 className="text-3xl font-bold">ระหว่างนำเรียนผู้อำนวยการ</h1>
                <p className="mt-2 text-sm text-violet-100/90">หนังสือที่ส่งให้ ผอ. พิจารณาแล้ว และรอผลการลงนาม</p>
            </section>

            <div className="rounded-3xl border border-indigo-100/80 bg-white/90 p-4 shadow-xl shadow-indigo-900/5">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>เลขที่</TableHead>
                            <TableHead>เรื่อง</TableHead>
                            <TableHead>ผู้ส่งนำเรียน</TableHead>
                            <TableHead>ส่งถึง ผอ.</TableHead>
                            <TableHead>วันที่</TableHead>
                            <TableHead className="text-right">ดู</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                                    <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                    ไม่มีรายการระหว่างนำเรียน
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.data.map((doc) => {
                                const action = getSubmitAction(doc);
                                return (
                                    <TableRow key={doc.id} className="hover:bg-violet-50/40">
                                        <TableCell className="font-mono text-xs text-indigo-700">{doc.document_number || '-'}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{doc.title}</div>
                                            {doc.summary_for_director && (
                                                <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{doc.summary_for_director}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            <span className="inline-flex items-center gap-1">
                                                <User className="h-3.5 w-3.5" />
                                                {action?.sender?.name || doc.creator?.name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-violet-300 text-violet-700">
                                                {action?.receiver_user?.name || 'ผู้อำนวยการ'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            {action?.created_at ? new Date(action.created_at).toLocaleString('th-TH') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="outline" className="rounded-xl">
                                                <Link href={route('documents.show', doc.id)}>
                                                    <Eye className="mr-1 h-3.5 w-3.5" /> เปิด
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </DocumentShell>
    );
}
