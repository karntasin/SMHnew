import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  MinusCircle,
  User,
  Activity,
  Stethoscope,
  FileText,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  Heart,
  Award,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskPatientName } from '@/lib/pii';
import { QualityPage, Panel, StatusPill, EmptyState } from '@/components/quality/quality-ui';
import MraSubNav, { mraBreadcrumbs } from './MraSubNav';

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
  const breadcrumbs = mraBreadcrumbs({ title: `#${audit.id}`, href: `/mra/${audit.id}` });

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

  const failedItems = useMemo(() => {
    return categories.flatMap((category) =>
      (detailsByCategory[category.id] || [])
        .filter((d) => d.result === 'fail')
        .map((d) => ({
          ...d,
          categoryCode: category.code,
          categoryName: category.name,
        })),
    );
  }, [categories, detailsByCategory]);

  const failCount = useMemo(() => {
    const fromAudit = Math.max(0, (audit.total_items || 0) - (audit.correct_items || 0));
    return fromAudit > 0 ? fromAudit : failedItems.length;
  }, [audit.total_items, audit.correct_items, failedItems.length]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <StatusPill label="รอตรวจสอบ" className="border-amber-200 bg-amber-50 text-amber-700" />;
      case 'in_progress':
        return <StatusPill label="กำลังตรวจสอบ" className="border-sky-200 bg-sky-50 text-sky-700" />;
      case 'audited':
        return <StatusPill label="ตรวจสอบแล้ว" className="border-emerald-200 bg-emerald-50 text-emerald-700" />;
      case 'corrected':
        return <StatusPill label="แก้ไขแล้ว" className="border-violet-200 bg-violet-50 text-violet-700" />;
      default:
        return <StatusPill label={status} className="border-slate-200 bg-slate-50 text-slate-600" />;
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
    window.open(route('mra.export-pdf', audit.id), '_blank');
  };

  const resultLabel = (result: string) => {
    switch (result) {
      case 'pass':
        return 'ผ่าน';
      case 'fail':
        return 'ไม่ผ่าน';
      case 'na':
        return 'N/A';
      default:
        return 'รอตรวจ';
    }
  };

  return (
    <QualityPage
      tone="indigo"
      icon={FileSearch}
      badge="ศูนย์พัฒนาคุณภาพ · MRA"
      title="ผลการตรวจสอบเวชระเบียน"
      subtitle={`${maskPatientName(audit.patient_name)} · HN: ${audit.hn} · VN: ${audit.vn}`}
      breadcrumbs={breadcrumbs}
      headTitle={`ผลการตรวจสอบ - ${audit.hn}`}
      actions={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {(audit.status === 'pending' || audit.status === 'in_progress') && (
            <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Link href={`/mra/${audit.id}/audit`}><Edit className="mr-2 h-4 w-4" />ตรวจสอบ</Link>
            </Button>
          )}
          <Button variant="outline" className="rounded-xl" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />พิมพ์</Button>
          <Button variant="outline" className="rounded-xl" onClick={handleExport}><Download className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      }
      subNav={<MraSubNav active="mra.index" />}
    >
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">รายงานผลการตรวจสอบคุณภาพเวชระเบียน (MRA)</h1>
        <p className="text-sm">ตามเกณฑ์ สรพ. 2563</p>
      </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <Panel title="ข้อมูลผู้ป่วย" className="lg:col-span-1">
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
                <span className="font-medium">{maskPatientName(audit.patient_name)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">วันที่:</span>
                <span>{new Date(audit.visit_date).toLocaleDateString('th-TH')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ประเภท:</span>
                <StatusPill
                  label={audit.audit_type.toUpperCase()}
                  className={audit.audit_type === 'opd' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-violet-200 bg-violet-50 text-violet-700'}
                />
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
          </Panel>

          <Panel className="lg:col-span-3" title="สรุปผลการตรวจสอบ" action={getStatusBadge(audit.status)}>
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
                    {failCount}
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
          </Panel>
        </div>

        <Panel title="รายละเอียดการตรวจสอบ" description="ผลการตรวจสอบตามเกณฑ์คุณภาพเวชระเบียน สรพ. 2563" className="print:hidden">
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
                    <StatusPill label={category.name_en ?? ''} className="border-slate-200 bg-slate-50 text-slate-600" />
                  </div>

                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                        <th className="py-2 pr-3 w-24">รหัส</th>
                        <th className="py-2 pr-3">รายการ</th>
                        <th className="py-2 pr-3 w-32">ค่าจาก HOSxP</th>
                        <th className="py-2 pr-3 w-24 text-center">ผล</th>
                        <th className="py-2 pr-3 w-20 text-center">คะแนน</th>
                        <th className="py-2 pr-3">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailsByCategory[category.id] || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            ยังไม่มีข้อมูลการตรวจสอบ
                          </td>
                        </tr>
                      ) : (
                        (detailsByCategory[category.id] || []).map(detail => (
                          <tr key={detail.id} className={cn('border-b border-slate-50', detail.result === 'fail' && 'bg-rose-50/50')}>
                            <td className="py-2.5 pr-3 font-mono text-xs text-slate-600">{detail.criteria?.code}</td>
                            <td className="py-2.5 pr-3">
                              <div className="font-medium text-slate-800">{detail.criteria?.name}</div>
                              {detail.criteria?.name_en && <div className="text-xs text-slate-400">{detail.criteria.name_en}</div>}
                            </td>
                            <td className="py-2.5 pr-3">
                              {detail.hosxp_value ? <code className="rounded bg-slate-100 px-2 py-1 text-xs">{detail.hosxp_value}</code> : <span className="text-slate-400">-</span>}
                            </td>
                            <td className="py-2.5 pr-3 text-center">{getResultIcon(detail.result)}</td>
                            <td className="py-2.5 pr-3 text-center font-mono">
                              {detail.result === 'na' ? '-' : (
                                <span className={detail.result === 'pass' ? 'text-emerald-600' : 'text-rose-600'}>
                                  {detail.result === 'pass' ? detail.criteria?.max_score : 0}
                                </span>
                              )}
                            </td>
                            <td className={cn('py-2.5 pr-3 text-sm', detail.result === 'fail' && detail.auditor_comment ? 'text-rose-700 font-medium' : 'text-slate-500')}>
                              {detail.auditor_comment || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
        </Panel>

        {/* Print-only: readable full report */}
        <div className="hidden print:block space-y-6">
          <section>
            <h2 className="mb-3 border-l-4 border-indigo-600 pl-3 text-base font-bold text-indigo-950">
              ข้อที่ไม่ผ่านและหมายเหตุชี้แจง
            </h2>
            {failedItems.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                ไม่พบรายการที่ไม่ผ่าน
              </p>
            ) : (
              <div className="space-y-3">
                {failedItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <div className="font-semibold text-rose-900">
                      {item.criteria?.code} — {item.criteria?.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      หมวด {item.categoryCode} {item.categoryName}
                      {item.hosxp_value ? ` · ค่าจาก HOSxP: ${item.hosxp_value}` : ''}
                    </div>
                    <div className={cn(
                      'mt-2 border-l-4 pl-3 text-sm',
                      item.auditor_comment
                        ? 'border-rose-500 bg-white text-rose-900'
                        : 'border-slate-300 bg-white italic text-slate-400',
                    )}>
                      {item.auditor_comment
                        ? `ชี้แจง / หมายเหตุ: ${item.auditor_comment}`
                        : 'ยังไม่มีหมายเหตุชี้แจงสำหรับข้อนี้'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 border-l-4 border-indigo-600 pl-3 text-base font-bold text-indigo-950">
              หมายเหตุเพิ่มเติม
            </h2>
            {audit.summary_notes ? (
              <p className="whitespace-pre-wrap rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
                {audit.summary_notes}
              </p>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">
                ไม่มีหมายเหตุเพิ่มเติม
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 border-l-4 border-indigo-600 pl-3 text-base font-bold text-indigo-950">
              รายละเอียดการตรวจสอบทุกหมวด
            </h2>
            {categories.map((category) => {
              const rows = detailsByCategory[category.id] || [];
              const score = categoryScores[category.id];
              return (
                <div key={category.id} className="mb-5 break-inside-avoid">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    {category.code} · {category.name}
                    <span className="ml-2 font-normal text-slate-400">
                      (ผ่าน {score?.pass || 0} · ไม่ผ่าน {score?.fail || 0})
                    </span>
                  </h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[10px] uppercase text-slate-400">
                        <th className="py-1.5 pr-2 w-16">รหัส</th>
                        <th className="py-1.5 pr-2">รายการ</th>
                        <th className="py-1.5 pr-2 w-20 text-center">ผล</th>
                        <th className="py-1.5 pr-2">หมายเหตุ / ชี้แจง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-slate-400">ไม่มีข้อมูล</td>
                        </tr>
                      ) : (
                        rows.map((detail) => (
                          <tr
                            key={detail.id}
                            className={cn('border-b border-slate-100', detail.result === 'fail' && 'bg-rose-50')}
                          >
                            <td className="py-1.5 pr-2 font-mono">{detail.criteria?.code}</td>
                            <td className="py-1.5 pr-2">{detail.criteria?.name}</td>
                            <td className={cn(
                              'py-1.5 pr-2 text-center font-semibold',
                              detail.result === 'pass' && 'text-emerald-700',
                              detail.result === 'fail' && 'text-rose-700',
                              detail.result === 'na' && 'text-slate-400',
                            )}>
                              {resultLabel(detail.result)}
                            </td>
                            <td className={cn(
                              'py-1.5 pr-2',
                              detail.result === 'fail' && detail.auditor_comment ? 'font-medium text-rose-800' : 'text-slate-500',
                            )}>
                              {detail.auditor_comment || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        </div>

        <Panel title="ข้อที่ไม่ผ่านและหมายเหตุชี้แจง" description="รวบรวมเฉพาะข้อที่ผลเป็นไม่ผ่าน พร้อมข้อความชี้แจง" className="print:hidden">
          {failedItems.length === 0 ? (
            <EmptyState text="ไม่พบรายการที่ไม่ผ่าน — รายการตรวจสอบผ่านครบ หรือยังไม่ได้บันทึกผล" />
          ) : (
            <div className="space-y-3">
              {failedItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-rose-950">
                        {item.criteria?.code} — {item.criteria?.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        หมวด {item.categoryCode} {item.categoryName}
                        {item.hosxp_value ? ` · ค่าจาก HOSxP: ${item.hosxp_value}` : ''}
                      </div>
                    </div>
                    <StatusPill label="ไม่ผ่าน" className="border-rose-200 bg-rose-100 text-rose-700" />
                  </div>
                  <div className={cn(
                    'mt-3 rounded-lg border-l-4 px-3 py-2 text-sm',
                    item.auditor_comment
                      ? 'border-rose-500 bg-white text-rose-900'
                      : 'border-slate-300 bg-white italic text-slate-400',
                  )}>
                    {item.auditor_comment
                      ? `ชี้แจง / หมายเหตุ: ${item.auditor_comment}`
                      : 'ยังไม่มีหมายเหตุชี้แจงสำหรับข้อนี้'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="หมายเหตุเพิ่มเติม" className="print:hidden">
          {audit.summary_notes ? (
            <p className="whitespace-pre-wrap text-slate-700">{audit.summary_notes}</p>
          ) : (
            <p className="text-sm text-slate-400">ไม่มีหมายเหตุเพิ่มเติม</p>
          )}
        </Panel>

        <div className="flex justify-between print:hidden">
          <Link href="/mra">
            <Button variant="outline" className="rounded-xl">กลับรายการตรวจ</Button>
          </Link>
          {(audit.status === 'pending' || audit.status === 'in_progress') && (
            <Link href={`/mra/${audit.id}/audit`}>
              <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700"><Edit className="mr-2 h-4 w-4" />ตรวจสอบ</Button>
            </Link>
          )}
        </div>
    </QualityPage>
  );
}
