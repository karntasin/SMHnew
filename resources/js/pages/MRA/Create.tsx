import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { 
  ArrowLeft, Save, Search, FileText, Activity, Calendar, User, Building2, Loader2,
  Heart, Thermometer, Wind, Stethoscope, ClipboardList, CheckCircle2, ChevronRight,
  UserSearch, CalendarDays, FileCheck, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { maskCid, maskPatientName } from '@/lib/pii';

// Helper function แปลงวันที่เป็นภาษาไทย
const formatThaiDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear() + 543;
    
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    return `${day} ${thaiMonths[month]} ${year}`;
  } catch {
    return dateStr;
  }
};

interface Visit {
  vn: string;
  an?: string | null;
  vstdate: string;
  vsttime: string;
  spclty: string;
  main_dep?: string;
  department_name?: string;
  pttype: string;
  is_ipd?: boolean;
  visit_type?: 'OPD' | 'IPD';
}

interface Patient {
  hn: string;
  cid: string;
  patient_name: string;
  birthdate: string;
  birthdate_thai?: string;
  age_text?: string;
  drugallergy: string;
}

export default function MraCreate() {
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingVisit, setIsLoadingVisit] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [selectedVn, setSelectedVn] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterVisitType, setFilterVisitType] = useState<'all' | 'opd' | 'ipd'>('all');
  const [secondaryDiagnoses, setSecondaryDiagnoses] = useState<string[]>([]);
  const [secondaryDiagnosesWithNames, setSecondaryDiagnosesWithNames] = useState<Array<{code: string, name: string | null, display: string}>>([]);
  const [pdxName, setPdxName] = useState<string | null>(null);

  const { data, setData, post, processing, errors } = useForm({
    hn: '',
    vn: '',
    an: '',
    cid: '',
    patient_name: '',
    birthdate: '',
    pttype: '',
    pttype_name: '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_time: '',
    doctor_name: '',
    doctor_code: '',
    department: '',
    department_code: '',
    chief_complaint: '',
    pdx: '',
    pdx_icd10: '',
    bp_systolic: '',
    bp_diastolic: '',
    pulse: '',
    temperature: '',
    respiratory_rate: '',
    audit_type: 'opd' as 'opd' | 'ipd',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/mra');
  };

  // ค้นหาผู้ป่วย
  const handleSearchPatient = async () => {
    if (!data.hn) {
      toast.error('กรุณาระบุ HN');
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await axios.get('/mra/search-patient', {
        params: { hn: data.hn }
      });
      
      const result = response.data;
      setPatient(result.patient);
      setRecentVisits(result.recent_visits || []);
      
      setData((prev) => ({
        ...prev,
        patient_name: result.patient.patient_name,
        cid: result.patient.cid || '',
        birthdate: result.patient.birthdate || '',
      }));
      
      toast.success('พบข้อมูลผู้ป่วย');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'ไม่พบข้อมูลผู้ป่วย');
      setPatient(null);
      setRecentVisits([]);
    } finally {
      setIsSearching(false);
    }
  };

  // เลือก Visit และดึงข้อมูล
  const handleSelectVisit = async (vn: string) => {
    setSelectedVn(vn);
    setIsLoadingVisit(true);
    
    try {
      const response = await axios.get('/mra/visit-data', {
        params: { vn }
      });
      
      const visitData = response.data;
      
      // เก็บ secondary diagnoses และ pdx name
      setSecondaryDiagnoses(visitData.secondary_diagnoses || []);
      setSecondaryDiagnosesWithNames(visitData.secondary_diagnoses_with_names || []);
      setPdxName(visitData.pdx_name || null);
      
      setData((prev) => ({
        ...prev,
        vn: visitData.vn,
        an: visitData.an || '', // เพิ่ม AN
        audit_type: visitData.an ? 'ipd' : 'opd', // ตั้งค่า audit_type อัตโนมัติตาม AN
        visit_date: visitData.visit_date || prev.visit_date,
        visit_time: visitData.visit_time || '',
        pttype: visitData.pttype || '',
        pttype_name: visitData.pttype_name || '',
        department_code: visitData.department_code || '',
        department: visitData.department_name || '',
        doctor_code: visitData.doctor_code || '',
        chief_complaint: visitData.chief_complaint || '',
        pdx: visitData.pdx_name || visitData.pdx || '', // แสดงชื่อโรคในช่อง pdx
        pdx_icd10: visitData.pdx || '', // เก็บรหัส ICD-10 แยก
        bp_systolic: visitData.bp_systolic?.toString() || '',
        bp_diastolic: visitData.bp_diastolic?.toString() || '',
        pulse: visitData.pulse?.toString() || '',
        temperature: visitData.temperature?.toString() || '',
        respiratory_rate: visitData.respiratory_rate?.toString() || '',
      }));
      
      toast.success('ดึงข้อมูล Visit เรียบร้อย');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'ไม่สามารถดึงข้อมูล Visit ได้');
    } finally {
      setIsLoadingVisit(false);
    }
  };

  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '/quality' },
    { title: 'MRA', href: '/mra' },
    { title: 'สร้างการตรวจสอบใหม่', href: '#' },
  ];

  // Steps tracker
  const steps = [
    { id: 1, name: 'ค้นหาผู้ป่วย', icon: UserSearch, completed: !!patient },
    { id: 2, name: 'เลือก Visit', icon: CalendarDays, completed: !!selectedVn },
    { id: 3, name: 'กรอกข้อมูล', icon: ClipboardList, completed: !!data.patient_name && !!data.visit_date },
    { id: 4, name: 'บันทึก', icon: FileCheck, completed: false },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="สร้างการตรวจสอบใหม่ - MRA" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
          <div className="relative flex items-center gap-4">
            <Link href="/mra">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-6 w-6 text-yellow-300" />
                <Badge className="bg-white/20 text-white border-white/30">MRA System</Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">สร้างการตรวจสอบใหม่</h1>
              <p className="text-blue-100 mt-1">ตรวจสอบคุณภาพการบันทึกเวชระเบียน (Medical Record Audit) ตามมาตรฐาน สรพ. 2563</p>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="relative mt-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                    step.completed 
                      ? "bg-green-500 border-green-400 text-white" 
                      : "border-white/50 text-white/70"
                  )}>
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={cn(
                    "ml-2 text-sm font-medium hidden md:block",
                    step.completed ? "text-green-300" : "text-white/70"
                  )}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 mx-4 text-white/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: ค้นหาผู้ป่วย */}
          <Card className="border-2 border-blue-100 dark:border-blue-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <UserSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">ขั้นตอนที่ 1</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ค้นหาผู้ป่วย</h3>
                </div>
              </CardTitle>
              <CardDescription>ระบุ HN เพื่อค้นหาข้อมูลผู้ป่วยจากระบบ HOSxP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="hn">HN (Hospital Number)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="hn"
                      value={data.hn}
                      onChange={(e) => setData('hn', e.target.value)}
                      placeholder="ระบุ HN..."
                      className={errors.hn ? 'border-red-500' : ''}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchPatient())}
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleSearchPatient}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span className="ml-2">ค้นหา</span>
                    </Button>
                  </div>
                  {errors.hn && <p className="text-sm text-red-500 mt-1">{errors.hn}</p>}
                </div>
              </div>

              {/* แสดงข้อมูลผู้ป่วย */}
              {patient && (
                <div className="mt-4 p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-blue-200 dark:border-blue-800 shadow-inner">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{maskPatientName(patient.patient_name)}</h4>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          พบข้อมูล
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block mb-1">HN</span>
                          <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{patient.hn}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block mb-1">เลขบัตรประชาชน</span>
                          <p className="font-mono text-sm">{maskCid(patient.cid)}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block mb-1">วันเกิด</span>
                          <p className="text-sm">{patient.birthdate_thai || patient.birthdate || '-'}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block mb-1">อายุ</span>
                          <p className="text-sm font-semibold">{patient.age_text || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: เลือก Visit */}
          {recentVisits.length > 0 && (
            <Card className="border-2 border-green-100 dark:border-green-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-t-lg">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <span className="text-green-700 dark:text-green-300">ขั้นตอนที่ 2</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">เลือก Visit ที่ต้องการตรวจสอบ</h3>
                  </div>
                </CardTitle>
                <CardDescription>รายการ Visit ล่าสุดของผู้ป่วย ({recentVisits.length} รายการ)</CardDescription>
              </CardHeader>
              <CardContent>
                {/* ตัวกรองช่วงวันที่และประเภท */}
                <div className="mb-4 space-y-3">
                  {/* ตัวกรองประเภท Visit (OPD/IPD) */}
                  <div>
                    <Label>กรองตามประเภทผู้ป่วย</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        type="button"
                        variant={filterVisitType === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterVisitType('all')}
                      >
                        ทั้งหมด
                      </Button>
                      <Button
                        type="button"
                        variant={filterVisitType === 'opd' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterVisitType('opd')}
                        className={filterVisitType === 'opd' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        OPD (ผู้ป่วยนอก)
                      </Button>
                      <Button
                        type="button"
                        variant={filterVisitType === 'ipd' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterVisitType('ipd')}
                        className={filterVisitType === 'ipd' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                      >
                        IPD (ผู้ป่วยใน)
                      </Button>
                    </div>
                  </div>

                  {/* ตัวกรองช่วงวันที่ */}
                  <div>
                    <Label>กรองตามช่วงวันที่</Label>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">จาก</span>
                        <ThaiDatePicker
                          value={filterDateFrom}
                          onChange={setFilterDateFrom}
                          placeholder="เลือกวันที่"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">ถึง</span>
                        <ThaiDatePicker
                          value={filterDateTo}
                          onChange={setFilterDateTo}
                          placeholder="เลือกวันที่"
                        />
                      </div>
                      {(filterDateFrom || filterDateTo || filterVisitType !== 'all') && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterVisitType('all'); }}
                        >
                          ล้างตัวกรองทั้งหมด
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  {recentVisits
                    .filter(visit => {
                      // กรองประเภท Visit (OPD/IPD)
                      if (filterVisitType === 'opd' && visit.is_ipd) return false;
                      if (filterVisitType === 'ipd' && !visit.is_ipd) return false;
                      
                      // กรองตามช่วงวันที่
                      if (!filterDateFrom && !filterDateTo) return true;
                      const visitDate = visit.vstdate;
                      if (filterDateFrom && filterDateTo) {
                        return visitDate >= filterDateFrom && visitDate <= filterDateTo;
                      }
                      if (filterDateFrom) return visitDate >= filterDateFrom;
                      if (filterDateTo) return visitDate <= filterDateTo;
                      return true;
                    })
                    .length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        ไม่พบ Visit ตามเงื่อนไขที่เลือก
                      </div>
                    ) : (
                      recentVisits
                        .filter(visit => {
                          // กรองประเภท Visit (OPD/IPD)
                          if (filterVisitType === 'opd' && visit.is_ipd) return false;
                          if (filterVisitType === 'ipd' && !visit.is_ipd) return false;
                          
                          // กรองตามช่วงวันที่
                          if (!filterDateFrom && !filterDateTo) return true;
                          const visitDate = visit.vstdate;
                          if (filterDateFrom && filterDateTo) {
                            return visitDate >= filterDateFrom && visitDate <= filterDateTo;
                          }
                          if (filterDateFrom) return visitDate >= filterDateFrom;
                          if (filterDateTo) return visitDate <= filterDateTo;
                          return true;
                        })
                        .map((visit) => (
                    <div
                      key={visit.vn}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedVn === visit.vn
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleSelectVisit(visit.vn)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-xs text-muted-foreground">VN</span>
                            <p className="font-mono font-semibold">{visit.vn}</p>
                          </div>
                          <div>
                            <Badge 
                              variant="outline" 
                              className={visit.is_ipd 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              }
                            >
                              {visit.visit_type || (visit.is_ipd ? 'IPD' : 'OPD')}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">วันที่</span>
                            <p>{formatThaiDate(visit.vstdate)} {visit.vsttime}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">แผนก</span>
                            <p>{visit.department_name || visit.spclty || '-'}</p>
                          </div>
                          {visit.an && (
                            <div>
                              <span className="text-xs text-muted-foreground">AN</span>
                              <p className="font-mono text-sm">{visit.an}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isLoadingVisit && selectedVn === visit.vn && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {selectedVn === visit.vn && (
                            <Badge variant="default">เลือก</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: ประเภทการตรวจสอบ */}
          <Card className="border-2 border-purple-100 dark:border-purple-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-purple-700 dark:text-purple-300">ขั้นตอนที่ 3</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ประเภทการตรวจสอบ</h3>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <RadioGroup
                value={data.audit_type}
                onValueChange={(value) => setData('audit_type', value as 'opd' | 'ipd')}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="opd"
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                    data.audit_type === 'opd'
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-green-50/50"
                  )}
                >
                  <RadioGroupItem value="opd" id="opd" className="sr-only" />
                  <div className={cn(
                    "p-3 rounded-lg",
                    data.audit_type === 'opd' ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-bold text-lg">OPD</span>
                    <p className="text-sm text-muted-foreground">ผู้ป่วยนอก (Out-Patient)</p>
                  </div>
                  {data.audit_type === 'opd' && (
                    <CheckCircle2 className="h-6 w-6 text-green-500 ml-auto" />
                  )}
                </Label>
                <Label
                  htmlFor="ipd"
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                    data.audit_type === 'ipd'
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50/50"
                  )}
                >
                  <RadioGroupItem value="ipd" id="ipd" className="sr-only" />
                  <div className={cn(
                    "p-3 rounded-lg",
                    data.audit_type === 'ipd' ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="font-bold text-lg">IPD</span>
                    <p className="text-sm text-muted-foreground">ผู้ป่วยใน (In-Patient)</p>
                  </div>
                  {data.audit_type === 'ipd' && (
                    <CheckCircle2 className="h-6 w-6 text-purple-500 ml-auto" />
                  )}
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Step 4: ข้อมูล Visit (จาก HOSxP หรือกรอกเอง) */}
          <Card className="border-2 border-orange-100 dark:border-orange-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <span className="text-orange-700 dark:text-orange-300">ขั้นตอนที่ 4</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ข้อมูล Visit</h3>
                </div>
              </CardTitle>
              <CardDescription>ข้อมูลจะถูกดึงจาก HOSxP โดยอัตโนมัติ หรือสามารถกรอกเองได้</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="vn">VN</Label>
                  <Input
                    id="vn"
                    value={data.vn}
                    onChange={(e) => setData('vn', e.target.value)}
                    placeholder="VN..."
                  />
                </div>
                <div>
                  <Label htmlFor="an">AN (ถ้ามี)</Label>
                  <Input
                    id="an"
                    value={data.an}
                    onChange={(e) => setData('an', e.target.value)}
                    placeholder="AN..."
                  />
                </div>
                <div>
                  <Label htmlFor="visit_date">วันที่รับบริการ</Label>
                  <ThaiDatePicker
                    value={data.visit_date}
                    onChange={(date) => setData('visit_date', date)}
                    placeholder="เลือกวันที่"
                    className={errors.visit_date ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="visit_time">เวลา</Label>
                  <Input
                    id="visit_time"
                    value={data.visit_time}
                    onChange={(e) => setData('visit_time', e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="patient_name">ชื่อ-นามสกุล ผู้ป่วย</Label>
                  <Input
                    id="patient_name"
                    value={maskPatientName(data.patient_name)}
                    readOnly
                    className={errors.patient_name ? 'border-red-500' : 'bg-muted/40'}
                  />
                  {errors.patient_name && <p className="text-sm text-red-500">{errors.patient_name}</p>}
                </div>
                <div>
                  <Label htmlFor="pttype_name">สิทธิการรักษา</Label>
                  <Input
                    id="pttype_name"
                    value={data.pttype_name}
                    onChange={(e) => setData('pttype_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department">แผนก</Label>
                  <Input
                    id="department"
                    value={data.department}
                    onChange={(e) => setData('department', e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Clinical Data */}
              <div>
                <Label htmlFor="chief_complaint">อาการสำคัญ (Chief Complaint)</Label>
                <Input
                  id="chief_complaint"
                  value={data.chief_complaint}
                  onChange={(e) => setData('chief_complaint', e.target.value)}
                  placeholder="CC..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pdx">การวินิจฉัยหลัก (Principal Diagnosis)</Label>
                  <Input
                    id="pdx"
                    value={data.pdx}
                    onChange={(e) => setData('pdx', e.target.value)}
                    placeholder="ชื่อโรค..."
                  />
                  {data.pdx_icd10 && (
                    <p className="text-sm text-muted-foreground mt-1">ICD-10: {data.pdx_icd10}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pdx_icd10">รหัส ICD-10</Label>
                  <Input
                    id="pdx_icd10"
                    value={data.pdx_icd10}
                    onChange={(e) => setData('pdx_icd10', e.target.value)}
                    placeholder="เช่น J06.9"
                  />
                </div>
              </div>

              {/* Secondary Diagnoses */}
              {secondaryDiagnosesWithNames.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Label className="mb-2 block">การวินิจฉัยร่วม (Secondary Diagnoses)</Label>
                  <div className="space-y-1">
                    {secondaryDiagnosesWithNames.map((dx, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {index + 1}. {dx.code}
                        </Badge>
                        {dx.name && (
                          <span className="text-sm text-muted-foreground">{dx.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Vital Signs */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 p-5 rounded-xl border border-red-200 dark:border-red-800">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Vital Signs
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                    <Label htmlFor="bp_systolic" className="text-xs flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      BP Sys
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="bp_systolic"
                        value={data.bp_systolic}
                        onChange={(e) => setData('bp_systolic', e.target.value)}
                        placeholder="120"
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mmHg</span>
                    </div>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                    <Label htmlFor="bp_diastolic" className="text-xs flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      BP Dia
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="bp_diastolic"
                        value={data.bp_diastolic}
                        onChange={(e) => setData('bp_diastolic', e.target.value)}
                        placeholder="80"
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mmHg</span>
                    </div>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                    <Label htmlFor="pulse" className="text-xs flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      Pulse
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="pulse"
                        value={data.pulse}
                        onChange={(e) => setData('pulse', e.target.value)}
                        placeholder="72"
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">bpm</span>
                    </div>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                    <Label htmlFor="temperature" className="text-xs flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      Temp
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="temperature"
                        value={data.temperature}
                        onChange={(e) => setData('temperature', e.target.value)}
                        placeholder="36.5"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°C</span>
                    </div>
                  </div>
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg">
                    <Label htmlFor="respiratory_rate" className="text-xs flex items-center gap-1">
                      <Wind className="h-3 w-3" />
                      RR
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="respiratory_rate"
                        value={data.respiratory_rate}
                        onChange={(e) => setData('respiratory_rate', e.target.value)}
                        placeholder="18"
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/min</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4 pb-8">
            <Link href="/mra">
              <Button type="button" variant="outline" size="lg" className="px-8">
                ยกเลิก
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={processing}
              size="lg"
              className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
            >
              {processing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  บันทึกและเริ่มตรวจสอบ
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
