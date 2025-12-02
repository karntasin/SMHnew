import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  User,
  Activity,
  Stethoscope,
  FileText,
  ClipboardCheck,
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Criteria {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  audit_guide: string | null;
  data_type: 'auto' | 'manual' | 'both';
  max_score: number;
  is_required: boolean;
}

interface Category {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  weight: number;
  criteria: Criteria[];
}

interface AuditResult {
  criteria_id: number;
  result: 'pass' | 'fail' | 'na' | 'pending';
  hosxp_value: string | null;
  auditor_comment: string | null;
}

interface Audit {
  id: number;
  vn: string;
  hn: string;
  patient_name: string;
  visit_date: string;
  status: string;
  audit_type: string;
  chief_complaint: string | null;
  pdx: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  accuracy_percentage: number;
}

interface ExistingResult {
  mra_criteria_id: number;
  result: string;
  hosxp_value: string | null;
  auditor_comment: string | null;
}

interface Props {
  audit: Audit;
  categories: Category[];
  existingResults: Record<number, ExistingResult>;
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

export default function MraAuditForm({ audit, categories, existingResults }: Props) {
  const [results, setResults] = useState<Record<number, AuditResult>>({});
  const [summaryNotes, setSummaryNotes] = useState('');
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set(categories.map(c => c.id)));

  // Initialize results from existing data
  useEffect(() => {
    const initialResults: Record<number, AuditResult> = {};
    
    // First, set all criteria to pending
    categories.forEach(category => {
      category.criteria.forEach(criterion => {
        initialResults[criterion.id] = {
          criteria_id: criterion.id,
          result: 'pending',
          hosxp_value: null,
          auditor_comment: null,
        };
      });
    });

    // Then, override with existing results if any
    Object.values(existingResults).forEach(existing => {
      if (existing.mra_criteria_id) {
        initialResults[existing.mra_criteria_id] = {
          criteria_id: existing.mra_criteria_id,
          result: existing.result as any,
          hosxp_value: existing.hosxp_value,
          auditor_comment: existing.auditor_comment,
        };
      }
    });

    setResults(initialResults);
  }, [categories, existingResults]);

  // Auto-check from HOSxP
  const handleAutoCheck = async () => {
    if (!audit.vn) {
      toast.error('ไม่มี VN สำหรับตรวจสอบอัตโนมัติ');
      return;
    }

    setIsAutoChecking(true);
    try {
      const response = await axios.get('/mra/auto-check', {
        params: { vn: audit.vn }
      });

      const autoChecks = response.data.auto_checks;
      
      setResults(prev => {
        const updated = { ...prev };
        
        Object.entries(autoChecks).forEach(([code, check]: [string, any]) => {
          if (check.criteria_id && check.passed !== null) {
            updated[check.criteria_id] = {
              ...updated[check.criteria_id],
              result: check.passed ? 'pass' : 'fail',
              hosxp_value: check.value?.toString() || null,
            };
          }
        });
        
        return updated;
      });

      toast.success(`ตรวจสอบอัตโนมัติเสร็จสิ้น (${response.data.checked_count} รายการ)`);
    } catch (error) {
      console.error(error);
      toast.error('เกิดข้อผิดพลาดในการตรวจสอบอัตโนมัติ');
    } finally {
      setIsAutoChecking(false);
    }
  };

