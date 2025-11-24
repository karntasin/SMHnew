import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, CheckCircle, Send, Eye, MessageSquare, UserArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Document {
    id: number;
    document_number: string;
    subject: string;
    content: string;
    status: string;
    urgency: string;
    confidentiality: string;
    document_date: string;
    created_at: string;
    file_path: string | null;
    created_by: { name: string };
    approvals: any[];
    distributions: any[];
}

interface User {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface ShowProps {
    document: Document;
    users: User[];
    departments: Department[];
    auth: {
        user: any;
        can_approve: boolean;
    };
}

export default function Show({ document, users, departments, auth }: ShowProps) {
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const { data: approveData, setData: setApproveData, post: postApprove, processing: approveProcessing } = useForm({
        signature: 'signed', // Mock signature for now
        comment: '',
    });

    const handleApprove = () => {
        postApprove(route('documents.approve', document.id), {
            onSuccess: () => setIsApproveOpen(false),
        });
    };

    const [isKasienOpen, setIsKasienOpen] = useState(false);
    const { data: kasienData, setData: setKasienData, post: postKasien, processing: kasienProcessing } = useForm({
        comment: '',
        next_user_id: '',
    });

    const handleKasien = () => {
        postKasien(route('documents.kasien', document.id), {
            onSuccess: () => setIsKasienOpen(false),
        });
    };

    const [isDistributeOpen, setIsDistributeOpen] = useState(false);
    const { data: distData, setData: setDistData, post: postDist, processing: distProcessing } = useForm({
        department_ids: [] as string[],
        user_ids: [] as string[],
        note: '',
    });

    const handleDistribute = () => {
        postDist(route('documents.distribute', document.id), {
            onSuccess: () => setIsDistributeOpen(false),
        });
    };

    const toggleDepartment = (id: string) => {
        const current = distData.department_ids;
        if (current.includes(id)) {
            setDistData('department_ids', current.filter(i => i !== id));
        } else {
            setDistData('department_ids', [...current, id]);
        }
    };

    const toggleUser = (id: string) => {
        const current = distData.user_ids;
        if (current.includes(id)) {
            setDistData('user_ids', current.filter(i => i !== id));
        } else {
            setDistData('user_ids', [...current, id]);
        }
    };

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
        <AppLayout breadcrumbs={[
            { title: 'ระบบรับส่งหนังสือ', href: route('documents.index') },
            { title: document.document_number, href: '#' }
        ]}>
            <Head title={`หนังสือ ${document.document_number}`} />
            
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="mb-6 flex justify-between items-center">
                    <Link href={route('documents.index')} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        กลับไปหน้ารายการ
                    </Link>
                    
                    <div className="flex gap-2">
                        {/* Kasien / Route Button */}
                        <Dialog open={isKasienOpen} onOpenChange={setIsKasienOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    เกษียณ/ส่งต่อ
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>เกษียณหนังสือ / ส่งต่อ</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>ความเห็น (เกษียณหนังสือ)</Label>
                                        <Textarea 
                                            value={kasienData.comment}
                                            onChange={e => setKasienData('comment', e.target.value)}
                                            placeholder="ระบุความเห็น..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ส่งต่อให้ (ถ้ามี)</Label>
                                        <Select onValueChange={(val) => setKasienData('next_user_id', val)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="เลือกผู้รับคนถัดไป" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map(u => (
                                                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsKasienOpen(false)}>ยกเลิก</Button>
                                    <Button onClick={handleKasien} disabled={kasienProcessing}>บันทึก</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {auth.can_approve && (
                            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        ลงนามอนุมัติ
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>ลงนามอนุมัติหนังสือ</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>ความเห็นประกอบ (ถ้ามี)</Label>
                                            <Textarea 
                                                value={approveData.comment}
                                                onChange={e => setApproveData('comment', e.target.value)}
                                                placeholder="ระบุความเห็น..."
                                            />
                                        </div>
                                        <div className="p-4 border rounded bg-gray-50 text-center text-gray-500">
                                            [พื้นที่สำหรับลายเซ็นอิเล็กทรอนิกส์]
                                            <br/>
                                            (จำลองการเซ็นชื่อ)
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsApproveOpen(false)}>ยกเลิก</Button>
                                        <Button onClick={handleApprove} disabled={approveProcessing}>ยืนยันการลงนาม</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl">{document.subject}</CardTitle>
                                        <CardDescription className="mt-2">
                                            เลขที่: {document.document_number} | ลงวันที่: {new Date(document.document_date).toLocaleDateString('th-TH')}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(document.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">ความเร่งด่วน:</span>
                                        <span className="ml-2 font-medium">
                                            {document.urgency === 'urgent' ? 'ด่วน' : 
                                             document.urgency === 'very_urgent' ? 'ด่วนที่สุด' : 'ปกติ'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">ชั้นความลับ:</span>
                                        <span className="ml-2 font-medium">
                                            {document.confidentiality === 'confidential' ? 'ลับ' : 
                                             document.confidentiality === 'secret' ? 'ลับที่สุด' : 'ปกติ'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">ผู้สร้าง:</span>
                                        <span className="ml-2">{document.created_by?.name}</span>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-medium mb-2">รายละเอียด</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{document.content || '-'}</p>
                                </div>

                                {document.file_path && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-medium mb-2">ไฟล์แนบ</h3>
                                        <a 
                                            href={`/storage/${document.file_path}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:underline p-3 border rounded-md bg-blue-50"
                                        >
                                            <FileText className="h-5 w-5" />
                                            เปิดดูไฟล์แนบ
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Approval History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">การลงนาม/อนุมัติ</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {document.approvals.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">ไม่มีข้อมูลการอนุมัติ</p>
                                    ) : (
                                        document.approvals.map((approval) => (
                                            <div key={approval.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                                                <div className={`mt-1 w-2 h-2 rounded-full ${approval.approved_at ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                <div>
                                                    <p className="font-medium">{approval.approver?.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {approval.approved_at ? 
                                                            `ลงนามเมื่อ ${new Date(approval.approved_at).toLocaleString('th-TH')}` : 
                                                            'รอการลงนาม'}
                                                    </p>
                                                    {approval.comment && (
                                                        <p className="text-sm mt-1 bg-gray-50 p-2 rounded">"{approval.comment}"</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Distribution / Circulation */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">การเวียนทราบ/ส่งต่อ</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {document.distributions.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">ยังไม่มีการส่งต่อ</p>
                                    ) : (
                                        document.distributions.map((dist) => (
                                            <div key={dist.id} className="flex justify-between items-center text-sm">
                                                <span>
                                                    {dist.department ? `แผนก ${dist.department.name}` : dist.user?.name}
                                                </span>
                                                {dist.status === 'acknowledged' ? (
                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                        รับทราบแล้ว
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                                                        รอรับทราบ
                                                    </Badge>
                                                )}
                                            </div>
                                        ))
                                    )}
                                    
                                    {/* Add Distribution Button */}
                                    <Dialog open={isDistributeOpen} onOpenChange={setIsDistributeOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full mt-4">
                                                <Send className="mr-2 h-4 w-4" />
                                                ส่งต่อ/เวียนทราบ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle>ส่งต่อ/เวียนทราบหนังสือ</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>เลือกแผนกที่ต้องการเวียนทราบ</Label>
                                                    <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                                        {departments.map(dept => (
                                                            <div key={dept.id} className="flex items-center space-x-2">
                                                                <Checkbox 
                                                                    id={`dept-${dept.id}`} 
                                                                    checked={distData.department_ids.includes(dept.id.toString())}
                                                                    onCheckedChange={() => toggleDepartment(dept.id.toString())}
                                                                />
                                                                <label htmlFor={`dept-${dept.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                    {dept.name}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>เลือกบุคคลที่ต้องการเวียนทราบ</Label>
                                                    <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                                                        {users.map(user => (
                                                            <div key={user.id} className="flex items-center space-x-2">
                                                                <Checkbox 
                                                                    id={`user-${user.id}`} 
                                                                    checked={distData.user_ids.includes(user.id.toString())}
                                                                    onCheckedChange={() => toggleUser(user.id.toString())}
                                                                />
                                                                <label htmlFor={`user-${user.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                    {user.name}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>บันทึกข้อความ/คำสั่งการ</Label>
                                                    <Textarea 
                                                        value={distData.note}
                                                        onChange={e => setDistData('note', e.target.value)}
                                                        placeholder="ระบุข้อความ..."
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsDistributeOpen(false)}>ยกเลิก</Button>
                                                <Button onClick={handleDistribute} disabled={distProcessing}>ยืนยันการส่ง</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
