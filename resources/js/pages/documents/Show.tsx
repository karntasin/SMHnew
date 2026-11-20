import React, { useState } from 'react';
import { Link, useForm, router, usePage } from '@inertiajs/react';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, FileText, CheckCircle, Send, Eye, UserPlus, Users, CheckCheck,
    Clock, Upload, Stamp, PenLine, AlertCircle, Building2, RotateCcw, Archive,
    BellRing, CheckCircle2, FileCheck, ArrowUpRight, Undo2, Flame
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { storageUrl } from '@/lib/asset';
import ForwardDocumentDialog from './ForwardDocumentDialog';

interface DocumentAction {
    id: number;
    action_type: string;
    status: string;
    comment: string | null;
    attachment_path?: string | null;
    created_at: string;
    acknowledged_at: string | null;
    acknowledged_by: number | null;
    reminder_sent_at?: string | null;
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
    director_assigned_departments?: number[] | string[] | null;
    director_signature_path: string | null;
    stamp_path: string | null;
    director_signed_at: string | null;
    status: string;
    urgency?: string;
    origin_type: string;
    type: string;
    document_date: string;
    due_date?: string | null;
    created_at: string;
    archived_at?: string | null;
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
    users?: User[];
    currentUser: User;
    userSignatures: { signature_path: string | null; stamp_path: string | null };
}

const WORKFLOW_STEPS = [
    { key: 'registered', label: '1. รับหนังสือเข้า' },
    { key: 'pending_director', label: '2. นำเรียน ผอ.' },
    { key: 'approved', label: '3. ผอ. อนุมัติ/สั่งการ' },
    { key: 'in_progress', label: '4. แจกจ่ายแผนก' },
    { key: 'completed', label: '5. ติดตาม & เสร็จสิ้น' },
    { key: 'archived', label: '6. เข้าคลังหนังสือ' },
];

const STATUS_LABELS: Record<string, string> = {
    registered: 'ลงทะเบียนรับแล้ว',
    pending: 'รอดำเนินการ',
    pending_director: 'รอผู้อำนวยการพิจารณา',
    approved: 'อนุมัติแล้ว — รอแจกจ่าย',
    rejected: 'ไม่อนุมัติ — ส่งกลับต้นทาง',
    in_progress: 'แจกจ่ายแล้ว — กำลังปฏิบัติ',
    distributed: 'เวียนทราบ',
    completed: 'ดำเนินการเสร็จสิ้น',
    archived: 'เก็บเข้าคลังหนังสือแล้ว',
};

const IMPL_STATUS: Record<string, { label: string; color: string }> = {
    received: { label: 'รับหนังสือแล้ว', color: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'กำลังดำเนินการ', color: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'ดำเนินการเสร็จสิ้น', color: 'bg-emerald-100 text-emerald-800' },
    not_relevant: { label: 'ไม่เกี่ยวข้อง — ส่งกลับ', color: 'bg-orange-100 text-orange-800' },
};

