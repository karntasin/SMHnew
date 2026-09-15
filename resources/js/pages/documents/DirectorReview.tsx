import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ArrowLeft, FileText, FileSignature, Building2, User, Calendar,
    MessageSquare, CheckCircle, XCircle,
} from 'lucide-react';
import { storageUrl } from '@/lib/asset';

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
    userSignatures: {
        signature_path: string | null;
        stamp_path: string | null;
    };
}

export default function DirectorReview({ document, pendingAction, userSignatures }: DirectorReviewProps) {
    const { data, setData, post, processing } = useForm({
        status: 'approved',
        comment: '',
        signature: null as File | null,
        stamp: null as File | null,
        use_saved_signature: !!userSignatures.signature_path,
        use_saved_stamp: !!userSignatures.stamp_path,
    });

    const handleSubmit = () => {
        post(route('documents.approve', [document.id, pendingAction.id]), {
            forceFormData: true,
            onSuccess: () => router.visit(route('documents.director.index')),
        });
    };

    const isPdf = document.file_path?.toLowerCase().endsWith('.pdf');

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบรับส่งหนังสือ', href: route('documents.index') },
            { title: 'กล่องงานผู้อำนวยการ', href: route('documents.director.index') },
            { title: 'พิจารณาและลงนาม', href: '#' },
        ]}>
            <Head title={`พิจารณา: ${document.title}`} />

            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <Link href={route('documents.director.index')} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> กลับกล่องงาน
                    </Link>
                    <Badge className="bg-amber-100 text-amber-800">รอพิจารณาและลงนาม</Badge>
                </div>

                {/* Header */}
                <Card className="border-t-4 border-t-violet-500">
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
                            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                                <MessageSquare className="h-4 w-4" />
                                ข้อความสรุปและชี้แจง
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
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
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> ไฟล์หนังสือ
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <a href={storageUrl(document.file_path)} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm">
                                    <FileText className="h-4 w-4" /> เปิดไฟล์ในแท็บใหม่
                                </a>
                                {isPdf && (
                                    <iframe
                                        src={storageUrl(document.file_path)}
                                        className="w-full h-[400px] border rounded-lg"
                                        title="เอกสารหนังสือ"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ฟอร์มลงนาม */}
                <Card className="border-2 border-violet-200">
                    <CardHeader className="bg-violet-50">
                        <CardTitle className="text-lg">พิจารณาและลงนาม</CardTitle>
                        <CardDescription>เลือกอนุมัติหรือไม่อนุมัติ พร้อมเกษียนหนังสือ/สั่งการ</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant={data.status === 'approved' ? 'default' : 'outline'}
                                className={data.status === 'approved' ? 'bg-green-600 hover:bg-green-700 h-12' : 'h-12'}
                                onClick={() => setData('status', 'approved')}
                            >
                                <CheckCircle className="mr-2 h-5 w-5" /> อนุมัติ
                            </Button>
                            <Button
                                type="button"
                                variant={data.status === 'rejected' ? 'default' : 'outline'}
                                className={data.status === 'rejected' ? 'bg-red-600 hover:bg-red-700 h-12' : 'h-12'}
                                onClick={() => setData('status', 'rejected')}
                            >
                                <XCircle className="mr-2 h-5 w-5" /> ไม่อนุมัติ — ส่งกลับต้นทาง
                            </Button>
                        </div>

                        <div>
                            <Label>เกษียนหนังสือ / สั่งการ / เหตุผล</Label>
                            <Textarea
                                value={data.comment}
                                onChange={e => setData('comment', e.target.value)}
                                rows={4}
                                placeholder="ระบุคำสั่งการหรือเหตุผล..."
                                className="mt-1"
                            />
                        </div>

                        {data.status === 'approved' && (
                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                <p className="text-sm font-medium">ลายเซ็นและตราประทับ</p>
                                {userSignatures.signature_path && (
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={data.use_saved_signature}
                                            onCheckedChange={v => setData('use_saved_signature', !!v)}
                                        />
                                        <Label className="font-normal">ใช้ลายเซ็นที่บันทึกไว้</Label>
                                        <img src={storageUrl(userSignatures.signature_path)} alt="ลายเซ็น" className="h-10" />
                                    </div>
                                )}
                                {!data.use_saved_signature && (
                                    <div>
                                        <Label>อัปโหลดลายเซ็น</Label>
                                        <Input type="file" accept="image/*" className="mt-1"
                                            onChange={e => setData('signature', e.target.files?.[0] || null)} />
                                    </div>
                                )}
                                {userSignatures.stamp_path && (
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={data.use_saved_stamp}
                                            onCheckedChange={v => setData('use_saved_stamp', !!v)}
                                        />
                                        <Label className="font-normal">ใช้ตราประทับที่บันทึกไว้</Label>
                                        <img src={storageUrl(userSignatures.stamp_path)} alt="ตราประทับ" className="h-10" />
                                    </div>
                                )}
                                {!data.use_saved_stamp && (
                                    <div>
                                        <Label>อัปโหลดตราประทับ</Label>
                                        <Input type="file" accept="image/*" className="mt-1"
                                            onChange={e => setData('stamp', e.target.files?.[0] || null)} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Link href={route('documents.director.index')}>
                                <Button variant="outline" type="button">ยกเลิก</Button>
                            </Link>
                            <Button
                                onClick={handleSubmit}
                                disabled={processing}
                                className={data.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                <FileSignature className="mr-2 h-4 w-4" />
                                {data.status === 'approved' ? 'ลงนามอนุมัติ' : 'บันทึกไม่อนุมัติ'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
