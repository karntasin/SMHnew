import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BreadcrumbItem } from '@/types';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Send, User, Calendar, FileText,
  Phone, MapPin, UserCheck, Ban, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'งานธุรการ', href: '/admin-hub' },
  { title: 'ระบบบันทึกการลา', href: route('leave.index') },
  { title: 'รายละเอียดใบลา', href: '#' },
];

interface UserData { id: number; name: string; position?: string; department?: { name: string } | null }
interface LeaveType { id: number; name: string; code: string; form_number?: string | null; form_code?: string | null }
interface Approval { id: number; step: number; role_label: string; approver?: UserData | null; action: string; comment?: string; acted_at?: string }
interface LeaveData {
  id: number; request_number: string; user: UserData; leave_type: LeaveType;
  start_date: string; end_date: string; total_days: number; reason: string;
  contact_address?: string; contact_phone?: string; delegate_name?: string;
  written_at?: string; addressee?: string; destination?: string; return_date?: string;
  status: string; attachment_path?: string; admin_note?: string;
  submitted_at?: string; completed_at?: string; created_at: string;
  approvals: Approval[];
}

interface BalanceSnapshot {
  year: number;
  leave_type?: string | null;
  entitled_days: number;
  used_days: number;
  carry_over_days: number;
  remaining_days: number;
  requested_days: number;
  after_days: number;
  insufficient: boolean;
}

interface Props {
  leave: LeaveData;
  canApprove: boolean;
  canReviewHr: boolean;
  canCancel: boolean;
  isHr: boolean;
  viewerId: number;
  directors: UserData[];
  balance: BalanceSnapshot;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}

const colorMap: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700', amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-600',
};

const stepIcons: Record<string, typeof CheckCircle2> = {
  approved: CheckCircle2, rejected: XCircle, pending: Clock,
};

