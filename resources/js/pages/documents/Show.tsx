import React, { useState } from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, FileText, CheckCircle, Send, Eye, UserPlus, Users, CheckCheck,
    Clock, Upload, Stamp, PenLine, AlertCircle, Building2, RotateCcw, Archive,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { storageUrl } from '@/lib/asset';

interface DocumentAction {
    id: number;
    action_type: string;
    status: string;
    comment: string | null;
    created_at: string;
    acknowledged_at: string | null;
    acknowledged_by: number | null;
    receiver_user_id: number | null;
    receiver_department_id: number | null;
    implementation_status: string | null;
    implementation_comment: string | null;
    implementation_updated_at: string | null;
    sender?: { id: number; name: string };
    receiver_user?: { id: number; name: string };
    receiver_department?: { id: number; name: string };
    acknowledged_by_user?: { id: number; name: string };
}

interface Document {
    id: number;
    document_number: string;
    title: string;
    description: string;
    summary_for_director: string | null;
    director_comment: string | null;
    director_signature_path: string | null;
    stamp_path: string | null;
    director_signed_at: string | null;
    status: string;
    origin_type: string;
    type: string;
    document_date: string;
    created_at: string;
    file_path: string | null;
    department_id: number | null;
    user_id: number;
    creator: { name: string };
    department: { id: number; name: string } | null;
    actions: DocumentAction[];
    circular_recipients: any[];
}

interface User {
    id: number;
    name: string;
    department_id?: number;
}

interface Department {
    id: number;
    name: string;
}

interface ShowProps {
    document: Document;
    directors: User[];
    departments: Department[];
    currentUser: User;
    userSignatures: { signature_path: string | null; stamp_path: string | null };
}

const WORKFLOW_STEPS = [
    { key: 'registered', label: 'รับหนังสือ' },
    { key: 'pending_director', label: 'นำเรียน ผอ.' },
    { key: 'approved', label: 'อนุมัติ/ลงนาม' },
    { key: 'in_progress', label: 'ส่งต่อแผนก' },
    { key: 'completed', label: 'เสร็จสิ้น' },
];

const STATUS_LABELS: Record<string, string> = {
    registered: 'ลงทะเบียนรับแล้ว',
    pending: 'รอดำเนินการ',
    pending_director: 'รอผู้อำนวยการพิจารณา',
    approved: 'อนุมัติแล้ว — รอส่งต่อแผนก',
    rejected: 'ไม่อนุมัติ — ส่งกลับต้นทาง',
    in_progress: 'กำลังดำเนินการในแผนก',
    distributed: 'เวียนทราบ',
    completed: 'ดำเนินการเสร็จสิ้น',
};

const IMPL_STATUS: Record<string, { label: string; color: string }> = {
    received: { label: 'รับหนังสือแล้ว', color: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'กำลังดำเนินการ', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'ดำเนินการเสร็จสิ้น', color: 'bg-green-100 text-green-800' },
    not_relevant: { label: 'ไม่เกี่ยวข้อง — ส่งกลับต้นทาง', color: 'bg-orange-100 text-orange-800' },
};