export default function Show({ document, directors, departments, users = [], currentUser, userSignatures }: ShowProps) {
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const [isSubmitBossOpen, setIsSubmitBossOpen] = useState(false);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [isImplOpen, setIsImplOpen] = useState(false);
    const [isSignatureOpen, setIsSignatureOpen] = useState(false);
    const [selectedImplAction, setSelectedImplAction] = useState<DocumentAction | null>(null);

    const { data: bossData, setData: setBossData, post: postBoss, processing: bossProcessing } = useForm({
        boss_id: directors.length > 0 ? String(directors[0].id) : '',
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
        assigned_department_ids: [] as string[],
        auto_forward: true,
    });

    const { data: implData, setData: setImplData, post: postImpl, processing: implProcessing } = useForm({
        implementation_status: 'completed',
        implementation_comment: '',
        attachment: null as File | null,
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
    const acknowledgedCount = forwardActions.filter(a => !!a.acknowledged_at).length;
    const completedCount = forwardActions.filter(a => ['completed', 'not_relevant'].includes(a.implementation_status || '')).length;
    const totalForwards = forwardActions.length;
    const progressPercent = totalForwards > 0 ? Math.round((completedCount / totalForwards) * 100) : 0;

    const pendingForwardActions = forwardActions.filter(a =>
        !a.acknowledged_at &&
        (a.receiver_department_id === currentUser.department_id || a.receiver_user_id === currentUser.id)
    );

    const myForwardActions = forwardActions.filter(a =>
        a.acknowledged_at &&
        (a.receiver_department_id === currentUser.department_id || a.receiver_user_id === currentUser.id) &&
        !['completed', 'not_relevant'].includes(a.implementation_status || '')
    );

    const { auth } = usePage<any>().props;
    const userRoles: string[] = (auth?.user?.roles || []).map((r: any) =>
        (typeof r === 'string' ? r : r.name || '').toLowerCase()
    );
    const isHeaderOrAdmin = userRoles.includes('header') || userRoles.includes('admin') || userRoles.includes('superuser') || userRoles.includes('boss');
    const isOriginDept = isHeaderOrAdmin || document.department_id === currentUser.department_id || document.user_id === currentUser.id;

    const canForward = isOriginDept && ['approved', 'in_progress', 'registered', 'distributed'].includes(document.status);
    const canSubmitBoss = isOriginDept && ['registered', 'pending', 'rejected'].includes(document.status);

    const currentStepIndex = (() => {
        if (document.status === 'archived') return 5;
        if (document.status === 'completed') return 4;
        if (document.status === 'in_progress' || document.status === 'distributed') return 3;
        if (document.status === 'approved') return 2;
        if (document.status === 'pending_director') return 1;
        if (document.status === 'rejected') return 1;
        return 0; // registered
    })();

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
            forceFormData: true,
            onSuccess: () => { 
                setIsImplOpen(false); 
                setSelectedImplAction(null); 
                setImplData({ implementation_status: 'completed', implementation_comment: '', attachment: null });
            },
        });
    };

    const { post: postAckDocument, processing: ackDocumentProcessing } = useForm({});
    const handleAcknowledgeDocument = (actionId: number) => {
        if (confirm('ยืนยันการลงนามรับหนังสือ?')) {
            postAckDocument(route('documents.acknowledgeDocument', actionId));
        }
    };

    const handleRemind = (actionId: number) => {
        if (confirm('ต้องการส่งข้อความแจ้งเตือนเร่งรัดไปยังแผนกนี้หรือไม่?')) {
            router.post(route('documents.remindAction', actionId));
        }
    };

    const handleUploadSignatures = () => {
        postSig(route('documents.signatures.upload'), { forceFormData: true, onSuccess: () => setIsSignatureOpen(false) });
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            registered: 'bg-slate-100 text-slate-800 border-slate-300',
            pending_director: 'bg-violet-100 text-violet-800 border-violet-300',
            approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            rejected: 'bg-rose-100 text-rose-800 border-rose-300',
            in_progress: 'bg-sky-100 text-sky-800 border-sky-300',
            completed: 'bg-teal-100 text-teal-800 border-teal-300',
            archived: 'bg-stone-100 text-stone-700 border-stone-300',
            distributed: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        };
        return <Badge className={`${colors[status] || 'bg-gray-100'} border px-3 py-1 text-sm font-semibold`}>
            {STATUS_LABELS[status] || status}
        </Badge>;
    };

    const actionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            register: 'ลงทะเบียนรับหนังสือ',
            forward: 'ส่งต่อ/แจกจ่ายแผนก',
            submit_boss: 'นำเรียนผู้อำนวยการ',
            approve: 'อนุมัติ & สั่งการ',
            reject: 'ไม่อนุมัติ — ส่งกลับต้นทาง',
            acknowledge: 'รับหนังสือแล้ว',
            implementation_update: 'รายงานผลการปฏิบัติ',
            distribute: 'เวียนแจ้งทราบ',
            archive: 'เก็บเข้าคลังหนังสือ',
            unarchive: 'นำออกจากคลัง',
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
                
                {/* Top Nav & Action Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <BackButton fallbackUrl={route('documents.index')} label="กลับหน้ารายการ" className="rounded-xl text-slate-600" />
                    
                    <div className="flex items-center gap-2">
                        {document.status === 'archived' ? (
                            <Button
                                variant="outline"
                                className="rounded-xl border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                onClick={() => {
                                    if (confirm('ต้องการนำหนังสือนี้ออกจากคลังกลับมาใช้งานหรือไม่?')) {
                                        router.post(route('documents.unarchive', document.id));
                                    }
                                }}
                            >
                                <Undo2 className="mr-2 h-4 w-4" /> นำออกจากคลัง
                            </Button>
                        ) : ['completed', 'approved', 'rejected', 'distributed', 'registered'].includes(document.status) && (
                            <Button
                                variant="outline"
                                className="rounded-xl border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100"
                                onClick={() => {
                                    if (confirm('ยืนยันเก็บหนังสือนี้เข้าคลังราชการ?')) {
                                        router.post(route('documents.archive', document.id));
                                    }
                                }}
                            >
                                <Archive className="mr-2 h-4 w-4" /> เก็บเข้าคลังหนังสือ
                            </Button>
                        )}
                    </div>
                </div>

                {/* Workflow Stepper: แสดง 6 ขั้นตอนอย่างเชื่อมโยง */}
                <Card className="rounded-3xl border border-indigo-100 bg-white/95 p-5 shadow-lg shadow-indigo-900/5">
                    <div className="flex items-center justify-between">
                        {WORKFLOW_STEPS.map((step, i) => {
                            const isPast = i < currentStepIndex;
                            const isCurrent = i === currentStepIndex;
                            return (
                                <div key={step.key} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition ${
                                            isCurrent 
                                                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110 shadow-md' 
                                                : isPast 
                                                    ? 'bg-emerald-600 text-white' 
                                                    : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {isPast ? <CheckCircle className="w-5 h-5" /> : i + 1}
                                        </div>
                                        <span className={`text-xs mt-2 text-center font-medium ${
                                            isCurrent ? 'text-indigo-900 font-bold' : isPast ? 'text-emerald-800' : 'text-slate-400'
                                        }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {i < WORKFLOW_STEPS.length - 1 && (
                                        <div className={`h-1 flex-1 mx-1 rounded-full transition ${
                                            i < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                                        }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* ACTION BANNER: เมื่อ ผอ. อนุมัติแล้ว (Next Action Center) */}
                {document.status === 'approved' && isOriginDept && (
                    <div className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 p-6 shadow-md">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-emerald-950 font-bold text-lg">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                    ผู้อำนวยการลงนามอนุมัติและสั่งการเรียบร้อยแล้ว
                                </div>
                                {document.director_comment && (
                                    <p className="mt-2 text-sm text-emerald-900 bg-white/70 p-3 rounded-xl border border-emerald-200">
                                        <span className="font-semibold">ข้อสั่งการ:</span> "{document.director_comment}"
                                    </p>
                                )}
                                <p className="text-xs text-emerald-700 mt-2 font-medium">
                                    ขั้นตอนถัดไป: เลือกแจกจ่ายไปยังแผนกตามคำสั่งการ หรือเก็บเข้าคลังหนังสือราชการหากเสร็จสิ้นแล้ว
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                <Button
                                    onClick={() => setIsForwardOpen(true)}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-4 py-2.5 font-semibold"
                                >
                                    <Send className="mr-2 h-4 w-4" /> แจกจ่ายตามคำสั่ง ผอ.
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (confirm('ยืนยันส่งหนังสือเวียนแจ้งทราบทุกแผนกในโรงพยาบาล?')) {
                                            router.post(route('documents.distributeCircular', document.id));
                                        }
                                    }}
                                    className="rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
                                >
                                    <Users className="mr-2 h-4 w-4" /> เวียนทราบทุกแผนก
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (confirm('ยืนยันเก็บหนังสือนี้เข้าคลังราชการ?')) {
                                            router.post(route('documents.archive', document.id));
                                        }
                                    }}
                                    className="rounded-xl border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                                >
                                    <Archive className="mr-2 h-4 w-4" /> เพื่อทราบ เก็บเข้าคลัง
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        {getStatusBadge(document.status)}
                        {document.urgency && document.urgency !== 'normal' && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-rose-600" />
                                {document.urgency === 'urgent' ? 'ด่วน' : document.urgency === 'very_urgent' ? 'ด่วนมาก' : 'ด่วนที่สุด'}
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* ปุ่มรับหนังสือสำหรับแผนกที่ได้รับ forward */}
                        {pendingForwardActions.length > 0 && (
                            <Button 
                                onClick={() => handleAcknowledgeDocument(pendingForwardActions[0].id)}
                                disabled={ackDocumentProcessing} 
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                            >
                                <CheckCheck className="mr-2 h-4 w-4" /> ลงนามรับหนังสือ
                            </Button>
                        )}

                        {/* ปุ่มรายงานผลการปฏิบัติสำหรับแผนกที่รับแล้ว */}
                        {myForwardActions.length > 0 && (
                            <Button 
                                onClick={() => { setSelectedImplAction(myForwardActions[0]); setIsImplOpen(true); }}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                            >
                                <AlertCircle className="mr-2 h-4 w-4" /> รายงานผลการปฏิบัติ / แนบไฟล์
                            </Button>
                        )}

                        {/* ปุ่มนำเรียน ผอ. */}
                        {canSubmitBoss && (
                            <Button 
                                variant="outline" 
                                onClick={() => setIsSubmitBossOpen(true)}
                                className="rounded-xl border-violet-300 text-violet-800 hover:bg-violet-50"
                            >
                                <UserPlus className="mr-2 h-4 w-4" /> นำเรียน ผอ.
                            </Button>
                        )}

                        {/* ปุ่ม ผอ. ลงนาม (ถ้าเป็น ผอ. ที่ถูกระบุไว้) */}
                        {pendingAction && (
                            <Button 
                                onClick={() => setIsApproveOpen(true)}
                                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20"
                            >
                                <PenLine className="mr-2 h-4 w-4" /> พิจารณาและลงนาม
                            </Button>
                        )}

                        {/* ปุ่มส่งต่อ / แจกจ่ายทั่วไป */}
                        {canForward && (
                            <Button 
                                variant="outline" 
                                onClick={() => setIsForwardOpen(true)}
                                className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                                <Send className="mr-2 h-4 w-4" /> แจกจ่าย / ส่งต่อ
                            </Button>
                        )}
                    </div>
                </div>

                {/* เนื้อหาหลัก & รายละเอียด */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* การ์ดข้อมูลเอกสาร */}
                        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <div className="flex flex-wrap justify-between items-start gap-3">
                                    <div>
                                        <CardTitle className="text-xl text-slate-900 font-bold leading-snug">
                                            {document.title}
                                        </CardTitle>
                                        <CardDescription className="mt-2 text-xs flex flex-wrap gap-4 text-slate-500">
                                            <span>เลขที่: <b className="text-slate-800">{document.document_number || '-'}</b></span>
                                            <span>ลงวันที่: <b className="text-slate-800">{new Date(document.document_date).toLocaleDateString('th-TH')}</b></span>
                                            {document.due_date && (
                                                <span className="text-amber-700 font-medium">
                                                    กำหนดส่ง: {new Date(document.due_date).toLocaleDateString('th-TH')}
                                                </span>
                                            )}
                                        </CardDescription>
                                    </div>
                                    {document.file_path && (
                                        <a 
                                            href={storageUrl(document.file_path)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
                                        >
                                            <FileText className="h-4 w-4" /> เปิดดูไฟล์ต้นฉบับ
                                        </a>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-5">
                                
                                {/* ข้อความสรุปนำเรียน ผอ. */}
                                {document.summary_for_director && (
                                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                                        <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                                            <FileCheck className="w-4 h-4 text-amber-700" /> สรุปสาระสำคัญสำหรับนำเรียน ผอ. (AI Summary)
                                        </p>
                                        <p className="text-sm text-amber-950 whitespace-pre-wrap leading-relaxed">
                                            {document.summary_for_director}
                                        </p>
                                    </div>
                                )}

                                {/* คำสั่งการ ผอ. พร้อมลายเซ็น */}
                                {document.director_comment && (
                                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                                        <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-700" /> เกษียนสั่งการผู้อำนวยการ
                                        </p>
                                        <p className="text-sm text-emerald-950 whitespace-pre-wrap leading-relaxed font-medium">
                                            {document.director_comment}
                                        </p>
                                        {(document.director_signature_path || document.stamp_path) && (
                                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-emerald-200/60">
                                                {document.director_signature_path && (
                                                    <div className="text-center">
                                                        <img src={storageUrl(document.director_signature_path)} alt="ลายเซ็น" className="h-12 border rounded bg-white p-1" />
                                                        <span className="text-[10px] text-emerald-800">ลายเซ็น ผอ.</span>
                                                    </div>
                                                )}
                                                {document.stamp_path && (
                                                    <div className="text-center">
                                                        <img src={storageUrl(document.stamp_path)} alt="ตราประทับ" className="h-12 border rounded bg-white p-1" />
                                                        <span className="text-[10px] text-emerald-800">ตราประทับ</span>
                                                    </div>
                                                )}
                                                {document.director_signed_at && (
                                                    <span className="text-xs text-emerald-700 ml-auto">
                                                        ลงนามเมื่อ: {new Date(document.director_signed_at).toLocaleString('th-TH')}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* รายละเอียด */}
                                {document.description && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-1">รายละเอียดหนังสือ</p>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {document.description}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* ศูนย์ติดตามผลการแจกจ่าย (Real-time Distribution Tracker) */}
                        {forwardActions.length > 0 && (
                            <Card className="rounded-3xl border-sky-100 shadow-sm overflow-hidden">
                                <CardHeader className="bg-sky-50/70 border-b border-sky-100 pb-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-base text-sky-950 font-bold flex items-center gap-2">
                                                <Send className="w-4 h-4 text-sky-600" />
                                                ศูนย์ติดตามหนังสือที่แจกจ่าย (Distribution Tracking)
                                            </CardTitle>
                                            <CardDescription className="text-xs text-sky-700 mt-0.5">
                                                ติดตามการลงนามรับหนังสือ และผลการปฏิบัติของแต่ละแผนก
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                            <span className="px-2.5 py-1 rounded-full bg-white border border-sky-200 text-sky-800">
                                                แจกจ่าย {totalForwards} รายการ
                                            </span>
                                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                                                รับแล้ว {acknowledgedCount}/{totalForwards}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                                เสร็จสิ้น {completedCount}/{totalForwards}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="mt-3 w-full bg-sky-200/60 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {forwardActions.map(action => {
                                            const isAck = !!action.acknowledged_at;
                                            const impStatus = action.implementation_status;
                                            return (
                                                <div key={action.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                                                            <Building2 className="w-4 h-4 text-slate-400" />
                                                            {action.receiver_department?.name || action.receiver_user?.name || 'แผนก/ผู้รับ'}
                                                        </div>
                                                        <p className="text-xs text-slate-500">
                                                            ส่งเมื่อ: {new Date(action.created_at).toLocaleString('th-TH')}
                                                            {action.comment && <span> · "{action.comment}"</span>}
                                                        </p>
                                                        {action.implementation_comment && (
                                                            <p className="text-xs text-blue-700 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                                                                <span className="font-semibold">ผลการปฏิบัติ:</span> {action.implementation_comment}
                                                            </p>
                                                        )}
                                                        {action.attachment_path && (
                                                            <a 
                                                                href={storageUrl(action.attachment_path)} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium mt-1"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" /> ดูไฟล์ผลงาน/หนังสือตอบกลับ
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {!isAck ? (
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
                                                                    <Clock className="w-3 h-3 mr-1" /> รอรับหนังสือ
                                                                </Badge>
                                                                {isOriginDept && (
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="ghost" 
                                                                        onClick={() => handleRemind(action.id)}
                                                                        className="h-8 px-2 text-xs text-amber-700 hover:bg-amber-100 rounded-lg"
                                                                        title="ส่งแจ้งเตือนซ้ำ"
                                                                    >
                                                                        <BellRing className="w-3.5 h-3.5 mr-1" /> เตือน
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ) : impStatus && IMPL_STATUS[impStatus] ? (
                                                            <Badge className={`${IMPL_STATUS[impStatus].color} text-xs`}>
                                                                {IMPL_STATUS[impStatus].label}
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                                                                รับหนังสือแล้ว
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* ประวัติและ Timeline การดำเนินการ */}
                        <Card className="rounded-3xl border-slate-200 shadow-sm">
                            <CardHeader><CardTitle className="text-base font-bold text-slate-800">ประวัติการดำเนินการ (Audit Trail)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="relative border-l border-slate-200 ml-3 space-y-6">
                                    {document.actions.map(action => (
                                        <div key={action.id} className="ml-6">
                                            <span className="absolute flex items-center justify-center w-6 h-6 bg-indigo-100 rounded-full -left-3 ring-4 ring-white">
                                                <div className={`w-2 h-2 rounded-full ${action.status === 'completed' || action.acknowledged_at ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                                            </span>
                                            <h4 className="font-semibold text-sm text-slate-900">{actionTypeLabel(action.action_type)}</h4>
                                            <p className="text-xs text-slate-500 mt-0.5">โดย: {action.sender?.name}</p>
                                            {action.receiver_department && (
                                                <p className="text-xs text-slate-500">ถึง: {action.receiver_department.name}</p>
                                            )}
                                            {action.comment && (
                                                <div className="mt-1 p-2 bg-slate-50 rounded-xl text-xs border border-slate-100 text-slate-700">
                                                    "{action.comment}"
                                                </div>
                                            )}
                                            <time className="text-[11px] text-slate-400 mt-1 block">
                                                {new Date(action.created_at).toLocaleString('th-TH')}
                                            </time>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ข้อมูลหน่วยงาน & สรุปสถานะทางขวา */}
                    <div className="space-y-6">
                        <Card className="rounded-3xl border-slate-200 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-800">ข้อมูลหน่วยงาน</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block">หน่วยงานต้นเรื่อง:</span>
                                    <span className="font-semibold text-slate-800">
                                        {document.department?.name || document.sender_name || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">ผู้ลงทะเบียนรับเข้า:</span>
                                    <span className="font-semibold text-slate-800">{document.creator?.name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">วันที่รับเข้าสู่ระบบ:</span>
                                    <span className="font-semibold text-slate-800">{new Date(document.created_at).toLocaleString('th-TH')}</span>
                                </div>
                                {document.archived_at && (
                                    <div>
                                        <span className="text-slate-400 block">วันที่เก็บเข้าคลัง:</span>
                                        <span className="font-semibold text-stone-700">{new Date(document.archived_at).toLocaleString('th-TH')}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* ลายเซ็น/ตราประทับของฉัน */}
                        <Card className="rounded-3xl border-slate-200 shadow-sm">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800">ลายเซ็น/ตราประทับ</CardTitle>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs text-indigo-600"
                                    onClick={() => setIsSignatureOpen(true)}
                                >
                                    <PenLine className="w-3.5 h-3.5 mr-1" /> จัดการ
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {userSignatures.signature_path ? (
                                    <div className="text-center p-2 border rounded-xl bg-slate-50">
                                        <img src={storageUrl(userSignatures.signature_path)} alt="ลายเซ็น" className="h-12 mx-auto" />
                                        <span className="text-[10px] text-slate-500 mt-1 block">ลายเซ็นของคุณ</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400">ยังไม่ได้บันทึกลายเซ็น</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Dialog นำเรียน ผอ. */}
            <Dialog open={isSubmitBossOpen} onOpenChange={setIsSubmitBossOpen}>
                <DialogContent className="max-w-lg rounded-3xl">
                    <DialogHeader><DialogTitle>นำเรียนผู้อำนวยการ</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-3">
                        <div>
                            <Label>เลือกผู้อำนวยการ/ผู้มีอำนาจ *</Label>
                            <Select value={bossData.boss_id} onValueChange={v => setBossData('boss_id', v)}>
                                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="เลือกรายชื่อ" /></SelectTrigger>
                                <SelectContent>
                                    {directors.map(u => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>ข้อความสรุปและชี้แจง (AI Summary / สารบรรณ) *</Label>
                            <Textarea 
                                value={bossData.summary} 
                                onChange={e => setBossData('summary', e.target.value)}
                                placeholder="สรุปเนื้อหาหนังสือและข้อเสนอเพื่อพิจารณา..." 
                                rows={4} 
                                className="rounded-xl mt-1 text-sm"
                            />
                        </div>
                        <div>
                            <Label>หมายเหตุเพิ่มเติม (ถ้ามี)</Label>
                            <Input 
                                value={bossData.comment} 
                                onChange={e => setBossData('comment', e.target.value)} 
                                placeholder="ข้อความเพิ่มเติม..." 
                                className="rounded-xl mt-1 text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSubmitBossOpen(false)} className="rounded-xl">ยกเลิก</Button>
                        <Button onClick={handleSubmitBoss} disabled={bossProcessing || !bossData.boss_id} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
                            นำเรียน ผอ.
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog อัปเดตสถานะการปฏิบัติ (สำหรับแผนกปลายทาง) */}
            <Dialog open={isImplOpen} onOpenChange={setIsImplOpen}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader><DialogTitle>รายงานผลการปฏิบัติงาน</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-3">
                        <div>
                            <Label>สถานะการปฏิบัติงาน</Label>
                            <Select 
                                value={implData.implementation_status} 
                                onValueChange={v => setImplData('implementation_status', v)}
                            >
                                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                                    <SelectItem value="completed">ดำเนินการเสร็จสิ้นแล้ว</SelectItem>
                                    <SelectItem value="not_relevant">ไม่เกี่ยวข้องกับงาน — ส่งกลับ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>ข้อความรายงานผล / สรุปการปฏิบัติ</Label>
                            <Textarea 
                                value={implData.implementation_comment} 
                                onChange={e => setImplData('implementation_comment', e.target.value)} 
                                rows={3} 
                                className="rounded-xl mt-1 text-sm"
                                placeholder="ระบุผลการดำเนินการ หรือสิ่งที่ได้ทำไปแล้ว..."
                            />
                        </div>
                        <div>
                            <Label>แนบไฟล์ผลงาน / หนังสือตอบกลับ (ถ้ามี)</Label>
                            <Input 
                                type="file" 
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={e => setImplData('attachment', e.target.files?.[0] || null)}
                                className="rounded-xl mt-1 text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImplOpen(false)} className="rounded-xl">ยกเลิก</Button>
                        <Button onClick={handleImplUpdate} disabled={implProcessing} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                            บันทึกรายงานผล
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog อัปโหลดลายเซ็น */}
            <Dialog open={isSignatureOpen} onOpenChange={setIsSignatureOpen}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader><DialogTitle>จัดการลายเซ็นดิจิทัลและตราประทับ</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-3">
                        <div>
                            <Label>ลายเซ็นของคุณ (PNG/JPG)</Label>
                            <Input type="file" accept="image/*" onChange={e => setSigData('signature', e.target.files?.[0] || null)} className="rounded-xl mt-1" />
                        </div>
                        <div>
                            <Label>ตราประทับ (PNG/JPG)</Label>
                            <Input type="file" accept="image/*" onChange={e => setSigData('stamp', e.target.files?.[0] || null)} className="rounded-xl mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUploadSignatures} disabled={sigProcessing} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                            บันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog ส่งต่อ/แจกจ่าย */}
            <ForwardDocumentDialog
                open={isForwardOpen}
                onOpenChange={setIsForwardOpen}
                document={document}
                departments={departments}
                users={users}
            />
        </DocumentShell>
    );
}
