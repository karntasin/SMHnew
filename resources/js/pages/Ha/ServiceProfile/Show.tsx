import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Building2, 
  Printer, 
  Pencil, 
  ArrowLeft, 
  Stethoscope, 
  FlaskConical, 
  Briefcase, 
  ShieldCheck, 
  History, 
  FileText, 
  CheckCircle2, 
  Activity, 
  Target, 
  Compass, 
  Users, 
  TrendingUp, 
  ChevronRight,
  Sparkles,
  GitFork,
  AlertTriangle,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import RevisionHistoryModal from './RevisionHistoryModal';

interface CustomerRow {
  customer: string;
  requirement: string;
  response?: string;
}

interface ProcessRow {
  process: string;
  expectation: string;
  kpi?: string;
}

interface SubKpiRow {
  name: string;
  target?: string;
  years?: Record<string, string>;
}

interface KpiRow {
  name: string;
  target: string;
  years?: Record<string, string>;
  sub_items?: SubKpiRow[];
  y2564?: string;
  y2565?: string;
  y2566?: string;
  y2567?: string;
  y2568?: string;
  y2569?: string;
}

interface ProfileProps {
  id: number;
  code: string;
  name: string;
  department_id?: number;
  team_ha_id?: number;
  service_group: 'clinical' | 'diagnostic_support' | 'general_support' | 'quality_safety';
  cycle_year: string;
  leader_name?: string;
  purpose?: string;
  scope_of_service?: string;
  target_customers?: CustomerRow[];
  key_quality_issues?: string;
  key_risks_challenges?: string;
  workload_and_resources?: any[];
  key_processes?: ProcessRow[];
  performance_indicators?: KpiRow[];
  current_systems?: string;
  ongoing_improvements?: string;
  future_plans?: string;
  status: string;
  current_version: number;
  updated_at: string;
  department?: {
    id: number;
    name: string;
    code?: string;
  };
  team?: {
    id: number;
    name_th: string;
    abbreviation: string;
  };
  last_modified_user?: {
    name: string;
  };
  revisions?: Array<{
    id: number;
    version_number: number;
    change_summary?: string;
    created_at: string;
    creator?: {
      name: string;
    };
  }>;
}

interface Props {
  profile: ProfileProps;
  allProfiles: Array<{ id: number; code: string; name: string; service_group: string }>;
}