  // Set result for a criteria
  const setResult = (criteriaId: number, result: 'pass' | 'fail' | 'na') => {
    setResults(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        criteria_id: criteriaId,
        result,
      }
    }));
  };

  // Set comment for a criteria
  const setComment = (criteriaId: number, comment: string) => {
    setResults(prev => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        auditor_comment: comment,
      }
    }));
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Calculate scores
  const scores = useMemo(() => {
    let totalMax = 0;
    let totalObtained = 0;
    let totalChecked = 0;
    let totalPending = 0;

    const categoryScores: Record<number, { max: number; obtained: number; checked: number; total: number }> = {};

    categories.forEach(category => {
      categoryScores[category.id] = { max: 0, obtained: 0, checked: 0, total: category.criteria.length };
      
      category.criteria.forEach(criterion => {
        const result = results[criterion.id];
        
        if (result?.result === 'pass') {
          categoryScores[category.id].obtained += criterion.max_score;
          categoryScores[category.id].max += criterion.max_score;
          categoryScores[category.id].checked++;
          totalObtained += criterion.max_score;
          totalMax += criterion.max_score;
          totalChecked++;
        } else if (result?.result === 'fail') {
          categoryScores[category.id].max += criterion.max_score;
          categoryScores[category.id].checked++;
          totalMax += criterion.max_score;
          totalChecked++;
        } else if (result?.result === 'na') {
          categoryScores[category.id].checked++;
          totalChecked++;
        } else {
          totalPending++;
        }
      });
    });

    const accuracy = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const progress = (totalChecked / (totalChecked + totalPending)) * 100;

    return { totalMax, totalObtained, accuracy, progress, totalChecked, totalPending, categoryScores };
  }, [results, categories]);

  // Save results
  const handleSave = async (finalize: boolean = false) => {
    setIsSaving(true);
    
    try {
      const resultsArray = Object.values(results).map(r => ({
        criteria_id: r.criteria_id,
        result: r.result,
        hosxp_value: r.hosxp_value,
        auditor_comment: r.auditor_comment,
      }));

      await axios.post(`/mra/${audit.id}/audit`, {
        results: resultsArray,
        summary_notes: summaryNotes,
        finalize,
      });

      toast.success(finalize ? 'บันทึกและสรุปผลเรียบร้อยแล้ว' : 'บันทึกผลการตรวจสอบเรียบร้อยแล้ว');
      
      if (finalize) {
        router.visit(`/mra/${audit.id}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '/quality' },
    { title: 'MRA', href: '/mra' },
    { title: `ตรวจสอบ #${audit.id}`, href: '#' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`ตรวจสอบเวชระเบียน - ${audit.hn}`} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link href="/mra">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ตรวจสอบคุณภาพเวชระเบียน</h1>
              <p className="text-muted-foreground">
                {audit.patient_name} | HN: {audit.hn} | VN: {audit.vn}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAutoCheck} disabled={isAutoChecking}>
              {isAutoChecking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              ตรวจอัตโนมัติ
            </Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              บันทึกแบบร่าง
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isSaving || scores.totalPending > 0}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              สรุปผล
            </Button>
          </div>
        </div>

        {/* Patient Info & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Summary */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ข้อมูลผู้ป่วย</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">HN:</span>
                <span className="font-mono">{audit.hn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VN:</span>
                <span className="font-mono">{audit.vn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">วันที่:</span>
                <span>{audit.visit_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ประเภท:</span>
                <Badge variant={audit.audit_type === 'opd' ? 'default' : 'secondary'}>
                  {audit.audit_type.toUpperCase()}
                </Badge>
              </div>
              <Separator className="my-3" />
              <div>
                <span className="text-muted-foreground">CC:</span>
                <p className="mt-1">{audit.chief_complaint || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">PDx:</span>
                <p className="mt-1">{audit.pdx || '-'}</p>
              </div>
              {audit.bp_systolic && (
                <div>
                  <span className="text-muted-foreground">VS:</span>
                  <p className="mt-1">
                    BP {audit.bp_systolic}/{audit.bp_diastolic}, 
                    P {audit.pulse}, 
                    T {audit.temperature}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Summary */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>สรุปคะแนน</span>
                <Badge variant={scores.accuracy >= 90 ? 'default' : scores.accuracy >= 70 ? 'secondary' : 'destructive'}>
                  {scores.accuracy.toFixed(1)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>ความคืบหน้า</span>
                    <span>{scores.totalChecked} / {scores.totalChecked + scores.totalPending} รายการ</span>
                  </div>
                  <Progress value={scores.progress} className="h-2" />
                </div>
                <div className="text-center px-4 border-l">
                  <div className="text-2xl font-bold text-green-600">{scores.totalObtained}</div>
                  <div className="text-xs text-muted-foreground">/ {scores.totalMax} คะแนน</div>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
                {categories.slice(0, 5).map(category => {
                  const catScore = scores.categoryScores[category.id];
                  const catAccuracy = catScore.max > 0 ? (catScore.obtained / catScore.max) * 100 : 0;
                  return (
                    <div key={category.id} className="text-center p-2 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground truncate">{category.code}</div>
                      <div className={cn(
                        "text-lg font-semibold",
                        catAccuracy >= 90 ? "text-green-600" : catAccuracy >= 70 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {catAccuracy.toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {catScore.checked}/{catScore.total}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Checklist */}
        <div className="space-y-4">
          {categories.map(category => {
            const isExpanded = expandedCategories.has(category.id);
            const catScore = scores.categoryScores[category.id];
            
            return (
              <Card key={category.id}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {categoryIcons[category.code] || <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {category.name}
                          <Badge variant="outline" className="ml-2">
                            {catScore.checked}/{catScore.total}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{category.name_en}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={cn(
                          "text-lg font-semibold",
                          catScore.max > 0 && (catScore.obtained / catScore.max) >= 0.9 ? "text-green-600" : 
                          catScore.max > 0 && (catScore.obtained / catScore.max) >= 0.7 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {catScore.obtained}/{catScore.max}
                        </div>
                        <div className="text-xs text-muted-foreground">คะแนน</div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {category.criteria.map(criterion => {
                        const result = results[criterion.id];
                        
                        return (
                          <div 
                            key={criterion.id}
                            className={cn(
                              "p-4 rounded-lg border transition-colors",
                              result?.result === 'pass' && "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
                              result?.result === 'fail' && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
                              result?.result === 'na' && "bg-gray-50 border-gray-200 dark:bg-gray-800/50",
                              result?.result === 'pending' && "bg-white dark:bg-gray-900"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono">
                                    {criterion.code}
                                  </Badge>
                                  {criterion.is_required && (
                                    <Badge variant="destructive" className="text-xs">จำเป็น</Badge>
                                  )}
                                  {criterion.data_type !== 'manual' && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Auto
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    ({criterion.max_score} คะแนน)
                                  </span>
                                </div>
                                <h4 className="font-medium mt-1">{criterion.name}</h4>
                                {criterion.audit_guide && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {criterion.audit_guide}
                                  </p>
                                )}
                                {result?.hosxp_value && (
                                  <div className="mt-2 text-sm">
                                    <span className="text-muted-foreground">ค่าจาก HOSxP: </span>
                                    <span className="font-mono bg-muted px-2 py-0.5 rounded">
                                      {result.hosxp_value}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant={result?.result === 'pass' ? 'default' : 'outline'}
                                    className={cn(
                                      result?.result === 'pass' && "bg-green-600 hover:bg-green-700"
                                    )}
                                    onClick={() => setResult(criterion.id, 'pass')}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={result?.result === 'fail' ? 'default' : 'outline'}
                                    className={cn(
                                      result?.result === 'fail' && "bg-red-600 hover:bg-red-700"
                                    )}
                                    onClick={() => setResult(criterion.id, 'fail')}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={result?.result === 'na' ? 'default' : 'outline'}
                                    className={cn(
                                      result?.result === 'na' && "bg-gray-600 hover:bg-gray-700"
                                    )}
                                    onClick={() => setResult(criterion.id, 'na')}
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {result?.result === 'fail' && (
                              <div className="mt-3">
                                <Label className="text-xs">หมายเหตุ</Label>
                                <Textarea
                                  value={result.auditor_comment || ''}
                                  onChange={(e) => setComment(criterion.id, e.target.value)}
                                  placeholder="ระบุเหตุผลที่ไม่ผ่าน..."
                                  className="mt-1 h-16"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Summary Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">หมายเหตุสรุป</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="ระบุหมายเหตุสรุปผลการตรวจสอบ..."
              className="min-h-24"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border shadow-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              ตรวจสอบแล้ว {scores.totalChecked} จาก {scores.totalChecked + scores.totalPending} รายการ
            </span>
            {scores.totalPending > 0 && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                ยังไม่ครบ {scores.totalPending} รายการ
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              บันทึกแบบร่าง
            </Button>
            <Button 
              onClick={() => handleSave(true)} 
              disabled={isSaving || scores.totalPending > 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              สรุปผลและบันทึก
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
