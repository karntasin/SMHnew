import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface AuditDetail {
  id?: number;
  category: string;
  item_code: string;
  item_description: string;
  is_correct: boolean;
  correct_value: string;
  error_type: string;
  auditor_comment: string;
}

interface Audit {
  id: number;
  vn: string;
  an: string;
  hn: string;
  patient_name: string;
  visit_date: string;
  doctor_name: string;
  department: string;
  status: 'pending' | 'audited' | 'corrected';
  summary_notes: string;
  details: AuditDetail[];
}

interface Props {
  audit: Audit;
}

export default function MraShow({ audit }: Props) {
  const [details, setDetails] = useState<AuditDetail[]>(audit.details || []);
  const [summaryNotes, setSummaryNotes] = useState(audit.summary_notes || '');
  const [status, setStatus] = useState(audit.status);

  const handleAddDetail = () => {
    setDetails([
      ...details,
      {
        category: 'Principal Diagnosis',
        item_code: '',
        item_description: '',
        is_correct: true,
        correct_value: '',
        error_type: '',
        auditor_comment: '',
      },
    ]);
  };

  const handleRemoveDetail = (index: number) => {
    const newDetails = [...details];
    newDetails.splice(index, 1);
    setDetails(newDetails);
  };

  const handleDetailChange = (index: number, field: keyof AuditDetail, value: any) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setDetails(newDetails);
  };

  const handleSave = () => {
    router.put(`/mra/${audit.id}`, {
      status,
      summary_notes: summaryNotes,
      details, // In a real app, we'd handle syncing properly
    }, {
        onSuccess: () => {
            // Optional: Show toast
        }
    });
  };

  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '#' },
    { title: 'MRA', href: '/mra' },
    { title: `Audit: ${audit.hn}`, href: '#' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Audit - ${audit.patient_name}`} />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/mra">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ตรวจสอบเวชระเบียน (Audit)</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{audit.patient_name}</span>
                <span>•</span>
                <span>HN: {audit.hn}</span>
                <span>•</span>
                <span>{new Date(audit.visit_date).toLocaleDateString('th-TH')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                <SelectItem value="audited">ตรวจสอบแล้ว</SelectItem>
                <SelectItem value="corrected">แก้ไขแล้ว</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> บันทึกผล
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info Card */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>ข้อมูลทั่วไป</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">VN:</span>
                <span className="font-medium">{audit.vn || '-'}</span>
                <span className="text-muted-foreground">AN:</span>
                <span className="font-medium">{audit.an || '-'}</span>
                <span className="text-muted-foreground">แพทย์:</span>
                <span className="font-medium">{audit.doctor_name || '-'}</span>
                <span className="text-muted-foreground">แผนก:</span>
                <span className="font-medium">{audit.department || '-'}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>สรุปผลการตรวจสอบ (Summary Notes)</Label>
                <Textarea
                  rows={5}
                  placeholder="บันทึกข้อคิดเห็นเพิ่มเติม..."
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audit Details (Coding & Review) */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>รายการตรวจสอบ (Audit Items)</CardTitle>
                <CardDescription>ตรวจสอบความถูกต้องของการให้รหัส (Coding) และการบันทึกข้อมูล</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddDetail}>
                <Plus className="mr-2 h-4 w-4" /> เพิ่มรายการ
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {details.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    ยังไม่มีรายการตรวจสอบ กด "เพิ่มรายการ" เพื่อเริ่มบันทึก
                  </div>
                ) : (
                  details.map((detail, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4 bg-muted/10">
                      <div className="flex justify-between items-start">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 mr-4">
                          <div className="space-y-2">
                            <Label>หมวดหมู่ (Category)</Label>
                            <Select
                              value={detail.category}
                              onValueChange={(val) => handleDetailChange(index, 'category', val)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Principal Diagnosis">Principal Diagnosis (การวินิจฉัยหลัก)</SelectItem>
                                <SelectItem value="Comorbidity">Comorbidity (โรคแทรกซ้อน)</SelectItem>
                                <SelectItem value="Procedure">Procedure (หัตถการ)</SelectItem>
                                <SelectItem value="Discharge Status">Discharge Status (สถานะจำหน่าย)</SelectItem>
                                <SelectItem value="Other">Other (อื่นๆ)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>รหัส / รายการ (Code/Item)</Label>
                            <Input
                              placeholder="เช่น E11.9, Appendectomy"
                              value={detail.item_code}
                              onChange={(e) => handleDetailChange(index, 'item_code', e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-red-600"
                          onClick={() => handleRemoveDetail(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Button
                                type="button"
                                variant={detail.is_correct ? 'default' : 'outline'}
                                className={detail.is_correct ? 'bg-green-600 hover:bg-green-700' : ''}
                                onClick={() => handleDetailChange(index, 'is_correct', true)}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" /> ถูกต้อง
                            </Button>
                            <Button
                                type="button"
                                variant={!detail.is_correct ? 'destructive' : 'outline'}
                                onClick={() => handleDetailChange(index, 'is_correct', false)}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> ไม่ถูกต้อง
                            </Button>
                        </div>
                      </div>

                      {!detail.is_correct && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 p-3 rounded-md border border-red-100 dark:bg-red-900/20 dark:border-red-900">
                          <div className="space-y-2">
                            <Label className="text-red-700 dark:text-red-300">ประเภทความผิดพลาด</Label>
                            <Select
                              value={detail.error_type}
                              onValueChange={(val) => handleDetailChange(index, 'error_type', val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกประเภท..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Wrong Code">Wrong Code (ให้รหัสผิด)</SelectItem>
                                <SelectItem value="Missed Code">Missed Code (ตกหล่น)</SelectItem>
                                <SelectItem value="Unsupported Diagnosis">Unsupported Diagnosis (หลักฐานไม่พอ)</SelectItem>
                                <SelectItem value="Wrong Sequencing">Wrong Sequencing (เรียงลำดับผิด)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-red-700 dark:text-red-300">ค่าที่ถูกต้อง (Correct Value)</Label>
                            <Input
                              placeholder="ระบุรหัสที่ถูกต้อง..."
                              value={detail.correct_value}
                              onChange={(e) => handleDetailChange(index, 'correct_value', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label className="text-red-700 dark:text-red-300">ความคิดเห็นผู้ตรวจสอบ</Label>
                            <Input
                              placeholder="อธิบายเพิ่มเติม..."
                              value={detail.auditor_comment}
                              onChange={(e) => handleDetailChange(index, 'auditor_comment', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
