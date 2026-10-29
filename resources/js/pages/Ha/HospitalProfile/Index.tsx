import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Building2, 
  FileText, 
  Users, 
  Activity, 
  ShieldCheck, 
  Award, 
  Printer, 
  Pencil, 
  History, 
  Layers, 
  TrendingUp, 
  ChevronRight, 
  Bed, 
  Cross, 
  Stethoscope, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Target,
  Flame,
  Zap,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import RevisionModal from './RevisionModal';

interface Props {
  profile: any;
  activeTab?: string;
}

export default function HospitalProfileIndex({ profile, activeTab = 'front' }: Props) {
  const [currentTab, setCurrentTab] = useState<string>(activeTab);
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);

  const tabs = [
    { id: 'front', label: '1. หน้าแรก (Front Page)', icon: <FileText className="w-4 h-4" />, desc: 'บทนำ นิยาม WHAT & WHY' },
    { id: 'gen', label: '2. ข้อมูลทั่วไป (Gen Infor)', icon: <Building2 className="w-4 h-4" />, desc: 'บริบท วิสัยทัศน์ และเข็มมุ่ง' },
    { id: 'pt', label: '3. ข้อมูลผู้ป่วย (Pt Profile)', icon: <Users className="w-4 h-4" />, desc: 'Top 10 OPD/IPD & สิทธิรักษา' },
    { id: 'staff', label: '4. อัตรากำลัง (Staff Profile)', icon: <Stethoscope className="w-4 h-4" />, desc: 'แพทย์เฉพาะทาง & บุคลากร' },
    { id: 'workload', label: '5. ภาระงาน (Workload)', icon: <Activity className="w-4 h-4" />, desc: 'สถิติบริการ & ปริมาณงาน' },
    { id: 'entry', label: '6. ลักษณะองค์กร (Entry)', icon: <ShieldCheck className="w-4 h-4" />, desc: 'บริการหลัก & กลยุทธ์' },
    { id: 'onepage', label: '7. สรุป 1 หน้า (OnePage)', icon: <Sparkles className="w-4 h-4 text-amber-500" />, desc: 'Executive One-Pager' },
  ];

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url.toString());
  };

  const front = profile.front_page_info || {};
  const pt = profile.patient_profile || {};
  const staff = profile.staff_profile || {};
  const workload = profile.workload_data || {};
  const entry = profile.entry_data || {};
  const onepage = profile.one_page_summary || {};

  return (
    <AppLayout
      title="Hospital Profile (ข้อมูลภาพรวมและบริบทโรงพยาบาล)"
      breadcrumbs={[
        { title: 'หน้าแรก', href: '/' },
        { title: 'ศูนย์พัฒนาคุณภาพ (งาน HA)', href: '/ha' },
        { title: 'Hospital Profile', href: '/ha/hospital-profile' },
      ]}
    >
      <Head title="Hospital Profile - โรงพยาบาลค่ายสุรสิงหนาท" />

      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* ================= HEADER HERO ================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-amber-500 via-indigo-600 to-sky-500" />
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-md bg-slate-900 text-amber-300 tracking-wider">
                    HOSPITAL PROFILE
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ข้อมูลบริบทโรงพยาบาล (7 แท็บสมบูรณ์)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    เวอร์ชัน #{profile.current_version}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {profile.hospital_name_th}
                </h1>
                <p className="text-sm font-semibold text-slate-500">
                  {profile.hospital_name_en} • สังกัด: {profile.affiliation}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <History className="w-4 h-4 text-slate-500" />
                  <span>ประวัติเวอร์ชัน ({profile.revisions?.length ?? 0})</span>
                </button>

                <Link
                  href="/ha/hospital-profile/print?mode=onepage"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-2xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>พิมพ์สรุป 1 หน้า (One-Page)</span>
                </Link>

                <Link
                  href="/ha/hospital-profile/print?mode=full"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-2xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เล่มเต็ม (A4)</span>
                </Link>

                <Link
                  href={`/ha/hospital-profile/edit?tab=${currentTab}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  <span>แก้ไขข้อมูล</span>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-indigo-600" />
                  <span>เตียงขออนุญาต / เปิดจริง</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {profile.registered_beds} / <span className="text-indigo-600">{profile.actual_beds} เตียง</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>อัตราการครองเตียง</span>
                </div>
                <div className="text-lg font-black text-emerald-700 mt-1">
                  {profile.occupancy_rate || 78.5}%
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>ระดับสถานพยาบาล</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {profile.hospital_level} ({profile.hospital_type})
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-rose-600" />
                  <span>เข็มมุ่งยุทธศาสตร์</span>
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                  3S1H & Digital Hospital
                </div>
              </div>
            </div>
          </div>

          {/* ================= 7 TABS NAVIGATION BAR ================= */}
          <div className="px-4 sm:px-8 bg-slate-50 border-t border-slate-200 overflow-x-auto">
            <div className="flex items-center gap-2 py-2 min-w-max">
              {tabs.map((t) => {
                const isActive = currentTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTabChange(t.id)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    )}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= TAB CONTENT DISPLAY ================= */}

        {/* TAB 1: FRONT PAGE */}
        {currentTab === 'front' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                1
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">1. หน้าแรก (Front Page - บทนำและนิยาม)</h2>
                <p className="text-xs text-slate-500">ความสำคัญและองค์ประกอบของ Hospital Profile ตามมาตรฐาน สรพ.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <span className="px-2.5 py-1 rounded-md bg-indigo-700 text-white font-black text-xs">WHAT คืออะไร?</span>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium pt-2">
                  {front.what || 'Hospital Profile คือสรุปข้อมูลสำคัญของโรงพยาบาล แสดงให้เห็นบริบทที่เป็นตัวกำหนดทิศทางการทำงานของโรงพยาบาล'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                <span className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-black text-xs">WHY ทำไมต้องมี?</span>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium pt-2">
                  {front.why || 'ความเข้าใจในโจทย์ขององค์กรหรือความต้องการขององค์กร มีความสำคัญต่อทีมงานของ รพ.เองและผู้เยี่ยมสำรวจในการพิจารณาว่าสิ่งที่องค์กรดำเนินการนั้นสอดคล้องกับบริบทขององค์กรหรือไม่'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">องค์ประกอบสำคัญของ Hospital Profile ทั้ง 7 ส่วน:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(front.components || []).map((comp: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{comp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GEN INFOR */}
        {currentTab === 'gen' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-black">
                2
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">2. ข้อมูลทั่วไปขององค์กร (General Information)</h2>
                <p className="text-xs text-slate-500">ข้อมูลพื้นฐาน บริบท วิสัยทัศน์ พันธกิจ ค่านิยม และเข็มมุ่งยุทธศาสตร์</p>
              </div>
            </div>

            {/* Basic Info Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 w-1/4 font-bold text-slate-600 bg-slate-50/40">ชื่อองค์กร (ไทย/อังกฤษ)</td>
                    <td className="p-3 text-slate-900 font-bold">{profile.hospital_name_th} ({profile.hospital_name_en})</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-600 bg-slate-50/40">สถานที่ตั้ง / ที่อยู่</td>
                    <td className="p-3 text-slate-800">{profile.address}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-600 bg-slate-50/40">ประเภทและระดับ</td>
                    <td className="p-3 text-slate-800">{profile.hospital_type} • ระดับ{profile.hospital_level}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-600 bg-slate-50/40">ต้นสังกัด</td>
                    <td className="p-3 text-slate-800">{profile.affiliation}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-600 bg-slate-50/40">ขนาดเตียงและการครองเตียง</td>
                    <td className="p-3 text-slate-800">
                      ขออนุญาต <strong>{profile.registered_beds} เตียง</strong> (เปิดให้บริการจริง <strong>{profile.actual_beds} เตียง</strong>) • อัตราครองเตียง <strong>{profile.occupancy_rate}%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Strategic Focus 2566 - 2570 */}
            {profile.strategic_focus && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black text-amber-950 uppercase">เข็มมุ่งและจุดเน้นในการพัฒนา (Strategic Focus พ.ศ. 2566–2570)</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap pl-7">
                  {profile.strategic_focus}
                </p>
              </div>
            )}

            {/* Vision & Mission */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-indigo-950">วิสัยทัศน์ (Vision)</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap pl-7">
                  {profile.vision}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-emerald-950">พันธกิจ (Mission)</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap pl-7">
                  {profile.mission}
                </p>
              </div>
            </div>

            {/* Core Values & Competencies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase">ค่านิยมและวัฒนธรรมองค์กร (Core Values)</h4>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {profile.core_values || '-'}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase">สมรรถนะหลักขององค์กร (Core Competencies)</h4>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {profile.core_competencies || '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PT PROFILE */}
        {currentTab === 'pt' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-black">
                3
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">3. ข้อมูลสถิติผู้รับบริการ (Patient Profile)</h2>
                <p className="text-xs text-slate-500">สถิติโรคพบบ่อย Top 10 ผู้ป่วยนอก/ผู้ป่วยใน 3 ปีย้อนหลัง และกลุ่มผู้ป่วยเสี่ยงสูง</p>
              </div>
            </div>

            {/* Top 10 OPD */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-sm font-black text-slate-900">10 อันดับโรคผู้ป่วยนอกที่พบบ่อย (Top 10 Diagnosis - OPD)</h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2.5 text-center w-12">อันดับ</th>
                      <th className="p-2.5 text-left">ชื่อโรค / ภาวะ (Diagnosis)</th>
                      <th className="p-2.5 text-center w-24">ปี 2567</th>
                      <th className="p-2.5 text-center w-24">ปี 2568</th>
                      <th className="p-2.5 text-center w-28 bg-amber-500 text-slate-950 font-black">ปี 2569 (พ.ค.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(pt.top_opd || []).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 even:bg-slate-50/30">
                        <td className="p-2.5 text-center font-bold text-slate-400">{row.rank || idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.disease}</td>
                        <td className="p-2.5 text-center font-medium text-slate-600">{Number(row.y2567 || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-center font-medium text-slate-600">{Number(row.y2568 || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-center font-black text-amber-950 bg-amber-50/60">{Number(row.y2569 || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* High Risk & Rights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="p-5 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-3">
                <h4 className="text-xs font-black text-rose-950 uppercase flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>กลุ่มผู้ป่วยความเสี่ยงสูง / กลุ่มเฉพาะ (High Risk Groups)</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {(pt.high_risk_groups || []).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
                <h4 className="text-xs font-black text-indigo-950 uppercase flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>สัดส่วนสิทธิการรักษาพยาบาล (Payment / Rights)</span>
                </h4>
                <div className="space-y-2">
                  {(pt.rights || []).map((r: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-white border border-indigo-100 flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-medium">{r.name}</span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{r.ratio}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STAFF PROFILE */}
        {currentTab === 'staff' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                4
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">4. อัตรากำลังและบุคลากร (Staff / Workforce Profile)</h2>
                <p className="text-xs text-slate-500">สถิติบุคลากรทางการแพทย์ แพทย์เฉพาะทางแต่ละสาขา และบุคลากรสนับสนุน</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3 text-left">ตำแหน่ง / สาขาวิชาชีพ</th>
                    <th className="p-3 text-center w-32">Full Time</th>
                    <th className="p-3 text-center w-36">FTE of Part Time</th>
                    <th className="p-3 text-center w-28 bg-amber-500 text-slate-950 font-black">รวมทั้งหมด (คน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(staff.staff_table || []).map((row: any, idx: number) => (
                    <tr key={idx} className={cn(
                      "hover:bg-slate-50/80",
                      row.is_sub ? "bg-slate-50/30 text-slate-600 pl-6" : "font-bold text-slate-900 bg-white"
                    )}>
                      <td className={cn("p-2.5", row.is_sub && "pl-8 text-slate-700 font-medium")}>{row.role}</td>
                      <td className="p-2.5 text-center font-mono">{row.full_time}</td>
                      <td className="p-2.5 text-center font-mono">{row.part_time_fte}</td>
                      <td className="p-2.5 text-center font-mono font-black text-slate-900 bg-slate-50/50">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: WORKLOAD */}
        {currentTab === 'workload' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                5
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">5. ภาระงานและปริมาณงานบริการ (Workload & Utilization)</h2>
                <p className="text-xs text-slate-500">ภาระงานผู้ป่วยนอก/แพทย์ตรวจต่อชั่วโมงแยกตามสาขา และสถิติบริการสำคัญ</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">ภาระงานผู้ป่วยนอก/แพทย์ตรวจต่อชั่วโมง เปรียบเทียบปี 2567 - 2568</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2.5 text-left">หน่วยงาน / สาขาวิชา</th>
                      <th className="p-2.5 text-center w-32">จำนวน Visit (ปี 67)</th>
                      <th className="p-2.5 text-center w-36">เฉลี่ยตรวจ/ชม. (ปี 67)</th>
                      <th className="p-2.5 text-center w-32 bg-amber-600 text-white">จำนวน Visit (ปี 68)</th>
                      <th className="p-2.5 text-center w-36 bg-amber-500 text-slate-950 font-black">เฉลี่ยตรวจ/ชม. (ปี 68)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(workload.outpatient_physician_workload || []).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/80 even:bg-slate-50/30">
                        <td className="p-2.5 font-bold text-slate-900">{row.department}</td>
                        <td className="p-2.5 text-center font-mono">{Number(row.visits_y2567 || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-center font-mono text-indigo-700 font-bold">{row.rate_y2567 || '-'}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{Number(row.visits_y2568 || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-center font-mono font-black text-amber-950 bg-amber-50/50">{row.rate_y2568 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ENTRY */}
        {currentTab === 'entry' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                6
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">6. ลักษณะสำคัญขององค์กรเพื่อการขับเคลื่อน (Entry & Strategy)</h2>
                <p className="text-xs text-slate-500">บริการหลักด้านการทหารและพลเรือน ความได้เปรียบและความท้าทายเชิงกลยุทธ์</p>
              </div>
            </div>

            {/* Core Services */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase">บริการหลักขององค์กร (Core Services)</h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                {entry.core_services || profile.scope_of_service}
              </p>
            </div>

            {/* Advantages & Challenges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-emerald-950 uppercase">ความได้เปรียบเชิงกลยุทธ์ (Strategic Advantages - 11 ข้อ)</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap pl-7">
                  {profile.strategic_advantages}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black text-amber-950 uppercase">ความท้าทายเชิงกลยุทธ์ (Strategic Challenges - 8 ข้อ)</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap pl-7">
                  {profile.strategic_challenges}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ONE PAGE EXECUTIVE SUMMARY */}
        {currentTab === 'onepage' && (
          <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-md p-6 sm:p-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-5">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                  EXECUTIVE ONE-PAGER
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                  สรุปสาระสำคัญภาพรวมองค์กร 1 หน้า (Hospital Profile One-Page)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  โรงพยาบาลค่ายสุรสิงหนาท • สำหรับผู้บริหารและผู้ตรวจประเมินคุณภาพสถานพยาบาล
                </p>
              </div>

              <Link
                href="/ha/hospital-profile/print?mode=onepage"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>พิมพ์ One-Page ฉบับทางการ (A4)</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Col 1: Identity & Strategy */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase">วิสัยทัศน์ (Vision)</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{profile.vision}</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <h4 className="text-xs font-black text-amber-950 uppercase">เข็มมุ่ง 2566–2570</h4>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">{profile.strategic_focus}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase">สมรรถนะหลัก (Core Competency)</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{profile.core_competencies}</p>
                </div>
              </div>

              {/* Col 2: Advantages & Challenges */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                  <h4 className="text-xs font-black text-emerald-950 uppercase">ความได้เปรียบเชิงกลยุทธ์</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{profile.strategic_advantages}</p>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1.5">
                  <h4 className="text-xs font-black text-rose-950 uppercase">ความท้าทายเชิงกลยุทธ์</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{profile.strategic_challenges}</p>
                </div>
              </div>

              {/* Col 3: Key Stats & Top OPD */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <h4 className="text-xs font-black text-indigo-950 uppercase">สถิติและภาระงานสำคัญ</h4>
                  <div className="space-y-1 text-xs text-slate-700">
                    <div>• เตียง: <strong>60 (เปิดจริง 30 เตียง)</strong></div>
                    <div>• อัตราครองเตียง: <strong>{profile.occupancy_rate}%</strong></div>
                    <div>• ผู้ป่วยนอก: <strong>42,000+ ครั้ง/ปี</strong></div>
                    <div>• แพทย์เฉพาะทาง: <strong>11 ท่าน</strong> (รวม FTE 15 ท่าน)</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase">Top 5 โรค OPD สูงสุด</h4>
                  <div className="space-y-1 text-xs text-slate-700">
                    {(pt.top_opd || []).slice(0, 5).map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="truncate max-w-[180px]">{idx + 1}. {d.disease}</span>
                        <strong className="font-mono text-indigo-700">{Number(d.y2568 || 0).toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Revision History Modal */}
      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        revisions={profile.revisions || []}
        currentVersion={profile.current_version}
      />
    </AppLayout>
  );
}
