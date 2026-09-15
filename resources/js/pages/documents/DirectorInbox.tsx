import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PenLine, FileSignature, Clock, Upload } from 'lucide-react';
import { storageUrl } from '@/lib/asset';

interface DocumentAction {
    id: number;
    comment: string | null;
    created_at: string;
    sender?: { name: string };
}

interface Document {
    id: number;
    document_number: string | null;
    title: string;
    document_date: string;
    summary_for_director: string | null;
    department: { name: string } | null;
    creator: { name: string };
    actions: DocumentAction[];
}

interface DirectorInboxProps {
    documents: {
        data: Document[];
    };
    stats: {
        pending: number;
        approved_today: number;
    };
    userSignatures: {
        signature_path: string | null;
        stamp_path: string | null;
    };
}

export default function DirectorInbox({ documents, stats, userSignatures }: DirectorInboxProps) {
    const [isSignatureOpen, setIsSignatureOpen] = useState(false);
    const { data: sigData, setData: setSigData, post: postSig, processing: sigProcessing } = useForm({
        signature: null as File | null,
        stamp: null as File | null,
    });

    const handleUploadSignatures = () => {
        postSig(route('documents.signatures.upload'), {
            forceFormData: true,
            onSuccess: () => setIsSignatureOpen(false),
        });
    };

    return (
        <DocumentShell
            active="documents.director.index"
            title="กล่องงาน ผอ."
            breadcrumbs={documentBreadcrumbs([{ title: 'กล่องงาน ผอ.', href: route('documents.director.index') }])}
        >
            <section className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-slate-900 via-violet-950 to-fuchsia-900 p-6 text-white shadow-2xl md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">กล่องงานผู้อำนวยการ</h1>
                        <p className="mt-2 text-sm text-violet-100/90">พิจารณา ลงนาม และสั่งการหนังสือที่นำเรียน</p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setIsSignatureOpen(true)}>
                        <PenLine className="mr-2 h-4 w-4" /> จัดการลายเซ็น/ตราประทับ
                    </Button>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:w-80">
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <div className="text-xs text-violet-100/80">รอลงนาม</div>
                        <div className="text-2xl font-bold tabular-nums">{stats.pending}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <div className="text-xs text-violet-100/80">อนุมัติวันนี้</div>
                        <div className="text-2xl font-bold tabular-nums">{stats.approved_today}</div>
                    </div>
                </div>
            </section>

            <div className="rounded-3xl border border-indigo-100/80 bg-white/90 p-4 shadow-xl shadow-indigo-900/5">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">รายการรอลงนาม</h2>
                    <p className="text-sm text-slate-500">คลิกพิจารณาและลงนามเพื่ออ่านรายละเอียดและดำเนินการ</p>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>เลขที่</TableHead>
                            <TableHead>เรื่อง</TableHead>
                            <TableHead>หน่วยงาน</TableHead>
                            <TableHead>ผู้นำเรียน</TableHead>
                            <TableHead>วันที่นำเรียน</TableHead>
                            <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                                    <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                    ไม่มีหนังสือรอลงนาม
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.data.map((doc) => {
                                const submitAction = doc.actions?.[0];
                                return (
                                    <TableRow key={doc.id} className="hover:bg-violet-50/40">
                                        <TableCell className="font-mono text-xs text-indigo-700">{doc.document_number || '-'}</TableCell>
                                        <TableCell>
                                            <div className="max-w-[300px] truncate font-medium">{doc.title}</div>
                                            {doc.summary_for_director && (
                                                <div className="max-w-[300px] truncate text-xs text-amber-700">
                                                    {doc.summary_for_director}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{doc.department?.name || '-'}</TableCell>
                                        <TableCell>{submitAction?.sender?.name || doc.creator?.name}</TableCell>
                                        <TableCell>
                                            {submitAction?.created_at
                                                ? new Date(submitAction.created_at).toLocaleString('th-TH')
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-700">
                                                <Link href={route('documents.director.show', doc.id)}>
                                                    <FileSignature className="mr-1 h-3 w-3" />
                                                    พิจารณาและลงนาม
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

            <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>ลายเซ็นและตราประทับ</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        {userSignatures.signature_path && (
                            <div>
                                <Label>ลายเซ็นปัจจุบัน</Label>
                                <img src={storageUrl(userSignatures.signature_path)} alt="ลายเซ็น" className="mt-1 h-16 rounded border" />
                            </div>
                        )}
                        <div>
                            <Label>อัปโหลดลายเซ็นใหม่</Label>
                            <Input type="file" accept="image/*" onChange={(e) => setSigData('signature', e.target.files?.[0] || null)} />
                        </div>
                        {userSignatures.stamp_path && (
                            <div>
                                <Label>ตราประทับปัจจุบัน</Label>
                                <img src={storageUrl(userSignatures.stamp_path)} alt="ตราประทับ" className="mt-1 h-16 rounded border" />
                            </div>
                        )}
                        <div>
                            <Label>อัปโหลดตราประทับใหม่</Label>
                            <Input type="file" accept="image/*" onChange={(e) => setSigData('stamp', e.target.files?.[0] || null)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSignatureOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleUploadSignatures} disabled={sigProcessing}>
                            <Upload className="mr-1 h-4 w-4" /> บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DocumentShell>
    );
}
