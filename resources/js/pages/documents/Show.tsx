import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, CheckCircle, Send, Eye, MessageSquare, UserPlus, Users, CheckCheck, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
    status: string;
    origin_type: string;
    type: string;
    document_date: string;
    created_at: string;
    file_path: string | null;
    creator: { name: string };
    department: { name: string };
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
    users: User[];
    departments: Department[];
    currentUser: User;
}

export default function Show({ document, users, departments, currentUser }: ShowProps) {
    const { props } = usePage();
    
    // 1. Forward to Department
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const { data: forwardData, setData: setForwardData, post: postForward, processing: forwardProcessing } = useForm({
        department_ids: [] as string[],
        comment: '',
    });

    const handleForward = () => {
        postForward(route('documents.forward', document.id), {
            onSuccess: () => setIsForwardOpen(false),
        });
    };

    const toggleDepartment = (id: string) => {
        const current = forwardData.department_ids;
        if (current.includes(id)) {
            setForwardData('department_ids', current.filter(i => i !== id));
        } else {
            setForwardData('department_ids', [...current, id]);
        }
    };

    // 2. Submit to Boss
    const [isSubmitBossOpen, setIsSubmitBossOpen] = useState(false);
    const { data: bossData, setData: setBossData, post: postBoss, processing: bossProcessing } = useForm({
        boss_id: '',
        comment: '',
    });

    const handleSubmitBoss = () => {
        postBoss(route('documents.submitBoss', document.id), {
            onSuccess: () => setIsSubmitBossOpen(false),
        });
    };

    // 3. Approve (Boss Action)
    // Find pending action for current user
    const pendingAction = document.actions.find(a => 
        a.receiver_user_id === currentUser.id && 
        a.status === 'pending' && 
        a.action_type === 'submit_boss'
    );

    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const { data: approveData, setData: setApproveData, post: postApprove, processing: approveProcessing } = useForm({
        status: 'approved', // approved, rejected
        comment: '',
    });

    const handleApprove = () => {
        if (!pendingAction) return;
        postApprove(route('documents.approve', [document.id, pendingAction.id]), {
            onSuccess: () => setIsApproveOpen(false),
        });
    };

    // 4. Distribute Circular
    const { post: postCircular, processing: circularProcessing } = useForm({});
    const handleDistributeCircular = () => {
        if (confirm('ยืนยันการส่งหนังสือเวียนแจ้งทราบทั้งองค์กร?')) {
            postCircular(route('documents.distributeCircular', document.id));
        }
    };

    // 5. Acknowledge Circular
    const { post: postAck, processing: ackProcessing } = useForm({});
    const handleAcknowledge = () => {
        postAck(route('documents.acknowledge', document.id));
    };

    // 6. Acknowledge Forwarded Document (รับทราบหนังสือที่ส่งมา)
    const { post: postAckDocument, processing: ackDocumentProcessing } = useForm({});
    const handleAcknowledgeDocument = (actionId: number) => {
        if (confirm('ยืนยันการรับทราบหนังสือนี้?')) {
            postAckDocument(route('documents.acknowledgeDocument', actionId));
        }
    };

    // Find pending forwarded actions for current user's department
    const pendingForwardActions = document.actions.filter(a => 
        a.action_type === 'forward' && 
        !a.acknowledged_at &&
        (a.receiver_department_id === (currentUser as any).department_id || a.receiver_user_id === currentUser.id)
    );

    const isCircularRecipient = document.circular_recipients?.some(r => r.user_id === currentUser.id);
    const hasRead = document.circular_recipients?.some(r => r.user_id === currentUser.id && r.read_at);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">รอดำเนินการ</Badge>;
            case 'in_progress': return <Badge variant="default" className="bg-blue-100 text-blue-800">กำลังดำเนินการ</Badge>;
            case 'approved': return <Badge variant="default" className="bg-green-100 text-green-800">อนุมัติแล้ว</Badge>;
            case 'distributed': return <Badge variant="default" className="bg-purple-100 text-purple-800">เวียนทราบ</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-gray-100 text-gray-800">เสร็จสิ้น</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบรับส่งหนังสือ', href: route('documents.index') },
            { title: document.document_number || 'รายละเอียด', href: '#' }
        ]}>
            <Head title={`หนังสือ ${document.document_number || ''}`} />
            
            <div className="p-6 max-w-6xl mx-auto space-y-6">
                <div className="mb-6 flex justify-between items-center">
                    <Link href={route('documents.index')} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        กลับไปหน้ารายการ
                    </Link>
                    
                    <div className="flex gap-2">
                        {/* Actions based on state and role */}
                        
                        {/* 1. Forward to Department */}
                        <Dialog open={isForwardOpen} onOpenChange={setIsForwardOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Send className="mr-2 h-4 w-4" />
                                    ส่งต่อแผนก
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>ส่งหนังสือไปยังแผนก</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>เลือกแผนกปลายทาง</Label>
                                        <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-60 overflow-y-auto">
                                            {departments.map(dept => (
                                                <div key={dept.id} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`dept-${dept.id}`} 
                                                        checked={forwardData.department_ids.includes(dept.id.toString())}
                                                        onCheckedChange={() => toggleDepartment(dept.id.toString())}
                                                    />
                                                    <label htmlFor={`dept-${dept.id}`} className="text-sm font-medium">
                                                        {dept.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>บันทึกข้อความ/สั่งการ</Label>
                                        <Textarea 
                                            value={forwardData.comment}
                                            onChange={e => setForwardData('comment', e.target.value)}
                                            placeholder="ระบุข้อความ..."
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsForwardOpen(false)}>ยกเลิก</Button>
                                    <Button onClick={handleForward} disabled={forwardProcessing}>ยืนยันการส่ง</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* 2. Submit to Boss */}
                        <Dialog open={isSubmitBossOpen} onOpenChange={setIsSubmitBossOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    นำเรียน ผอ.
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>นำเรียนผู้อำนวยการ</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>เลือกผู้อำนวยการ/ผู้มีอำนาจ</Label>
                                        <Select onValueChange={(val) => setBossData('boss_id', val)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="เลือกรายชื่อ" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map(u => (
                                                    <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ความเห็นประกอบ</Label>
                                        <Textarea 
                                            value={bossData.comment}
                                            onChange={e => setBossData('comment', e.target.value)}
                                            placeholder="เพื่อโปรดพิจารณา..."
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsSubmitBossOpen(false)}>ยกเลิก</Button>
                                    <Button onClick={handleSubmitBoss} disabled={bossProcessing}>นำเรียน</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* 3. Boss Approve Action */}
                        {pendingAction && (
                            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        สั่งการ/อนุมัติ
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>สั่งการ / อนุมัติหนังสือ</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>ผลการพิจารณา</Label>
                                            <Select defaultValue="approved" onValueChange={(val) => setApproveData('status', val)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="approved">อนุมัติ / ทราบ</SelectItem>
                                                    <SelectItem value="rejected">ไม่อนุมัติ / ตีกลับ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>เกษียนหนังสือ / สั่งการ</Label>
                                            <Textarea 
                                                value={approveData.comment}
                                                onChange={e => setApproveData('comment', e.target.value)}
                                                placeholder="ระบุคำสั่งการ..."
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsApproveOpen(false)}>ยกเลิก</Button>
                                        <Button onClick={handleApprove} disabled={approveProcessing}>บันทึกผล</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* 4. Distribute Circular */}
                        {document.type === 'circular' && document.status !== 'distributed' && (
                            <Button onClick={handleDistributeCircular} disabled={circularProcessing} variant="secondary">
                                <Users className="mr-2 h-4 w-4" />
                                ส่งเวียนแจ้งทราบ
                            </Button>
                        )}

                        {/* 5. Acknowledge Circular */}
                        {document.type === 'circular' && document.status === 'distributed' && isCircularRecipient && !hasRead && (
                            <Button onClick={handleAcknowledge} disabled={ackProcessing} className="bg-green-600 hover:bg-green-700">
                                <Eye className="mr-2 h-4 w-4" />
                                รับทราบ
                            </Button>
                        )}

                        {/* 6. Acknowledge Forwarded Document */}
                        {pendingForwardActions.length > 0 && (
                            <Button 
                                onClick={() => handleAcknowledgeDocument(pendingForwardActions[0].id)} 
                                disabled={ackDocumentProcessing}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <CheckCheck className="mr-2 h-4 w-4" />
                                รับทราบหนังสือ
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
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">ประเภทที่มา:</span>
                                        <span className="ml-2 font-medium">
                                            {document.origin_type === 'internal' ? 'ภายใน' : 'ภายนอก'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">ประเภทเอกสาร:</span>
                                        <span className="ml-2 font-medium">
                                            {document.type === 'circular' ? 'หนังสือเวียน' : 'หนังสือปกติ'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">ผู้สร้าง:</span>
                                        <span className="ml-2">{document.creator?.name}</span>
                                    </div>
                                    {document.department && (
                                        <div>
                                            <span className="text-muted-foreground">หน่วยงาน:</span>
                                            <span className="ml-2">{document.department.name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-medium mb-2">รายละเอียด</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{document.description || '-'}</p>
                                </div>

                                {document.file_path && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-medium mb-2">ไฟล์แนบ</h3>
                                        <a 
                                            href={`/storage/${document.file_path}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-600 hover:underline p-3 border rounded-md bg-blue-50 w-fit"
                                        >
                                            <FileText className="h-5 w-5" />
                                            เปิดดูไฟล์แนบ
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timeline / Action History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">ประวัติการดำเนินการ</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative border-l border-gray-200 ml-3 space-y-6">
                                    {document.actions.map((action, index) => (
                                        <div key={action.id} className="mb-8 ml-6">
                                            <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
                                                <div className={`w-2 h-2 rounded-full ${action.status === 'completed' || action.acknowledged_at ? 'bg-blue-600' : 'bg-gray-300'}`} />
                                            </span>
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                                <div>
                                                    <h3 className="text-base font-semibold text-gray-900">
                                                        {action.action_type === 'register' && 'ลงทะเบียนรับ'}
                                                        {action.action_type === 'forward' && `ส่งต่อให้แผนก ${action.receiver_department?.name || ''}`}
                                                        {action.action_type === 'submit_boss' && `นำเรียน ${action.receiver_user?.name || ''}`}
                                                        {action.action_type === 'approve' && 'อนุมัติ/สั่งการ'}
                                                        {action.action_type === 'reject' && 'ตีกลับ/ไม่อนุมัติ'}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        โดย: {action.sender?.name}
                                                    </p>
                                                    {action.comment && (
                                                        <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700 border">
                                                            "{action.comment}"
                                                        </div>
                                                    )}
                                                    
                                                    {/* Acknowledgment Status for forwarded documents */}
                                                    {action.action_type === 'forward' && (
                                                        <div className="mt-2">
                                                            {action.acknowledged_at ? (
                                                                <Badge className="bg-green-100 text-green-800 gap-1">
                                                                    <CheckCheck className="w-3 h-3" />
                                                                    รับทราบแล้ว โดย {action.acknowledged_by_user?.name || 'ผู้รับ'}
                                                                    <span className="text-xs ml-1">
                                                                        ({new Date(action.acknowledged_at).toLocaleString('th-TH')})
                                                                    </span>
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    รอรับทราบ
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <time className="mb-1 text-xs font-normal text-gray-400 sm:order-last sm:mb-0">
                                                    {new Date(action.created_at).toLocaleString('th-TH')}
                                                </time>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Circular Status */}
                        {document.type === 'circular' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">การรับทราบ (หนังสือเวียน)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span>ทั้งหมด</span>
                                            <span className="font-medium">{document.circular_recipients?.length || 0} คน</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>รับทราบแล้ว</span>
                                            <span className="font-medium">
                                                {document.circular_recipients?.filter(r => r.read_at).length || 0} คน
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-green-500" 
                                                style={{ 
                                                    width: `${((document.circular_recipients?.filter(r => r.read_at).length || 0) / (document.circular_recipients?.length || 1)) * 100}%` 
                                                }} 
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