export default function Show({ document, directors, departments, currentUser, userSignatures }: ShowProps) {
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const [isSubmitBossOpen, setIsSubmitBossOpen] = useState(false);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [isImplOpen, setIsImplOpen] = useState(false);
    const [isSignatureOpen, setIsSignatureOpen] = useState(false);
    const [selectedImplAction, setSelectedImplAction] = useState<DocumentAction | null>(null);

    const { data: forwardData, setData: setForwardData, post: postForward, processing: forwardProcessing } = useForm({
        department_ids: [] as string[],
        comment: '',
        forward_all: false,
    });

    const { data: bossData, setData: setBossData, post: postBoss, processing: bossProcessing } = useForm({
        boss_id: '',
        summary: document.summary_for_director || '',
        comment: '',
    });

    const { data: approveData, setData: setApproveData, post: postApprove, processing: approveProcessing } = useForm({
        status: 'approved',
        comment: '',
        signature: null as File | null,
        stamp: null as File | null,
        use_saved_signature: !!userSignatures.signature_path,
        use_saved_stamp: !!userSignatures.stamp_path,
    });

    const { data: implData, setData: setImplData, post: postImpl, processing: implProcessing } = useForm({
        implementation_status: 'in_progress',
        implementation_comment: '',
    });

    const { data: sigData, setData: setSigData, post: postSig, processing: sigProcessing } = useForm({
        signature: null as File | null,
        stamp: null as File | null,
    });

    const pendingAction = document.actions.find(a =>
        a.receiver_user_id === currentUser.id &&
        a.status === 'pending' &&
        a.action_type === 'submit_boss'
    );

    const forwardActions = document.actions.filter(a => a.action_type === 'forward');
    const pendingForwardActions = forwardActions.filter(a =>
        !a.acknowledged_at &&
        (a.receiver_department_id === currentUser.department_id || a.receiver_user_id === currentUser.id)
    );

    const myForwardActions = forwardActions.filter(a =>
        a.acknowledged_at &&
        (a.receiver_department_id === currentUser.department_id || a.receiver_user_id === currentUser.id) &&
        !['completed', 'not_relevant'].includes(a.implementation_status || '')
    );

    const canForward = document.status === 'approved';
    const canSubmitBoss = ['registered', 'pending', 'rejected'].includes(document.status);
    const isOriginDept = document.department_id === currentUser.department_id
        || document.user_id === currentUser.id;

    const currentStepIndex = (() => {
        if (document.status === 'rejected') return 1;
        if (document.status === 'completed') return 4;
        const map: Record<string, number> = {
            registered: 0, pending: 0, pending_director: 1,
            approved: 2, in_progress: 3, distributed: 3,
        };
        return map[document.status] ?? 0;
    })();

    const toggleDepartment = (id: string) => {
        const current = forwardData.department_ids;
        setForwardData('department_ids', current.includes(id) ? current.filter(i => i !== id) : [...current, id]);
    };

    const selectAllDepartments = () => {
        setForwardData('department_ids', departments.map(d => String(d.id)));
        setForwardData('forward_all', true);
    };

    const handleForward = () => {
        postForward(route('documents.forward', document.id), { onSuccess: () => setIsForwardOpen(false) });
    };

    const handleSubmitBoss = () => {
        postBoss(route('documents.submitBoss', document.id), { onSuccess: () => setIsSubmitBossOpen(false) });
    };

    const handleApprove = () => {
        if (!pendingAction) return;
        postApprove(route('documents.approve', [document.id, pendingAction.id]), {
            forceFormData: true,
            onSuccess: () => setIsApproveOpen(false),
        });
    };

    const handleImplUpdate = () => {
        if (!selectedImplAction) return;
        postImpl(route('documents.updateImplementation', selectedImplAction.id), {
            onSuccess: () => { setIsImplOpen(false); setSelectedImplAction(null); },
        });
    };

    const { post: postAckDocument, processing: ackDocumentProcessing } = useForm({});
    const handleAcknowledgeDocument = (actionId: number) => {
        if (confirm('ยืนยันการรับหนังสือ?')) {
            postAckDocument(route('documents.acknowledgeDocument', actionId));
        }
    };

    const handleUploadSignatures = () => {
        postSig(route('documents.signatures.upload'), { forceFormData: true, onSuccess: () => setIsSignatureOpen(false) });
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            registered: 'bg-slate-100 text-slate-800',
            pending_director: 'bg-amber-100 text-amber-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-emerald-100 text-emerald-800',
        };
        return <Badge className={colors[status] || 'bg-gray-100'}>{STATUS_LABELS[status] || status}</Badge>;
    };

    const actionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            register: 'ลงทะเบียนรับหนังสือ',
            forward: 'ส่งต่อแผนก',
            submit_boss: 'นำเรียนผู้อำนวยการ',
            approve: 'อนุมัติ/ลงนาม',
            reject: 'ไม่อนุมัติ — ส่งกลับต้นทาง',
            acknowledge: 'รับหนังสือแล้ว',
            implementation_update: 'อัปเดตสถานะการปฏิบัติ',
            distribute: 'เวียนแจ้งทราบ',
        };
        return labels[type] || type;
    };

    return (
        <DocumentShell
            active="documents.index"
            title={document.document_number || 'รายละเอียดหนังสือ'}
            headTitle={`หนังสือ ${document.document_number || ''}`}
            breadcrumbs={documentBreadcrumbs([
                { title: 'รายการหนังสือ', href: route('documents.index') },
                { title: document.document_number || 'รายละเอียด', href: '#' },
            ])}
        >
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button asChild variant="ghost" className="rounded-xl text-slate-600">
                        <Link href={route('documents.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> กลับรายการ
                        </Link>
                    </Button>
                    {['completed', 'approved', 'rejected', 'distributed'].includes(document.status) && (
                        <Button
                            className="rounded-xl bg-stone-700 hover:bg-stone-800"
                            onClick={() => {
                                if (confirm('ยืนยันเก็บหนังสือเข้าคลัง?')) {
                                    router.post(route('documents.archive', document.id));
                                }
                            }}
                        >
                            <Archive className="mr-2 h-4 w-4" /> เก็บเข้าคลัง
                        </Button>
                    )}
                </div>
                {/* Workflow Stepper */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            {WORKFLOW_STEPS.map((step, i) => (
                                <div key={step.key} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                            i <= currentStepIndex ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {i + 1}
                                        </div>
                                        <span className="text-xs mt-1 text-center">{step.label}</span>
                                    </div>
                                    {i < WORKFLOW_STEPS.length - 1 && (
                                        <div className={`h-0.5 flex-1 mx-1 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between items-center">
                    <Link href={route('documents.index')} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> กลับไปหน้ารายการ
                    </Link>
                    <div className="flex flex-wrap gap-2 justify-end">
                        {/* ลายเซ็น/ตราประทับ */}
                        <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <PenLine className="mr-1 h-4 w-4" /> ลายเซ็น/ตราประทับ
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>อัปโหลดลายเซ็นและตราประทับ</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    {userSignatures.signature_path && (
                                        <img src={storageUrl(userSignatures.signature_path)} alt="ลายเซ็น" className="h-16 border rounded" />
                                    )}
                                    <div>
                                        <Label>ลายเซ็น (PNG/JPG)</Label>
                                        <Input type="file" accept="image/*" onChange={e => setSigData('signature', e.target.files?.[0] || null)} />
                                    </div>
                                    {userSignatures.stamp_path && (
                                        <img src={storageUrl(userSignatures.stamp_path)} alt="ตราประทับ" className="h-16 border rounded" />
                                    )}
                                    <div>
                                        <Label>ตราประทับ (PNG/JPG)</Label>
                                        <Input type="file" accept="image/*" onChange={e => setSigData('stamp', e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleUploadSignatures} disabled={sigProcessing}>บันทึก</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* นำเรียน ผอ. */}
                        {canSubmitBoss && isOriginDept && (
                            <Dialog open={isSubmitBossOpen} onOpenChange={setIsSubmitBossOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="border-orange-200 text-orange-700">
                                        <UserPlus className="mr-2 h-4 w-4" /> นำเรียน ผอ.
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader><DialogTitle>นำเรียนผู้อำนวยการ</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div>
                                            <Label>ผู้อำนวยการ/ผู้มีอำนาจ *</Label>
                                            <Select value={bossData.boss_id || undefined} onValueChange={v => setBossData('boss_id', v)}>
                                                <SelectTrigger><SelectValue placeholder="เลือกรายชื่อ" /></SelectTrigger>
                                                <SelectContent>
                                                    {directors.map(u => (
                                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>ข้อความสรุปและชี้แจง *</Label>
                                            <Textarea value={bossData.summary} onChange={e => setBossData('summary', e.target.value)}
                                                placeholder="สรุปเนื้อหาหนังสือและข้อเสนอเพื่อพิจารณา..." rows={5} />
                                        </div>
                                        <div>
                                            <Label>หมายเหตุเพิ่มเติม</Label>
                                            <Textarea value={bossData.comment} onChange={e => setBossData('comment', e.target.value)} rows={2} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsSubmitBossOpen(false)}>ยกเลิก</Button>
                                        <Button onClick={handleSubmitBoss} disabled={bossProcessing || !bossData.boss_id || !bossData.summary}>นำเรียน</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* อนุมัติ/ไม่อนุมัติ */}
                        {pendingAction && (
                            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="mr-2 h-4 w-4" /> ลงนาม/สั่งการ
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader><DialogTitle>พิจารณาและลงนาม</DialogTitle></DialogHeader>
                                    {document.summary_for_director && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                                            <p className="font-medium text-amber-800 mb-1">ข้อความสรุป:</p>
                                            <p>{document.summary_for_director}</p>
                                        </div>
                                    )}
                                    <div className="space-y-4 py-4">
                                        <div>
                                            <Label>ผลการพิจารณา</Label>
                                            <Select value={approveData.status} onValueChange={v => setApproveData('status', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="approved">อนุมัติ</SelectItem>
                                                    <SelectItem value="rejected">ไม่อนุมัติ — ส่งกลับต้นทาง</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>เกษียนหนังสือ / สั่งการ</Label>
                                            <Textarea value={approveData.comment} onChange={e => setApproveData('comment', e.target.value)} rows={3} />
                                        </div>
                                        {approveData.status === 'approved' && (
                                            <>
                                                {userSignatures.signature_path && (
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox checked={approveData.use_saved_signature}
                                                            onCheckedChange={v => setApproveData('use_saved_signature', !!v)} />
                                                        <Label>ใช้ลายเซ็นที่บันทึกไว้</Label>
                                                    </div>
                                                )}
                                                {!approveData.use_saved_signature && (
                                                    <div>
                                                        <Label>อัปโหลดลายเซ็น</Label>
                                                        <Input type="file" accept="image/*" onChange={e => setApproveData('signature', e.target.files?.[0] || null)} />
                                                    </div>
                                                )}
                                                {userSignatures.stamp_path && (
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox checked={approveData.use_saved_stamp}
                                                            onCheckedChange={v => setApproveData('use_saved_stamp', !!v)} />
                                                        <Label>ใช้ตราประทับที่บันทึกไว้</Label>
                                                    </div>
                                                )}
                                                {!approveData.use_saved_stamp && (
                                                    <div>
                                                        <Label>อัปโหลดตราประทับ</Label>
                                                        <Input type="file" accept="image/*" onChange={e => setApproveData('stamp', e.target.files?.[0] || null)} />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsApproveOpen(false)}>ยกเลิก</Button>
                                        <Button onClick={handleApprove} disabled={approveProcessing}>บันทึกผล</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* ส่งต่อแผนก */}
                        {canForward && isOriginDept && (
                            <Dialog open={isForwardOpen} onOpenChange={setIsForwardOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Send className="mr-2 h-4 w-4" /> ส่งต่อแผนก
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>ส่งหนังสือไปยังแผนกที่เกี่ยวข้อง</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Button type="button" variant="secondary" size="sm" onClick={selectAllDepartments}>
                                            <Building2 className="mr-1 h-4 w-4" /> เลือกทุกแผนก
                                        </Button>
                                        <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-60 overflow-y-auto">
                                            {departments.map(dept => (
                                                <div key={dept.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`dept-${dept.id}`}
                                                        checked={forwardData.department_ids.includes(String(dept.id))}
                                                        onCheckedChange={() => toggleDepartment(String(dept.id))} />
                                                    <label htmlFor={`dept-${dept.id}`} className="text-sm">{dept.name}</label>
                                                </div>
                                            ))}
                                        </div>
                                        <Textarea value={forwardData.comment} onChange={e => setForwardData('comment', e.target.value)}
                                            placeholder="บันทึกข้อความ/สั่งการ..." />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsForwardOpen(false)}>ยกเลิก</Button>
                                        <Button onClick={handleForward} disabled={forwardProcessing || forwardData.department_ids.length === 0}>
                                            ยืนยันส่ง ({forwardData.department_ids.length} แผนก)
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* รับหนังสือ */}
                        {pendingForwardActions.length > 0 && (
                            <Button onClick={() => handleAcknowledgeDocument(pendingForwardActions[0].id)}
                                disabled={ackDocumentProcessing} className="bg-emerald-600 hover:bg-emerald-700">
                                <CheckCheck className="mr-2 h-4 w-4" /> รับหนังสือ
                            </Button>
                        )}

                        {/* อัปเดตสถานะปฏิบัติ */}
                        {myForwardActions.length > 0 && (
                            <Button onClick={() => { setSelectedImplAction(myForwardActions[0]); setIsImplOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-700">
                                <AlertCircle className="mr-2 h-4 w-4" /> อัปเดตสถานะปฏิบัติ
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl">{document.title}</CardTitle>
                                        <CardDescription className="mt-2">
                                            เลขที่: {document.document_number || '-'} | ลงวันที่: {new Date(document.document_date).toLocaleDateString('th-TH')}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(document.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {document.summary_for_director && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                                        <p className="text-sm font-medium text-amber-800">ข้อความสรุปนำเรียน ผอ.</p>
                                        <p className="text-sm mt-1">{document.summary_for_director}</p>
                                    </div>
                                )}
                                {document.director_comment && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                        <p className="text-sm font-medium text-green-800">คำสั่งการผู้อำนวยการ</p>
                                        <p className="text-sm mt-1">{document.director_comment}</p>
                                        {(document.director_signature_path || document.stamp_path) && (
                                            <div className="flex gap-4 mt-2">
                                                {document.director_signature_path && (
                                                    <img src={storageUrl(document.director_signature_path)} alt="ลายเซ็น" className="h-12" />
                                                )}
                                                {document.stamp_path && (
                                                    <img src={storageUrl(document.stamp_path)} alt="ตราประทับ" className="h-12" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {document.status === 'rejected' && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                                        <RotateCcw className="h-4 w-4 text-red-600" />
                                        <p className="text-sm text-red-700">หนังสือถูกส่งกลับต้นทาง — กรุณาแก้ไขและนำเรียนใหม่</p>
                                    </div>
                                )}
                                <p className="text-gray-700 whitespace-pre-wrap">{document.description || '-'}</p>
                                {document.file_path && (
                                    <a href={storageUrl(document.file_path)} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-600 hover:underline p-3 border rounded-md bg-blue-50 w-fit">
                                        <FileText className="h-5 w-5" /> เปิดดูไฟล์หนังสือ
                                    </a>
                                )}
                            </CardContent>
                        </Card>

                        {/* Department Progress */}
                        {forwardActions.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">สถานะแผนกที่ได้รับหนังสือ</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {forwardActions.map(action => (
                                            <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{action.receiver_department?.name || 'แผนก'}</p>
                                                    {action.implementation_comment && (
                                                        <p className="text-xs text-muted-foreground mt-1">{action.implementation_comment}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!action.acknowledged_at ? (
                                                        <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                                            <Clock className="w-3 h-3 mr-1" /> รอรับหนังสือ
                                                        </Badge>
                                                    ) : action.implementation_status && IMPL_STATUS[action.implementation_status] ? (
                                                        <Badge className={IMPL_STATUS[action.implementation_status].color}>
                                                            {IMPL_STATUS[action.implementation_status].label}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-blue-100 text-blue-800">รับหนังสือแล้ว</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Timeline */}
                        <Card>
                            <CardHeader><CardTitle className="text-lg">ประวัติการดำเนินการ</CardTitle></CardHeader>
                            <CardContent>
                                <div className="relative border-l border-gray-200 ml-3 space-y-6">
                                    {document.actions.map(action => (
                                        <div key={action.id} className="ml-6">
                                            <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
                                                <div className={`w-2 h-2 rounded-full ${action.status === 'completed' || action.acknowledged_at ? 'bg-blue-600' : 'bg-gray-300'}`} />
                                            </span>
                                            <h3 className="font-semibold">{actionTypeLabel(action.action_type)}</h3>
                                            <p className="text-sm text-muted-foreground">โดย: {action.sender?.name}</p>
                                            {action.receiver_department && (
                                                <p className="text-sm text-muted-foreground">ถึง: {action.receiver_department.name}</p>
                                            )}
                                            {action.comment && (
                                                <div className="mt-1 p-2 bg-gray-50 rounded text-sm border">"{action.comment}"</div>
                                            )}
                                            <time className="text-xs text-muted-foreground">
                                                {new Date(action.created_at).toLocaleString('th-TH')}
                                            </time>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle className="text-sm">ขั้นตอนการทำงาน</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-2 text-muted-foreground">
                                <p>1. รับหนังสือและอัปโหลดไฟล์</p>
                                <p>2. นำเรียน ผอ. พร้อมสรุป</p>
                                <p>3. ผอ. อนุมัติ/ไม่อนุมัติ</p>
                                <p>4. ส่งต่อแผนกที่เกี่ยวข้อง</p>
                                <p>5. แผนกรับหนังสือ</p>
                                <p>6. แผนกอัปเดตสถานะปฏิบัติ</p>
                                <p>7. แจ้งสถานะกลับต้นทาง</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Implementation Status Dialog */}
            <Dialog open={isImplOpen} onOpenChange={setIsImplOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>อัปเดตสถานะการปฏิบัติ</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>สถานะ</Label>
                            <Select value={implData.implementation_status} onValueChange={v => setImplData('implementation_status', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                                    <SelectItem value="completed">ดำเนินการเสร็จสิ้นแล้ว</SelectItem>
                                    <SelectItem value="not_relevant">ไม่เกี่ยวข้อง — ส่งกลับต้นทาง</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>หมายเหตุ</Label>
                            <Textarea value={implData.implementation_comment} onChange={e => setImplData('implementation_comment', e.target.value)} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImplOpen(false)}>ยกเลิก</Button>
                        <Button onClick={handleImplUpdate} disabled={implProcessing}>บันทึก</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DocumentShell>
    );
}