const stepColors: Record<string, string> = {
  approved: 'text-green-500', rejected: 'text-red-500', pending: 'text-amber-500',
};

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function LeaveShow({
  leave, canApprove, canReviewHr = false, canCancel, viewerId, directors = [], balance,
  statusLabels, statusColors,
}: Props) {
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [directorId, setDirectorId] = useState(
    directors.length === 1 ? String(directors[0].id) : '',
  );
  const [processing, setProcessing] = useState(false);
  const cancelForm = useForm({});

  const assignedToMe = leave.approvals.some(
    (a) => a.action === 'pending' && Number(a.approver?.id) === Number(viewerId),
  );
  const showDecisionButtons = (canApprove || assignedToMe) && !canReviewHr;

  const submitDecision = (action: 'approved' | 'rejected', reason?: string) => {
    setProcessing(true);
    router.post(route('leave.approve', leave.id), {
      action,
      comment: reason ?? comment,
    }, {
      onFinish: () => setProcessing(false),
    });
  };

  const handleForward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directorId) return;
    setProcessing(true);
    router.post(route('leave.forward-director', leave.id), {
      director_id: directorId,
      comment,
    }, {
      onFinish: () => setProcessing(false),
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`ใบลา ${leave.request_number}`} />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <Link href={route('leave.index')}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปยังรายการ
            </Link>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold">ใบลาเลขที่ {leave.request_number}</h1>
                <p className="text-muted-foreground text-sm">ยื่นเมื่อ {formatDateTime(leave.submitted_at || leave.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('text-sm px-3 py-1', colorMap[statusColors[leave.status] || 'gray'])}>
                  {statusLabels[leave.status] || leave.status}
                </Badge>
                <a href={route('leave.pdf', leave.id)} target="_blank">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> ดาวน์โหลด PDF
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-rose-500" /> ข้อมูลการลา
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground mb-1 flex items-center gap-1"><User className="h-3.5 w-3.5" /> ผู้ขอลา</dt>
                      <dd className="font-medium">{leave.user.name}</dd>
                      {leave.user.position && <dd className="text-xs text-muted-foreground">{leave.user.position}</dd>}
                      {leave.user.department?.name && <dd className="text-xs text-muted-foreground">{leave.user.department.name}</dd>}
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-1">ประเภทการลา</dt>
                      <dd className="font-medium">{leave.leave_type.name}</dd>
                      {(leave.leave_type.form_number || leave.leave_type.form_code) && (
                        <dd className="text-xs text-muted-foreground">
                          {[leave.leave_type.form_number, leave.leave_type.form_code].filter(Boolean).join(' · ')}
                        </dd>
                      )}
                    </div>
                    {leave.addressee && (
                      <div>
                        <dt className="text-muted-foreground mb-1">เรียน</dt>
                        <dd>{leave.addressee}</dd>
                      </div>
                    )}
                    {leave.written_at && (
                      <div>
                        <dt className="text-muted-foreground mb-1">เขียนที่</dt>
                        <dd>{leave.written_at}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> วันที่ลา</dt>
                      <dd className="font-medium">{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-1">จำนวนวันลา</dt>
                      <dd className="text-xl font-bold text-rose-600">{leave.total_days} วัน</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground mb-1">เหตุผลการลา</dt>
                      <dd className="font-medium whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{leave.reason}</dd>
                    </div>
                    {leave.destination && (
                      <div>
                        <dt className="text-muted-foreground mb-1">สถานที่ / จังหวัดที่จะไป</dt>
                        <dd>{leave.destination}</dd>
                      </div>
                    )}
                    {leave.return_date && (
                      <div>
                        <dt className="text-muted-foreground mb-1">วันที่กลับ</dt>
                        <dd>{formatDate(leave.return_date)}</dd>
                      </div>
                    )}
                    {leave.contact_address && (
                      <div>
                        <dt className="text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> ที่อยู่ระหว่างลา</dt>
                        <dd>{leave.contact_address}</dd>
                      </div>
                    )}
                    {leave.contact_phone && (
                      <div>
                        <dt className="text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> เบอร์ติดต่อ</dt>
                        <dd>{leave.contact_phone}</dd>
                      </div>
                    )}
                    {leave.delegate_name && (
                      <div>
                        <dt className="text-muted-foreground mb-1 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> ผู้ปฏิบัติราชการแทน</dt>
                        <dd>{leave.delegate_name}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Supervisor / Director decision */}
              {showDecisionButtons && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-amber-800">
                      {leave.status === 'pending_director' ? 'ผู้อำนวยการพิจารณาอนุมัติ' : 'พิจารณาอนุมัติ'}
                    </CardTitle>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-5 space-y-4">
                    <div className="space-y-2">
                      <Label>ความเห็น (ถ้ามี)</Label>
                      <Textarea rows={2} value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="ความเห็นเพิ่มเติม..." />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => submitDecision('approved')} disabled={processing}
                        className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> อนุมัติ
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={processing}>
                            <XCircle className="mr-2 h-4 w-4" /> ไม่อนุมัติ
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันไม่อนุมัติ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ใบลาจะถูกตีกลับไปยังเจ้าของใบลา และแจ้งให้ผู้ขอลาทราบ
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-2">
                            <Label>เหตุผล (ไม่บังคับ)</Label>
                            <Textarea rows={3} value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="ระบุเหตุผลที่ไม่อนุมัติ..." />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => submitDecision('rejected', rejectReason)}
                              className="bg-red-600 hover:bg-red-700">
                              ยืนยันไม่อนุมัติ
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              )}

              {canReviewHr && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-800">ฝ่ายธุรการและกำลังพลตรวจสอบ</CardTitle>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-5 space-y-4">
                    <div className={cn(
                      'rounded-lg border p-3 text-sm',
                      balance.insufficient ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-white',
                    )}>
                      <p className="font-medium mb-2">วันลาคงเหลือ ปี {balance.year + 543} · {balance.leave_type || 'ประเภทนี้'}</p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <dt className="text-muted-foreground">สิทธิ์</dt>
                        <dd>{balance.entitled_days} วัน</dd>
                        <dt className="text-muted-foreground">ยกมา</dt>
                        <dd>{balance.carry_over_days} วัน</dd>
                        <dt className="text-muted-foreground">ใช้ไปแล้ว</dt>
                        <dd>{balance.used_days} วัน</dd>
                        <dt className="text-muted-foreground">คงเหลือ</dt>
                        <dd className="font-semibold">{balance.remaining_days} วัน</dd>
                        <dt className="text-muted-foreground">ขอครั้งนี้</dt>
                        <dd className="font-semibold">{balance.requested_days} วัน</dd>
                        <dt className="text-muted-foreground">คงเหลือหลังอนุมัติ</dt>
                        <dd className={cn('font-semibold', balance.insufficient && 'text-red-700')}>{balance.after_days} วัน</dd>
                      </dl>
                      {balance.insufficient && (
                        <p className="mt-2 text-xs">วันลาคงเหลือไม่พอตามที่ขอ กรุณาตรวจสอบก่อนส่งต่อ หรือตีกลับผู้ขอ</p>
                      )}
                    </div>
                    <form onSubmit={handleForward} className="space-y-4">
                      <div className="space-y-2">
                        <Label>เลือกผู้อำนวยการ <span className="text-red-500">*</span></Label>
                        <Select value={directorId} onValueChange={setDirectorId}>
                          <SelectTrigger><SelectValue placeholder="เลือกผู้ลงนาม" /></SelectTrigger>
                          <SelectContent>
                            {directors.map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.name} {u.position ? `(${u.position})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ความเห็นธุรการ (ถ้ามี)</Label>
                        <Textarea rows={2} value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="ผลการตรวจสอบวันลา..." />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button type="submit" disabled={processing || !directorId} className="bg-blue-600 hover:bg-blue-700">
                          <Send className="mr-2 h-4 w-4" /> ตรวจสอบแล้วส่งผู้อำนวยการ
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" disabled={processing}>
                              <XCircle className="mr-2 h-4 w-4" /> ตีกลับผู้ขอ
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ตีกลับใบลา?</AlertDialogTitle>
                              <AlertDialogDescription>
                                ใบลาจะถูกส่งกลับไปยังเจ้าของใบลา
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                              <Label>เหตุผล (ไม่บังคับ)</Label>
                              <Textarea rows={3} value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="เช่น จำนวนวันลาไม่ถูกต้อง หรือวันลาคงเหลือไม่พอ" />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => submitDecision('rejected', rejectReason)}
                                className="bg-red-600 hover:bg-red-700">
                                ยืนยันตีกลับ
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {canCancel && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      <Ban className="mr-2 h-4 w-4" /> ยกเลิกใบลา
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันยกเลิกใบลา?</AlertDialogTitle>
                      <AlertDialogDescription>ใบลานี้จะถูกยกเลิกและไม่สามารถย้อนกลับได้</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelForm.post(route('leave.cancel', leave.id))}
                        className="bg-red-600 hover:bg-red-700">
                        ยืนยันยกเลิก
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Right: Timeline */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ขั้นตอนการอนุมัติ</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5">
                  <div className="relative space-y-6">
                    {leave.approvals.map((a, i) => {
                      const Icon = stepIcons[a.action] || Clock;
                      const iconColor = stepColors[a.action] || 'text-gray-400';
                      return (
                        <div key={a.id} className="relative flex gap-3">
                          {i < leave.approvals.length - 1 && (
                            <div className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-slate-200" />
                          )}
                          <div className="relative z-10 shrink-0">
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center bg-white border-2',
                              a.action === 'approved' ? 'border-green-400' :
                              a.action === 'rejected' ? 'border-red-400' : 'border-amber-300')}>
                              <Icon className={cn('h-3.5 w-3.5', iconColor)} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <p className="text-sm font-medium">{a.role_label}</p>
                            {a.approver && (
                              <p className="text-xs text-muted-foreground">{a.approver.name}</p>
                            )}
                            {!a.approver && a.action === 'pending' && (
                              <p className="text-xs text-muted-foreground">รอเจ้าหน้าที่แผนกดำเนินการ</p>
                            )}
                            {a.action !== 'pending' && (
                              <Badge variant="outline" className={cn('text-xs mt-1',
                                a.action === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                'bg-red-50 text-red-700 border-red-200')}>
                                {a.action === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
                              </Badge>
                            )}
                            {a.action === 'pending' && (
                              <Badge variant="outline" className="text-xs mt-1 bg-amber-50 text-amber-700 border-amber-200">
                                รอดำเนินการ
                              </Badge>
                            )}
                            {a.comment && (
                              <p className="text-xs text-muted-foreground mt-1 italic">"{a.comment}"</p>
                            )}
                            {a.acted_at && (
                              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(a.acted_at)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Future steps */}
                    {leave.status !== 'approved' && leave.status !== 'rejected' && leave.status !== 'cancelled' && (
                      <>
                        {!leave.approvals.find(a => a.step === 2) && (
                          <div className="flex gap-3 opacity-40">
                            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                              <Clock className="h-3 w-3 text-slate-400" />
                            </div>
                            <div><p className="text-sm">ฝ่ายธุรการและกำลังพล</p></div>
                          </div>
                        )}
                        {!leave.approvals.find(a => a.step === 3) && (
                          <div className="flex gap-3 opacity-40">
                            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                              <Clock className="h-3 w-3 text-slate-400" />
                            </div>
                            <div><p className="text-sm">ผู้อำนวยการลงนาม</p></div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