export default function ServiceProfileShow({ profile, allProfiles }: Props) {
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const getGroupBadge = (group: string) => {
    switch (group) {
      case 'clinical':
        return {
          label: 'บริการทางคลินิก',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <Stethoscope className="w-4 h-4 text-rose-600" />,
        };
      case 'diagnostic_support':
        return {
          label: 'วินิจฉัย & สนับสนุนการแพทย์',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <FlaskConical className="w-4 h-4 text-blue-600" />,
        };
      case 'general_support':
        return {
          label: 'สนับสนุนทั่วไป & บริหาร',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Briefcase className="w-4 h-4 text-amber-600" />,
        };
      case 'quality_safety':
        return {
          label: 'คุณภาพ & ความปลอดภัย',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
        };
      default:
        return {
          label: 'ทั่วไป',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Building2 className="w-4 h-4 text-slate-500" />,
        };
    }
  };

  const groupInfo = getGroupBadge(profile.service_group);

  return (
    <AppLayout
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'Service Profile', href: '/ha/service-profile' },
        { title: profile.name, href: `/ha/service-profile/${profile.id}` },
      ]}
    >
      <Head title={`Service Profile - ${profile.name}`} />

      <div className="min-h-screen bg-slate-50/60 pb-16 font-sans">
        {/* Header Hero */}
        <div className="bg-white border-b border-slate-200/90 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Link
                href="/ha/service-profile"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับสู่รายการ Service Profile ทั้งหมด</span>
              </Link>

              {/* Department Quick Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">สลับดูแผนกอื่น:</span>
                <select
                  value={profile.id}
                  onChange={(e) => {
                    window.location.href = `/ha/service-profile/${e.target.value}`;
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none cursor-pointer"
                >
                  {allProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-sm px-2.5 py-1 rounded bg-slate-900 text-amber-300 tracking-wider">
                    {profile.code}
                  </span>
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5", groupInfo.badge)}>
                    {groupInfo.icon}
                    <span>{groupInfo.label}</span>
                  </span>
                  {profile.team && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      ทีมนำ: [{profile.team.abbreviation}] {profile.team.name_th}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    เวอร์ชัน #{profile.current_version}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {profile.name}
                </h1>

                {profile.leader_name && (
                  <p className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>ผู้รับผิดชอบหลัก / หัวหน้าหน่วยงาน: <strong className="text-slate-800">{profile.leader_name}</strong></span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowRevisionModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <History className="w-4 h-4 text-slate-500" />
                  <span>ประวัติเวอร์ชัน ({profile.revisions?.length ?? 0})</span>
                </button>

                <Link
                  href={`/ha/service-profile/${profile.id}/print`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-2xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร (A4)</span>
                </Link>

                <Link
                  href={`/ha/service-profile/${profile.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  <span>แก้ไขข้อมูล</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Body Content: 5 Standard HA Dimensions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* ================= 1. CONTEXT ================= */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-6 p-6 sm:p-8">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-black text-sm flex items-center justify-center border border-indigo-100">
                  1
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">บริบทหน่วยงาน (Context)</h2>
                  <p className="text-xs text-slate-500">หน้าที่ เป้าหมาย ขอบเขตบริการ ผู้รับผลงาน และความเสี่ยงสำคัญ</p>
                </div>
              </div>
            </div>

            {/* ก. หน้าที่และเป้าหมาย */}
            {profile.purpose && (
              <div className="space-y-1.5">
                <div className="bg-indigo-50/80 px-3 py-1.5 rounded-lg border-l-4 border-indigo-600 text-xs font-bold text-indigo-950 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-indigo-700" />
                  <span>ก. หน้าที่และเป้าหมาย (Purpose)</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-2 py-1">
                  {profile.purpose}
                </div>
              </div>
            )}

            {/* ข. ขอบเขตการให้บริการ */}
            {profile.scope_of_service && (
              <div className="space-y-1.5">
                <div className="bg-sky-50/80 px-3 py-1.5 rounded-lg border-l-4 border-sky-600 text-xs font-bold text-sky-950 flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-sky-700" />
                  <span>ข. ขอบเขตการให้บริการ ศักยภาพ และข้อจำกัด (Scope of Service)</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-2 py-1">
                  {profile.scope_of_service}
                </div>
              </div>
            )}

            {/* ค. ผู้รับผลงานและความต้องการสำคัญ */}
            {profile.target_customers && profile.target_customers.length > 0 && (
              <div className="space-y-2">
                <div className="bg-teal-50/80 px-3 py-1.5 rounded-lg border-l-4 border-teal-600 text-xs font-bold text-teal-950 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-teal-700" />
                  <span>ค. ผู้รับผลงานและความต้องการสำคัญ (Target Customers & Key Requirements)</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="p-2.5 text-left w-1/4">กลุ่มผู้รับผลงาน (ลูกค้า)</th>
                        <th className="p-2.5 text-left">ความต้องการสำคัญ</th>
                        <th className="p-2.5 text-left w-1/3">การตอบสนองของหน่วยงาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profile.target_customers.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-2.5 font-bold text-slate-900 align-top bg-slate-50/30">{c.customer}</td>
                          <td className="p-2.5 leading-relaxed text-slate-700 align-top whitespace-pre-wrap">{c.requirement}</td>
                          <td className="p-2.5 leading-relaxed text-slate-700 align-top whitespace-pre-wrap">{c.response || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ง. ประเด็นคุณภาพสำคัญ */}
            {profile.key_quality_issues && (
              <div className="space-y-1.5">
                <div className="bg-rose-50/80 px-3 py-1.5 rounded-lg border-l-4 border-rose-600 text-xs font-bold text-rose-950 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                  <span>ง. ประเด็นคุณภาพที่สำคัญ (Key Quality Issues)</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-2 py-1 bg-rose-50/20 rounded-lg border border-rose-100">
                  {profile.key_quality_issues}
                </div>
              </div>
            )}

            {/* จ. ความท้าทายและความเสี่ยงสำคัญ */}
            {profile.key_risks_challenges && (
              <div className="space-y-1.5">
                <div className="bg-amber-50/80 px-3 py-1.5 rounded-lg border-l-4 border-amber-600 text-xs font-bold text-amber-950 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>จ. ความท้าทายหรือความเสี่ยงที่สำคัญ (Clinical & Non-Clinical Risks)</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-2 py-1 bg-amber-50/20 rounded-lg border border-amber-100">
                  {profile.key_risks_challenges}
                </div>
              </div>
            )}
          </div>

          {/* ================= 2. KEY PROCESSES ================= */}
          {profile.key_processes && profile.key_processes.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 font-black text-sm flex items-center justify-center border border-purple-100">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">กระบวนการสำคัญ (Key Processes)</h2>
                  <p className="text-xs text-slate-500">ขั้นตอนการปฏิบัติงาน สิ่งที่คาดหวัง และตัวชี้วัดกำกับกระบวนการ</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-950/5 text-slate-900 font-bold border-b border-slate-200">
                      <th className="p-3 text-left w-1/3">กระบวนการสำคัญ (Key Process)</th>
                      <th className="p-3 text-left">สิ่งที่คาดหวัง / ข้อกำหนด (Requirements)</th>
                      <th className="p-3 text-left w-1/3">ตัวชี้วัดสำคัญ (Indicators)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profile.key_processes.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 align-top">
                        <td className="p-3 font-bold text-slate-900 bg-slate-50/30 whitespace-pre-wrap leading-relaxed">{row.process}</td>
                        <td className="p-3 text-slate-700 whitespace-pre-wrap leading-relaxed">{row.expectation}</td>
                        <td className="p-3 text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{row.kpi || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 3. PERFORMANCE INDICATORS ================= */}
          {profile.performance_indicators && profile.performance_indicators.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 font-black text-sm flex items-center justify-center border border-sky-100">
                    3
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">ตัวชี้วัดผลการดำเนินงาน (Performance Indicators)</h2>
                    <p className="text-xs text-slate-500">ติดตามผลลัพธ์รายปีย้อนหลัง 5–6 ปี (พ.ศ. 2564–2569) รวม {profile.performance_indicators.length} ตัวชี้วัด</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-xs border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      <th className="p-3 text-center w-12 shrink-0">ลำดับ</th>
                      <th className="p-3 text-left w-[42%]">เครื่องชี้วัดผลการดำเนินงาน</th>
                      <th className="p-3 text-center w-[14%]">เป้าหมาย</th>
                      <th className="p-3 text-center w-[6.5%] text-slate-300 font-medium">ปี 64</th>
                      <th className="p-3 text-center w-[6.5%] text-slate-300 font-medium">ปี 65</th>
                      <th className="p-3 text-center w-[6.5%] text-slate-300 font-medium">ปี 66</th>
                      <th className="p-3 text-center w-[6.5%] text-slate-300 font-medium">ปี 67</th>
                      <th className="p-3 text-center w-[6.5%] text-slate-300 font-medium">ปี 68</th>
                      <th className="p-3 text-center w-[8.5%] font-black bg-amber-500 text-slate-950 border-l border-amber-400">
                        ปี 69
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {profile.performance_indicators.map((kpi, idx) => {
                      const hasSubs = kpi.sub_items && kpi.sub_items.length > 0;
                      
                      const getYrVal = (obj: any, yr: string, fallbackKey: string) => {
                        if (obj?.years && obj.years[yr] !== undefined && obj.years[yr] !== '') {
                          return obj.years[yr];
                        }
                        return obj?.[fallbackKey] || '-';
                      };

                      return (
                        <React.Fragment key={idx}>
                          {/* Main Row / Category Row */}
                          <tr className={cn(
                            "transition-colors",
                            hasSubs ? "bg-slate-50/90 font-bold border-t-2 border-slate-200 text-slate-900" : "hover:bg-slate-50/60 text-slate-800 even:bg-slate-50/30"
                          )}>
                            <td className="p-3 text-center font-bold text-slate-500 align-top">
                              {idx + 1}
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-1">
                                <span className={cn("leading-relaxed block", hasSubs ? "font-black text-slate-900 text-sm" : "font-medium text-slate-900")}>
                                  {kpi.name}
                                </span>
                                {hasSubs && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                    มี {kpi.sub_items!.length} ตัวชี้วัดย่อย
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center align-top">
                              {!hasSubs ? (
                                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {kpi.target || '-'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">ดูตามข้อย่อย</span>
                              )}
                            </td>
                            <td className="p-3 text-center align-top text-slate-600 font-medium">
                              {!hasSubs ? getYrVal(kpi, '2564', 'y2564') : '-'}
                            </td>
                            <td className="p-3 text-center align-top text-slate-600 font-medium">
                              {!hasSubs ? getYrVal(kpi, '2565', 'y2565') : '-'}
                            </td>
                            <td className="p-3 text-center align-top text-slate-600 font-medium">
                              {!hasSubs ? getYrVal(kpi, '2566', 'y2566') : '-'}
                            </td>
                            <td className="p-3 text-center align-top text-slate-600 font-medium">
                              {!hasSubs ? getYrVal(kpi, '2567', 'y2567') : '-'}
                            </td>
                            <td className="p-3 text-center align-top text-slate-600 font-medium">
                              {!hasSubs ? getYrVal(kpi, '2568', 'y2568') : '-'}
                            </td>
                            <td className={cn(
                              "p-3 text-center align-top font-bold border-l border-amber-200/80",
                              !hasSubs ? "text-amber-950 bg-amber-50/70" : "text-slate-400 bg-amber-50/30"
                            )}>
                              {!hasSubs ? getYrVal(kpi, '2569', 'y2569') : '-'}
                            </td>
                          </tr>

                          {/* Sub-item Rows (Each sub-indicator has its own aligned row!) */}
                          {hasSubs && kpi.sub_items!.map((sub, sIdx) => (
                            <tr key={`${idx}-sub-${sIdx}`} className="bg-white hover:bg-slate-50/80 transition-colors border-l-4 border-indigo-400">
                              <td className="p-2.5 text-center text-xs font-mono font-medium text-slate-400 align-top">
                                {idx + 1}.{sIdx + 1}
                              </td>
                              <td className="p-2.5 pl-6 align-top">
                                <div className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  <span className="text-slate-800 font-medium leading-relaxed">
                                    {sub.name}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-center align-top">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {sub.target || '-'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center align-top text-slate-600 font-medium">
                                {sub.years?.['2564'] || '-'}
                              </td>
                              <td className="p-2.5 text-center align-top text-slate-600 font-medium">
                                {sub.years?.['2565'] || '-'}
                              </td>
                              <td className="p-2.5 text-center align-top text-slate-600 font-medium">
                                {sub.years?.['2566'] || '-'}
                              </td>
                              <td className="p-2.5 text-center align-top text-slate-600 font-medium">
                                {sub.years?.['2567'] || '-'}
                              </td>
                              <td className="p-2.5 text-center align-top text-slate-600 font-medium">
                                {sub.years?.['2568'] || '-'}
                              </td>
                              <td className="p-2.5 text-center align-top font-black text-amber-950 bg-amber-50/60 border-l border-amber-200/80">
                                {sub.years?.['2569'] || '-'}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 4. CURRENT SYSTEMS & CQI ================= */}
          {(profile.current_systems || profile.ongoing_improvements) && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-6 p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm flex items-center justify-center border border-emerald-100">
                  4
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">กระบวนการหรือระบบงานเพื่อบรรลุเป้าหมายและมีคุณภาพ</h2>
                  <p className="text-xs text-slate-500">ระบบงานปัจจุบัน โครงการ CQI ที่เสร็จสิ้นแล้ว และการพัฒนาที่อยู่ระหว่างดำเนินการ</p>
                </div>
              </div>

              {profile.current_systems && (
                <div className="space-y-1.5">
                  <div className="bg-emerald-50/80 px-3 py-1.5 rounded-lg border-l-4 border-emerald-600 text-xs font-bold text-emerald-950 flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-emerald-700" />
                    <span>4.1 ระบบงานที่ใช้อยู่ในปัจจุบัน (รวมทั้งโครงการ CQI ที่เสร็จสิ้นแล้ว)</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-2 py-1 bg-emerald-50/15 rounded-lg border border-emerald-100/60">
                    {profile.current_systems}
                  </div>
                </div>
              )}

              {profile.ongoing_improvements && (
                <div className="space-y-1.5">
                  <div className="bg-purple-50/80 px-3 py-1.5 rounded-lg border-l-4 border-purple-600 text-xs font-bold text-purple-950 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                    <span>4.2 การพัฒนาคุณภาพที่อยู่ระหว่างดำเนินการ</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-2 py-1">
                    {profile.ongoing_improvements}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 5. FUTURE PLANS ================= */}
          {profile.future_plans && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-6 sm:p-8">
              <div className="border-b border-slate-100 pb-4 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 font-black text-sm flex items-center justify-center border border-amber-100">
                  5
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900">แผนการพัฒนาต่อเนื่อง (Future Continuous Quality Improvement Plans)</h2>
                  <p className="text-xs text-slate-500">ทิศทางการพัฒนาในระยะ 1–3 ปีข้างหน้าของหน่วยงาน</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap p-4 bg-amber-50/30 rounded-xl border border-amber-200/80">
                {profile.future_plans}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revision History & Restore Modal */}
      {showRevisionModal && (
        <RevisionHistoryModal
          profileId={profile.id}
          currentVersion={profile.current_version}
          revisions={profile.revisions || []}
          onClose={() => setShowRevisionModal(false)}
        />
      )}
    </AppLayout>
  );
}
