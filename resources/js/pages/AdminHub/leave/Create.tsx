import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, CalendarDays, FileUp, ClipboardList, Info, FileText } from 'lucide-react';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'งานธุรการ', href: '/admin-hub' },
  { title: 'ระบบบันทึกการลา', href: route('leave.index') },
  { title: 'ยื่นใบลา', href: '#' },
];

interface LeaveType {
  id: number;
  code: string;
  form_code: string | null;
  form_number: string | null;
  name: string;
  subject: string | null;
  description: string | null;
  max_days_per_year: number | null;
  requires_document: boolean;
  counts_working_days: boolean;
}
interface UserOption { id: number; name: string; position?: string }
interface BalanceMap { [key: number]: { entitled_days: number; used_days: number; carry_over_days: number; leave_type: { name: string } } }

interface Props {
  leaveTypes: LeaveType[];
  users: UserOption[];
  balances: BalanceMap;
  user: { name: string; position?: string; phone?: string; department?: string };
  defaults: { written_at: string; addressee: string };
}

function reasonLabel(code?: string) {
  if (code === 'SICK') return 'อาการป่วย';
  if (code === 'MATERNITY') return 'รายละเอียดการคลอด';
  if (code === 'PATERNITY') return 'ชื่อภริยา / วันที่คลอด';
  if (code === 'ORDINATION') return 'วัด / พระอุปัชฌาย์';
  if (code === 'HAJJ') return 'รายละเอียดการเดินทาง';
  if (code === 'VACATION') return 'หมายเหตุเพิ่มเติม';
  return 'ความประสงค์ของการลา';
}

function reasonHint(code?: string) {
  if (code === 'SICK') return 'ตามข้อ ๑๔ ต้องกล่าวถึงอาการป่วย กำหนดวันลา และสถานที่พักรักษาตัว';
  if (code === 'PERSONAL') return 'ตามข้อ ๓๑ ต้องกล่าวถึงความประสงค์ กำหนดวันลา และสถานที่ที่ทางราชการติดต่อได้';
  if (code === 'VACATION') return 'ตามแบบ ๖ ระบุจังหวัดที่จะไป และวันเดินทางกลับ';
  return 'กรอกข้อความตามแบบพิมพ์ท้ายระเบียบ ทบ. พ.ศ. ๒๕๕๖';
}

