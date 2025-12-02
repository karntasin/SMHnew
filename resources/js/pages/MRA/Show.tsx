import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  MinusCircle,
  User,
  Calendar,
  Activity,
  Stethoscope,
  FileText,
  ClipboardCheck,
  BarChart3,
  Clock,
  AlertTriangle,
  Sparkles,
  Heart,
  TrendingUp,
  Award,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Criteria {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  max_score: number;
}

interface Category {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  criteria: Criteria[];
}

interface AuditDetail {
  id: number;
  mra_criteria_id: number;
  result: 'pass' | 'fail' | 'na' | 'pending';
  hosxp_value: string | null;
  auditor_comment: string | null;
  score: number;
  criteria?: Criteria;
}

interface Audit {
  id: number;
  vn: string;
  an: string | null;
  hn: string;
  patient_name: string;
  visit_date: string;
  doctor_name: string | null;
  department: string | null;
  audit_type: 'opd' | 'ipd';
  status: 'pending' | 'in_progress' | 'audited' | 'corrected';
  summary_notes: string | null;
  accuracy_percentage: number;
  total_items: number;
  correct_items: number;
  chief_complaint: string | null;
  pdx: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  auditor?: { name: string };
  audited_at: string | null;
  details: AuditDetail[];
}

interface Props {
  audit: Audit;
  categories: Category[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  'CAT01': <User className="h-5 w-5" />,
  'CAT02': <FileText className="h-5 w-5" />,
  'CAT03': <Activity className="h-5 w-5" />,
  'CAT04': <Stethoscope className="h-5 w-5" />,
  'CAT05': <ClipboardCheck className="h-5 w-5" />,
  'CAT06': <FileText className="h-5 w-5" />,
  'CAT07': <FileText className="h-5 w-5" />,
  'CAT08': <CheckCircle2 className="h-5 w-5" />,
  'CAT09': <FileText className="h-5 w-5" />,
};

export default function MraShow({ audit, categories }: Props) {
  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '/quality' },
    { title: 'MRA', href: '/mra' },
    { title: `#${audit.id}`, href: '#' },
  ];

  // Group details by category
  const detailsByCategory = useMemo(() => {
    const map: Record<number, AuditDetail[]> = {};
    
    categories.forEach(cat => {
      map[cat.id] = [];
    });

    audit.details?.forEach(detail => {
      const criteria = categories.flatMap(c => c.criteria).find(cr => cr.id === detail.mra_criteria_id);
      if (criteria) {
        const category = categories.find(c => c.criteria.some(cr => cr.id === criteria.id));
        if (category) {
          map[category.id] = map[category.id] || [];
          map[category.id].push({ ...detail, criteria });
        }
      }
    });

    return map;
  }, [audit.details, categories]);

  // Calculate category scores
  const categoryScores = useMemo(() => {
    const scores: Record<number, { pass: number; fail: number; na: number; total: number; maxScore: number; obtainedScore: number }> = {};
    
    categories.forEach(cat => {
      const details = detailsByCategory[cat.id] || [];
      const pass = details.filter(d => d.result === 'pass').length;
      const fail = details.filter(d => d.result === 'fail').length;
      const na = details.filter(d => d.result === 'na').length;
      const maxScore = details.filter(d => d.result !== 'na').reduce((sum, d) => sum + (d.criteria?.max_score || 0), 0);
      const obtainedScore = details.filter(d => d.result === 'pass').reduce((sum, d) => sum + (d.criteria?.max_score || 0), 0);
      
      scores[cat.id] = { pass, fail, na, total: cat.criteria.length, maxScore, obtainedScore };
    });

    return scores;
  }, [detailsByCategory, categories]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />รอตรวจสอบ</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">กำลังตรวจสอบ</Badge>;
      case 'audited':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />ตรวจสอบแล้ว</Badge>;
      case 'corrected':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">แก้ไขแล้ว</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'na':
        return <MinusCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // TODO: Implement PDF export
    alert('Export PDF feature coming soon!');
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`ผลการตรวจสอบ - ${audit.hn}`} />

      <div className="space-y-6 print:p-0">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-8 text-white shadow-xl print:hidden">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-4">
              <Link href="/mra">
                <Button variant="secondary" size="icon" className="bg-white/20 hover:bg-white/30 border-white/30 backdrop-blur-sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  ผลการตรวจสอบเวชระเบียน
                  <Sparkles className="h-6 w-6 text-yellow-300" />
                </h1>
                <div className="flex items-center gap-3 mt-2 text-cyan-100">
                  <span className="font-semibold">{audit.patient_name}</span>
                  <span className="opacity-50">•</span>
                  <span className="font-mono bg-white/20 px-2 py-0.5 rounded">HN: {audit.hn}</span>
                  <span className="opacity-50">•</span>
                  <span className="font-mono bg-white/20 px-2 py-0.5 rounded">VN: {audit.vn}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(audit.status === 'pending' || audit.status === 'in_progress') && (
                <Link href={`/mra/${audit.id}/audit`}>
                  <Button className="bg-white text-teal-700 hover:bg-teal-50 shadow-lg">
                    <Edit className="mr-2 h-4 w-4" /> ตรวจสอบ
                  </Button>
                </Link>
              )}
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> พิมพ์
              </Button>
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-xl font-bold">รายงานผลการตรวจสอบคุณภาพเวชระเบียน (MRA)</h1>
          <p className="text-sm">ตามเกณฑ์ สรพ. 2563</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-6">
          {/* Patient Info */}
          <Card className="lg:col-span-1 border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                </div>
                ข้อมูลผู้ป่วย
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pt-4">
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-muted-foreground">HN:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{audit.hn}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-muted-foreground">VN:</span>
                <span className="font-mono">{audit.vn}</span>
              </div>
              {audit.an && (
                <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <span className="text-muted-foreground">AN:</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400">{audit.an}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ชื่อ:</span>
                <span className="font-medium">{audit.patient_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">วันที่:</span>
                <span>{new Date(audit.visit_date).toLocaleDateString('th-TH')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ประเภท:</span>
                <Badge variant="outline" className={cn(
                  "font-semibold",
                  audit.audit_type === 'opd' 
                    ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400"
                )}>
                  {audit.audit_type.toUpperCase()}
                </Badge>
              </div>
              {audit.doctor_name && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">แพทย์:</span>
                  <span>{audit.doctor_name}</span>
                </div>
              )}
              <Separator />
              {audit.chief_complaint && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-muted-foreground text-xs">Chief Complaint:</span>
                  <p className="mt-1 font-medium">{audit.chief_complaint}</p>
                </div>
              )}
              {audit.pdx && (
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <span className="text-muted-foreground text-xs">Principal Diagnosis:</span>
                  <p className="mt-1 font-medium text-green-700 dark:text-green-400">{audit.pdx}</p>
                </div>
              )}
              {audit.bp_systolic && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Heart className="h-3 w-3" /> Vital Signs:
                  </span>
                  <p className="mt-1 text-xs font-medium">
                    BP {audit.bp_systolic}/{audit.bp_diastolic} mmHg, 
                    P {audit.pulse}/min,
                    T {audit.temperature}°C,
                    RR {audit.respiratory_rate}/min
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Summary */}
          <Card className="lg:col-span-3 border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-2 bg-cyan-200 dark:bg-cyan-800 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  สรุปผลการตรวจสอบ
                </CardTitle>
                {getStatusBadge(audit.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={cn(
                  "text-center p-4 rounded-xl border-2 transition-all hover:shadow-lg",
                  Number(audit.accuracy_percentage || 0) >= 90 
                    ? "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-800"
                    : Number(audit.accuracy_percentage || 0) >= 70
                    ? "bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 dark:from-yellow-900/30 dark:to-amber-900/30 dark:border-yellow-800"
                    : "bg-gradient-to-br from-red-50 to-rose-100 border-red-200 dark:from-red-900/30 dark:to-rose-900/30 dark:border-red-800"
                )}>
                  <Award className={cn(
                    "h-8 w-8 mx-auto mb-2",
                    Number(audit.accuracy_percentage || 0) >= 90 ? "text-green-500" :
                    Number(audit.accuracy_percentage || 0) >= 70 ? "text-yellow-500" : "text-red-500"
                  )} />
                  <div className={cn(
                    "text-3xl font-bold",
                    Number(audit.accuracy_percentage || 0) >= 90 ? "text-green-600 dark:text-green-400" :
                    Number(audit.accuracy_percentage || 0) >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {Number(audit.accuracy_percentage || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">ความถูกต้อง</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border-2 border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{audit.correct_items || 0}</div>
                  <div className="text-xs text-muted-foreground font-medium">ผ่าน</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-xl border-2 border-red-200 dark:border-red-800 hover:shadow-lg transition-all">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {(audit.total_items || 0) - (audit.correct_items || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">ไม่ผ่าน</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-800 dark:to-gray-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                  <div className="text-3xl font-bold">{audit.total_items || 0}</div>
                  <div className="text-xs text-muted-foreground">รายการทั้งหมด</div>
                </div>
              </div>

              {/* Category Progress */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">คะแนนรายหมวด</h4>
                {categories.map(category => {
                  const score = categoryScores[category.id];
                  const percentage = score?.maxScore > 0 ? (score.obtainedScore / score.maxScore) * 100 : 0;
                  
                  return (
                    <div key={category.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {categoryIcons[category.code] || <FileText className="h-4 w-4" />}
                          <span className="truncate">{category.name}</span>
                        </div>
                        <span className={cn(
                          "font-medium",
                          percentage >= 90 ? "text-green-600" :
                          percentage >= 70 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {score?.obtainedScore || 0}/{score?.maxScore || 0} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>

              {/* Auditor Info */}
              {audit.auditor && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  <span>ตรวจสอบโดย: <strong>{audit.auditor.name}</strong></span>
                  {audit.audited_at && (
                    <span className="ml-4">
                      เมื่อ: {new Date(audit.audited_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results by Category */}
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียดการตรวจสอบ</CardTitle>
            <CardDescription>
              ผลการตรวจสอบตามเกณฑ์คุณภาพเวชระเบียน สรพ. 2563
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={categories[0]?.code || 'all'} className="w-full">
              <TabsList className="flex-wrap h-auto">
                {categories.map(category => {
                  const score = categoryScores[category.id];
                  const hasErrors = score?.fail > 0;
                  
                  return (
                    <TabsTrigger key={category.code} value={category.code} className="relative">
                      {category.code}
                      {hasErrors && (
                        <AlertTriangle className="h-3 w-3 text-red-500 ml-1" />
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {categories.map(category => (
                <TabsContent key={category.code} value={category.code} className="mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    {categoryIcons[category.code]}
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <Badge variant="outline">{category.name_en}</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">รหัส</TableHead>
                        <TableHead>รายการ</TableHead>
                        <TableHead className="w-32">ค่าจาก HOSxP</TableHead>
                        <TableHead className="w-24 text-center">ผล</TableHead>
                        <TableHead className="w-20 text-center">คะแนน</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailsByCategory[category.id] || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            ยังไม่มีข้อมูลการตรวจสอบ
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detailsByCategory[category.id] || []).map(detail => (
                          <TableRow key={detail.id} className={cn(
                            detail.result === 'fail' && "bg-red-50 dark:bg-red-900/20"
                          )}>
                            <TableCell className="font-mono text-xs">
                              {detail.criteria?.code}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{detail.criteria?.name}</div>
                              {detail.criteria?.name_en && (
                                <div className="text-xs text-muted-foreground">{detail.criteria.name_en}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {detail.hosxp_value ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {detail.hosxp_value}
                                </code>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {getResultIcon(detail.result)}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {detail.result === 'na' ? '-' : (
                                <span className={detail.result === 'pass' ? 'text-green-600' : 'text-red-600'}>
                                  {detail.result === 'pass' ? detail.criteria?.max_score : 0}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {detail.auditor_comment || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Summary Notes */}
        {audit.summary_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">หมายเหตุสรุป</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{audit.summary_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between print:hidden">
          <Link href="/mra">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับ
            </Button>
          </Link>
          <div className="flex gap-2">
            {(audit.status === 'pending' || audit.status === 'in_progress') && (
              <Link href={`/mra/${audit.id}/audit`}>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  ตรวจสอบ
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
