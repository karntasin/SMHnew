import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Package, RotateCcw, Ban, Clock } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
    pending: 'รออนุมัติ', approved: 'รอรับอุปกรณ์', borrowed: 'กำลังยืม', returned: 'คืนแล้ว',
    rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก', overdue: 'เลยกำหนดคืน',
};
const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800',
    borrowed: 'bg-purple-100 text-purple-800', returned: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800', rejected: 'bg-gray-100 text-gray-800',
};

interface Props {
    borrowing: any;
    canManage: boolean;
    statusOptions: Record<string, string>;
}

export default function Show({ borrowing, canManage }: Props) {
    const [rejectOpen, setRejectOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const rejectForm = useForm({ rejection_reason: '' });
    const returnForm = useForm({ condition_on_return: '', notes: '' });
    const issueForm = useForm({ condition_on_borrow: '' });

    const fmt = (d?: string) => d ? new Date(d).toLocaleString('th-TH') : '-';
    const fmtTime = (t?: string) => t ? t.slice(0, 5) : '-';
    const fmtSchedule = (date?: string, time?: string) => {
        if (!date) return '-';
        const d = new Date(date).toLocaleDateString('th-TH');
        const t = time ? time.slice(0, 5) : '';
        return t ? `${d} ${t} น.` : d;
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ยืมอุปกรณ์แพทย์', href: route('equipment-borrowing.dashboard') },
            { title: borrowing.borrowing_number, href: '#' },
        ]}>
            <Head title={borrowing.borrowing_number} />

            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{borrowing.borrowing_number}</h1>
                        <Badge className={`mt-2 ${STATUS_COLORS[borrowing.status] || ''}`}>{STATUS_LABELS[borrowing.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canManage && borrowing.status === 'pending' && (
                            <>
                                <Button onClick={() => router.post(route('equipment-borrowing.borrowings.approve', borrowing.id))}>
                                    <Check className="mr-2 h-4 w-4" />อนุมัติ
                                </Button>
                                <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                                    <X className="mr-2 h-4 w-4" />ปฏิเสธ
                                </Button>
                            </>
                        )}
                        {canManage && borrowing.status === 'approved' && (
                            <Button onClick={() => router.post(route('equipment-borrowing.borrowings.issue', borrowing.id), issueForm.data)}>
                                <Package className="mr-2 h-4 w-4" />มอบอุปกรณ์
                            </Button>
                        )}
                        {canManage && ['borrowed', 'overdue', 'approved'].includes(borrowing.status) && (
                            <Button variant="outline" onClick={() => setReturnOpen(true)}>
                                <RotateCcw className="mr-2 h-4 w-4" />รับคืน
                            </Button>
                        )}
                        {['pending', 'approved'].includes(borrowing.status) && (
                            <Button variant="ghost" onClick={() => router.post(route('equipment-borrowing.borrowings.cancel', borrowing.id))}>
                                <Ban className="mr-2 h-4 w-4" />ยกเลิก
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>ข้อมูลการยืม</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">อุปกรณ์:</span> <strong>{borrowing.equipment?.name}</strong> x{borrowing.quantity}</p>
                            <p><span className="text-muted-foreground">ผู้ยืม:</span> {borrowing.borrower?.name}</p>
                            <p><span className="text-muted-foreground">วัตถุประสงค์:</span> {borrowing.purpose}</p>
                            {borrowing.usage_detail && <p><span className="text-muted-foreground">รายละเอียด:</span> {borrowing.usage_detail}</p>}
                            {borrowing.patient_hn && <p><span className="text-muted-foreground">HN:</span> {borrowing.patient_hn}</p>}
                            {borrowing.ward_location && <p><span className="text-muted-foreground">สถานที่ใช้:</span> {borrowing.ward_location}</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />กำหนดเวลา</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">วันที่ยืม:</span> {fmtSchedule(borrowing.borrow_date, borrowing.borrow_time)}</p>
                            <p><span className="text-muted-foreground">กำหนดคืน:</span> {fmtSchedule(borrowing.expected_return_date, borrowing.expected_return_time)}</p>
                            <p><span className="text-muted-foreground">รับอุปกรณ์จริง:</span> {fmt(borrowing.pickup_at)}</p>
                            <p><span className="text-muted-foreground">คืนจริง:</span> {fmt(borrowing.actual_return_date)}</p>
                            {borrowing.approver && <p><span className="text-muted-foreground">อนุมัติโดย:</span> {borrowing.approver.name}</p>}
                        </CardContent>
                    </Card>
                </div>

                {borrowing.equipment?.image_url && (
                    <img src={borrowing.equipment.image_url} alt="" className="rounded-xl max-h-48 object-cover" />
                )}

                <Card>
                    <CardHeader><CardTitle>ประวัติการดำเนินการ</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {(borrowing.logs || []).map((log: any) => (
                            <div key={log.id} className="flex gap-3 text-sm border-l-2 border-teal-200 pl-4 py-1">
                                <div>
                                    <p className="font-medium">{log.description}</p>
                                    <p className="text-xs text-muted-foreground">{log.user?.name} · {new Date(log.created_at).toLocaleString('th-TH')}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>ปฏิเสธคำขอยืม</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); rejectForm.post(route('equipment-borrowing.borrowings.reject', borrowing.id), { onSuccess: () => setRejectOpen(false) }); }} className="space-y-4">
                        <div><Label>เหตุผล *</Label><Textarea value={rejectForm.data.rejection_reason} onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)} /></div>
                        <Button type="submit" variant="destructive">ยืนยันปฏิเสธ</Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>รับคืนอุปกรณ์</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); returnForm.post(route('equipment-borrowing.borrowings.return', borrowing.id), { onSuccess: () => setReturnOpen(false) }); }} className="space-y-4">
                        <div><Label>สภาพเมื่อคืน</Label><Input value={returnForm.data.condition_on_return} onChange={(e) => returnForm.setData('condition_on_return', e.target.value)} /></div>
                        <div><Label>หมายเหตุ</Label><Textarea value={returnForm.data.notes} onChange={(e) => returnForm.setData('notes', e.target.value)} /></div>
                        <Button type="submit">บันทึกการคืน (คืนสต็อก)</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
