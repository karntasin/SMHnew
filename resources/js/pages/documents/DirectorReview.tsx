import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ArrowLeft, FileText, FileSignature, Building2, User, Calendar,
    MessageSquare, CheckCircle, XCircle, Send, CheckCheck
} from 'lucide-react';
import { storageUrl } from '@/lib/asset';

interface DepartmentItem {
    id: number;
    name: string;
}

interface Document {
    id: number;
    document_number: string | null;
    title: string;
    description: string | null;
    summary_for_director: string | null;
    document_date: string;
    file_path: string | null;
    origin_type: string;
    sender_name: string | null;
    department: { name: string } | null;
    creator: { name: string };
}

interface PendingAction {
    id: number;
    comment: string | null;
    created_at: string;
    sender: { name: string };
}

interface DirectorReviewProps {
    document: Document;
    pendingAction: PendingAction;
    departments?: DepartmentItem[];
    userSignatures: {
        signature_path: string | null;
        stamp_path: string | null;
    };
}

export default function DirectorReview({ document, pendingAction, departments = [], userSignatures }: DirectorReviewProps) {
    const { data, setData, post, processing } = useForm({
        status: 'approved',
        comment: '',
        signature: null as File | null,
        stamp: null as File | null,
        use_saved_signature: !!userSignatures.signature_path,
        use_saved_stamp: !!userSignatures.stamp_path,
        assigned_department_ids: [] as string[],
        auto_forward: true,
    });

    const toggleDepartment = (deptId: string) => {
        const current = data.assigned_department_ids;
        if (current.includes(deptId)) {
            setData('assigned_department_ids', current.filter(id => id !== deptId));
        } else {
            setData('assigned_department_ids', [...current, deptId]);
        }
    };

    const handleSubmit = () => {
        post(route('documents.approve', [document.id, pendingAction.id]), {
            forceFormData: true,
            onSuccess: () => router.visit(route('documents.director.index')),
        });
    };

    const isPdf = document.file_path?.toLowerCase().endsWith('.pdf');

    return (
        <AppLayout breadcrumbs={[
            { title: 'งานธุรการ', href: '/admin-hub' },
            { title: 'ระบบรับส่งหนังสือ', href: route('documents.index') },
            { title: 'กล่องงานผู้อำนวยการ', href: route('documents.director.index') },
            { title: 'พิจารณาและลงนาม', href: '#' },
        ]}>
            <Head title={`พิจารณา: ${document.title}`} />

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <BackButton fallbackUrl={route('documents.director.index')} label="กลับกล่องงาน" />
                    <Badge className="bg-amber-100 text-amber-800 text-sm py-1 px-3">
                        รอผู้อำนวยการพิจารณาและลงนาม
                    </Badge>
                </div>

                {/* Header */}
                <Card className="border-t-4 border-t-violet-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <FileSignature className="h-5 w-5 text-violet-600" />
                            {document.title}
                        </CardTitle>
                        <CardDescription>
                            เลขที่ {document.document_number || '-'} | ลงวันที่ {new Date(document.document_date).toLocaleDateString('th-TH')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span>{document.department?.name || document.sender_name || 'ไม่ระบุหน่วยงาน'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>นำเรียนโดย: {pendingAction.sender?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{new Date(pendingAction.created_at).toLocaleString('th-TH')}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ข้อความสรุปนำเรียน */}
                    <Card className="lg:col-span-2 border-l-4 border-l-amber-400 bg-amber-50/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2 text-amber-900 font-semibold">
                                <MessageSquare className="h-4 w-4" />
                                ข้อความสรุปสาระสำคัญ (AI Summary / สารบรรณ)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-amber-950 font-medium">
                                {document.summary_for_director || pendingAction.comment || 'ไม่มีข้อความสรุป'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* รายละเอียด */}
                    {document.description && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">รายละเอียดหนังสือ</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{document.description}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* ไฟล์แนบ */}
                    {document.file_path && (
                        <Card className={document.description ? '' : 'lg:col-span-2'}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> เอกสารหนังสือต้นฉบับ
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <a href={storageUrl(document.file_path)} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-indigo-600 hover:underline text-sm font-medium">
                                    <FileText className="h-4 w-4" /> เปิดดูไฟล์ต้นฉบับในแท็บใหม่
                                </a>
                                {isPdf && (
                                    <iframe
                                        src={storageUrl(document.file_path)}
                                        className="w-full h-[400px] border rounded-lg bg-slate-50"
                                        title="เอกสารหนังสือ"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ฟอร์มลงนามและสั่งการ */}
                <Card className="border-2 border-violet-200 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100">
                        <CardTitle className="text-lg text-violet-950 font-bold">พิจารณา ลงนาม และเกษียนสั่งการ</CardTitle>
                        <CardDescription>เลือกผลการพิจารณา ระบุคำสั่งการ และมอบหมายแผนกปฏิบัติ</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant={data.status === 'approved' ? 'default' : 'outline'}
                                className={data.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 h-14 text-base font-bold text-white shadow-sm' : 'h-14 text-base font-semibold'}
                                onClick={() => setData('status', 'approved')}
                            >
                                <CheckCircle className="mr-2 h-5 w-5" /> อนุมัติ / สั่งการ
                            </Button>
                            <Button
                                type="button"
                                variant={data.status === 'rejected' ? 'default' : 'outline'}
                                className={data.status === 'rejected' ? 'bg-rose-600 hover:bg-rose-700 h-14 text-base font-bold text-white shadow-sm' : 'h-14 text-base font-semibold'}
                                onClick={() => setData('status', 'rejected')}
                            >
                                <XCircle className="mr-2 h-5 w-5" /> ไม่อนุมัติ / ส่งกลับแก้ไข
                            </Button>
                        </div>

                        <div>
                            <Label className="font-semibold text-slate-800">เกษียนหนังสือ / ข้อสั่งการผู้อำนวยการ *</Label>
                            <Textarea
                                value={data.comment}
                                onChange={e => setData('comment', e.target.value)}
                                rows={3}
                                placeholder="ระบุข้อสั่งการ เช่น มอบหมายฝ่ายการเงินดำเนินการ, เพื่อทราบและถือปฏิบัติ..."
                                className="mt-1.5 rounded-xl text-base"
                            />
                        </div>

                        {data.status === 'approved' && (
                            <>
                                {/* มอบหมายแผนก */}
                                {departments.length > 0 && (
                                    <div className="space-y-3 p-4 bg-sky-50/60 rounded-2xl border border-sky-100">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-sky-950 flex items-center gap-1.5">
                                                <Send className="w-4 h-4 text-sky-700" /> สั่งการมอบหมายแผนกที่เกี่ยวข้อง (Optional)
                                            </Label>
                                            <span className="text-xs text-sky-700">
                                                เลือก {data.assigned_department_ids.length} แผนก
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded-xl border border-sky-100">
                                            {departments.map((dept) => {
                                                const isChecked = data.assigned_department_ids.includes(String(dept.id));
                                                return (
                                                    <label key={dept.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onCheckedChange={() => toggleDepartment(String(dept.id))}
                                                        />
                                                        <span className={isChecked ? "font-semibold text-sky-900" : "text-slate-700"}>
                                                            {dept.name}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {data.assigned_department_ids.length > 0 && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <Checkbox
                                                    id="auto_forward"
                                                    checked={data.auto_forward}
                                                    onCheckedChange={(v) => setData('auto_forward', !!v)}
                                                />
                                                <Label htmlFor="auto_forward" className="text-xs text-sky-950 font-medium cursor-pointer">
                                                    ส่งต่อไปยังแผนกที่เลือกทันทีหลังกดลงนาม (Auto-Forward)
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ลายเซ็นและตราประทับ */}
                                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border">
                                    <p className="text-sm font-semibold text-slate-800">ลายเซ็นดิจิทัลและตราประทับ</p>
                                    {userSignatures.signature_path && (
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="use_sig"
                                                checked={data.use_saved_signature}
                                                onCheckedChange={v => setData('use_saved_signature', !!v)}
                                            />
                                            <Label htmlFor="use_sig" className="font-normal cursor-pointer">ใช้ลายเซ็นที่บันทึกไว้ในระบบ</Label>
                                            <img src={storageUrl(userSignatures.signature_path)} alt="ลายเซ็น" className="h-10 border rounded bg-white p-1" />
                                        </div>
                                    )}
                                    {!data.use_saved_signature && (
                                        <div>
                                            <Label className="text-xs">อัปโหลดลายเซ็น (PNG/JPG)</Label>
                                            <Input type="file" accept="image/*" className="mt-1 rounded-xl bg-white"
                                                onChange={e => setData('signature', e.target.files?.[0] || null)} />
                                        </div>
                                    )}
                                    {userSignatures.stamp_path && (
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="use_stamp"
                                                checked={data.use_saved_stamp}
                                                onCheckedChange={v => setData('use_saved_stamp', !!v)}
                                            />
                                            <Label htmlFor="use_stamp" className="font-normal cursor-pointer">ใช้ตราประทับที่บันทึกไว้ในระบบ</Label>
                                            <img src={storageUrl(userSignatures.stamp_path)} alt="ตราประทับ" className="h-10 border rounded bg-white p-1" />
                                        </div>
                                    )}
                                    {!data.use_saved_stamp && (
                                        <div>
                                            <Label className="text-xs">อัปโหลดตราประทับ (PNG/JPG)</Label>
                                            <Input type="file" accept="image/*" className="mt-1 rounded-xl bg-white"
                                                onChange={e => setData('stamp', e.target.files?.[0] || null)} />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <Link href={route('documents.director.index')}>
                                <Button variant="outline" type="button" className="rounded-xl">ยกเลิก</Button>
                            </Link>
                            <Button
                                onClick={handleSubmit}
                                disabled={processing}
                                className={`rounded-xl px-6 py-2.5 text-base font-semibold shadow-md ${
                                    data.status === 'approved' 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-white' 
                                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white'
                                }`}
                            >
                                <FileSignature className="mr-2 h-4 w-4" />
                                {data.status === 'approved' ? 'ลงนามอนุมัติ & สั่งการ' : 'บันทึกส่งกลับต้นทาง'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