export default function LeaveCreate({ leaveTypes, users, balances, user, defaults }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    contact_address: '',
    contact_phone: user.phone || '',
    delegate_name: '',
    written_at: defaults.written_at || '',
    addressee: defaults.addressee || 'ผู้อำนวยการ',
    destination: '',
    return_date: '',
    supervisor_id: '',
    attachment: null as File | null,
  });

  const selectedType = useMemo(
    () => leaveTypes.find((t) => String(t.id) === data.leave_type_id),
    [data.leave_type_id, leaveTypes]
  );

  const balance = data.leave_type_id ? balances[Number(data.leave_type_id)] : null;
  const showDestination = ['PERSONAL', 'VACATION', 'ORDINATION', 'HAJJ', 'ABROAD'].includes(selectedType?.code || '');
  const workingOnly = Boolean(selectedType?.counts_working_days);

  const totalDays = useMemo(() => {
    if (!data.start_date || !data.end_date) return 0;
    const s = new Date(data.start_date);
    const e = new Date(data.end_date);
    if (s > e) return 0;
    let days = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const dow = cur.getDay();
      if (!workingOnly || (dow !== 0 && dow !== 6)) days++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(days, 0.5);
  }, [data.start_date, data.end_date, workingOnly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('leave.store'), { forceFormData: true });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="ยื่นใบลา" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href={route('leave.index')}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปยังรายการใบลา
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">ยื่นใบลา</h1>
            <p className="text-muted-foreground">กรอกตามแบบพิมพ์ท้ายระเบียบกองทัพบก ว่าด้วยการลา พ.ศ. ๒๕๕๖</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-t-4 border-t-rose-500 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-rose-500" /> ประเภทการลา
                </CardTitle>
                <CardDescription>เลือกประเภทแล้วระบบจะใช้แบบพิมพ์ ทบ. ที่ถูกต้อง</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label>ประเภทการลา <span className="text-red-500">*</span></Label>
                  <Select value={data.leave_type_id} onValueChange={(v) => setData('leave_type_id', v)}>
                    <SelectTrigger className={errors.leave_type_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="เลือกประเภทการลา" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}{t.form_number ? ` (${t.form_number})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.leave_type_id && <p className="text-sm text-red-500">{errors.leave_type_id}</p>}
                </div>

                {selectedType && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
                    <p className="font-medium text-slate-800">
                      {selectedType.form_number} {selectedType.form_code} — {selectedType.subject}
                    </p>
                    {selectedType.description && (
                      <p className="text-muted-foreground">{selectedType.description}</p>
                    )}
                  </div>
                )}

                {selectedType?.description && !selectedType.form_code && (
                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{selectedType.description}</span>
                  </div>
                )}

                {balance && (
                  <div className="rounded-lg bg-rose-50 p-3 text-sm">
                    <span className="text-muted-foreground">วันลาคงเหลือในปีนี้: </span>
                    <span className="font-bold text-rose-600">
                      {parseFloat(String(balance.entitled_days)) + parseFloat(String(balance.carry_over_days)) - parseFloat(String(balance.used_days))} วัน
                    </span>
                    <span className="text-muted-foreground ml-2">(ใช้แล้ว {balance.used_days} จาก {balance.entitled_days} วัน)</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-rose-500" /> ส่วนหัวใบลา
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>เขียนที่</Label>
                    <Input value={data.written_at} placeholder="หน่วยงานที่เขียนใบลา"
                      onChange={(e) => setData('written_at', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>เรียน <span className="text-red-500">*</span></Label>
                    <Input value={data.addressee} placeholder="เช่น ผู้อำนวยการ"
                      onChange={(e) => setData('addressee', e.target.value)}
                      className={errors.addressee ? 'border-red-500' : ''} />
                    {errors.addressee && <p className="text-sm text-red-500">{errors.addressee}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  ผู้ขอลา: {user.name}{user.position ? ` · ${user.position}` : ''}{user.department ? ` · ${user.department}` : ''}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-rose-500" /> กำหนดวันลา
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ตั้งแต่วันที่ <span className="text-red-500">*</span></Label>
                    <ThaiDatePicker
                      value={data.start_date}
                      onChange={(value) => setData('start_date', value)}
                      placeholder="เลือกวันเริ่มลา"
                      className={errors.start_date ? 'border-red-500' : ''}
                    />
                    {errors.start_date && <p className="text-sm text-red-500">{errors.start_date}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>จนถึงวันที่ <span className="text-red-500">*</span></Label>
                    <ThaiDatePicker
                      value={data.end_date}
                      onChange={(value) => setData('end_date', value)}
                      placeholder="เลือกวันสิ้นสุด"
                      className={errors.end_date ? 'border-red-500' : ''}
                    />
                    {errors.end_date && <p className="text-sm text-red-500">{errors.end_date}</p>}
                  </div>
                </div>
                {showDestination && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{selectedType?.code === 'VACATION' ? 'จังหวัดที่จะไป' : 'สถานที่ระหว่างลา'}</Label>
                      <Input value={data.destination} placeholder="ระบุสถานที่/จังหวัด"
                        onChange={(e) => setData('destination', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>วันที่กลับ</Label>
                      <ThaiDatePicker
                        value={data.return_date}
                        onChange={(value) => setData('return_date', value)}
                        placeholder="เลือกวันที่กลับ"
                      />
                    </div>
                  </div>
                )}
                {totalDays > 0 && (
                  <div className="rounded-lg bg-rose-50 p-3 text-center">
                    <span className="text-sm text-rose-800">มีกำหนด </span>
                    <span className="text-xl font-bold text-rose-600">{totalDays}</span>
                    <span className="text-sm text-rose-800"> {workingOnly ? 'วันทำการ' : 'วัน'}</span>
                    <p className="text-xs text-rose-700 mt-1">
                      {workingOnly
                        ? 'นับเฉพาะวันทำการ ตามข้อ ๑๐ (ลากิจ / ลาพักผ่อน / ลาไปช่วยเหลือภริยาคลอดบุตร)'
                        : 'นับต่อเนื่องรวมวันหยุดราชการที่อยู่ระหว่างวันลา ตามข้อ ๑๐'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">รายละเอียดตามแบบพิมพ์</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label>{reasonLabel(selectedType?.code)} <span className="text-red-500">*</span></Label>
                  <Textarea rows={3} value={data.reason} placeholder={reasonHint(selectedType?.code)}
                    onChange={(e) => setData('reason', e.target.value)}
                    className={errors.reason ? 'border-red-500' : ''} />
                  <p className="text-xs text-muted-foreground">{reasonHint(selectedType?.code)}</p>
                  {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{selectedType?.code === 'SICK' || selectedType?.code === 'MATERNITY' ? 'ที่อยู่ที่พักรักษาตัว' : 'สถานที่ที่ทางราชการติดต่อได้'}</Label>
                    <Input value={data.contact_address} placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด"
                      onChange={(e) => setData('contact_address', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>เบอร์โทรติดต่อ</Label>
                    <Input value={data.contact_phone} placeholder="เบอร์โทรศัพท์"
                      onChange={(e) => setData('contact_phone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ผู้ปฏิบัติราชการแทน</Label>
                  <Input value={data.delegate_name} placeholder="ชื่อผู้ปฏิบัติราชการแทนระหว่างลา (ถ้ามี)"
                    onChange={(e) => setData('delegate_name', e.target.value)} />
                </div>
                {selectedType?.requires_document && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileUp className="h-4 w-4" /> เอกสารแนบ
                    </Label>
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setData('attachment', e.target.files?.[0] || null)}
                      className={errors.attachment ? 'border-red-500' : ''} />
                    <p className="text-xs text-muted-foreground">รองรับ PDF, JPG, PNG ขนาดไม่เกิน 5MB</p>
                    {errors.attachment && <p className="text-sm text-red-500">{errors.attachment}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">เสนอผู้บังคับบัญชาตามลำดับชั้น</CardTitle>
                <CardDescription>ตามข้อ ๖ ให้เสนอต่อผู้บังคับบัญชาตามลำดับชั้นจนถึงผู้มีอำนาจให้ลา</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label>หัวหน้าแผนก (ผู้นำเสนอลำดับแรก) <span className="text-red-500">*</span></Label>
                  <Select value={data.supervisor_id} onValueChange={(v) => setData('supervisor_id', v)}>
                    <SelectTrigger className={errors.supervisor_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="เลือกผู้อนุมัติ" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name} {u.position ? `(${u.position})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.supervisor_id && <p className="text-sm text-red-500">{errors.supervisor_id}</p>}
                </div>

                <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-2">
                  <p className="font-medium text-slate-700">ขั้นตอนตามระเบียบ:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>หัวหน้าแผนกพิจารณา / นำเสนอ</li>
                    <li>ฝ่ายธุรการและกำลังพลตรวจสอบสถิติวันลาปีงบประมาณ</li>
                    <li>ผู้อำนวยการลงนามอนุญาต</li>
                    <li>แจ้งผลให้ผู้ขอลาทราบ</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Link href={route('leave.index')} className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full">ยกเลิก</Button>
              </Link>
              <Button type="submit" disabled={processing} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700">
                {processing ? 'กำลังส่ง...' : (
                  <><Save className="mr-2 h-4 w-4" /> ส่งใบลา</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
