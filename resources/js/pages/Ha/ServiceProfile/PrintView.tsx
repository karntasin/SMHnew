import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
  Printer, 
  ArrowLeft, 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  Briefcase, 
  ShieldCheck, 
  Target, 
  Compass, 
  Users, 
  TrendingUp, 
  Award,
  AlertTriangle,
  GitFork,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface Props {
  profile: ProfileProps;
}

export default function ServiceProfilePrintView({ profile }: Props) {
  const getGroupBadge = (group: string) => {
    switch (group) {
      case 'clinical':
        return { label: 'กลุ่มบริการทางคลินิก (Clinical Services)', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'diagnostic_support':
        return { label: 'กลุ่มวินิจฉัยและสนับสนุนการแพทย์ (Diagnostic & Medical Support)', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'general_support':
        return { label: 'กลุ่มสนับสนุนทั่วไปและบริหารจัดการ (General & Admin Support)', badge: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'quality_safety':
        return { label: 'กลุ่มงานคุณภาพและความปลอดภัย (Quality & Safety)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      default:
        return { label: 'ทั่วไป', badge: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const groupInfo = getGroupBadge(profile.service_group);

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:bg-white text-slate-900 font-sans print-portrait">
      <Head title={`พิมพ์ Service Profile - ${profile.name}`} />

      {/* Screen action bar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 px-4 flex items-center justify-between print:hidden">
        <Link
          href={`/ha/service-profile/${profile.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-amber-600 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้ารายละเอียด</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">แนะนำ: ขนาดกระดาษ A4 แนวตั้ง (Portrait)</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เอกสารนี้ (Print / Save PDF)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 print:border-none p-10 sm:p-14 shadow-lg print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] uppercase tracking-widest text-slate-700 font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>เอกสารข้อมูลการจัดบริการประจำหน่วยงาน (Service Profile)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            โรงพยาบาลค่ายสุรสิงหนาท
          </h1>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="font-mono font-black text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300 text-sm">
              [{profile.code}]
            </span>
            <span className="text-xl font-black text-slate-900">
              {profile.name}
            </span>
          </div>

          {/* Metadata Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className={cn("px-2.5 py-1 rounded-md font-semibold border", groupInfo.badge)}>
              {groupInfo.label}
            </span>
            {profile.team && (
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                ทีมนำ: <strong>[{profile.team.abbreviation}] {profile.team.name_th}</strong>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
              รอบปี: <strong>พ.ศ. {profile.cycle_year}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
              เวอร์ชัน: <strong>#{profile.current_version}</strong>
            </span>
          </div>

          {profile.leader_name && (
            <div className="mt-2 text-xs text-slate-600">
              ผู้รับผิดชอบหลัก: <strong className="text-slate-800">{profile.leader_name}</strong>
            </div>
          )}
        </div>

        {/* 5 Parts Body */}
        <div className="space-y-7">
          {/* ================= 1. CONTEXT ================= */}
          <div className="space-y-4 print-break-inside-avoid">
            <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">1</span>
              <span>บริบทหน่วยงาน (Context)</span>
            </div>

            {/* Purpose */}
            {profile.purpose && (
              <div className="space-y-1">
                <div className="bg-indigo-50 px-3 py-1.5 rounded-md font-bold text-xs text-indigo-950 border-l-4 border-indigo-600">
                  ก. หน้าที่และเป้าหมาย (Purpose)
                </div>
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                  {profile.purpose}
                </div>
              </div>
            )}

            {/* Scope */}
            {profile.scope_of_service && (
              <div className="space-y-1">
                <div className="bg-sky-50 px-3 py-1.5 rounded-md font-bold text-xs text-sky-950 border-l-4 border-sky-600">
                  ข. ขอบเขตการให้บริการ ศักยภาพ และข้อจำกัด (Scope of Service)
                </div>
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                  {profile.scope_of_service}
                </div>
              </div>
            )}

            {/* Target Customers */}
            {profile.target_customers && profile.target_customers.length > 0 && (
              <div className="space-y-1.5">
                <div className="bg-teal-50 px-3 py-1.5 rounded-md font-bold text-xs text-teal-950 border-l-4 border-teal-600">
                  ค. ผู้รับผลงานและความต้องการสำคัญ (Target Customers & Requirements)
                </div>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-left w-1/4">ผู้รับผลงาน</th>
                      <th className="p-2 border-r border-slate-300 text-left">ความต้องการสำคัญ</th>
                      <th className="p-2 text-left w-1/3">การตอบสนอง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {profile.target_customers.map((c, idx) => (
                      <tr key={idx} className="align-top hover:bg-slate-50/50">
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900 bg-slate-50/30">{c.customer}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 leading-relaxed">{c.requirement}</td>
                        <td className="p-2 text-slate-700 leading-relaxed">{c.response || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Issues */}
            {profile.key_quality_issues && (
              <div className="space-y-1">
                <div className="bg-rose-50 px-3 py-1.5 rounded-md font-bold text-xs text-rose-950 border-l-4 border-rose-600">
                  ง. ประเด็นคุณภาพที่สำคัญ (Key Quality Issues)
                </div>
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-rose-50/20 rounded border border-rose-100">
                  {profile.key_quality_issues}
                </div>
              </div>
            )}

            {/* Risks */}
            {profile.key_risks_challenges && (
              <div className="space-y-1">
                <div className="bg-amber-50 px-3 py-1.5 rounded-md font-bold text-xs text-amber-950 border-l-4 border-amber-600">
                  จ. ความท้าทายและความเสี่ยงที่สำคัญ (Clinical & Non-Clinical Risks)
                </div>
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-amber-50/20 rounded border border-amber-100">
                  {profile.key_risks_challenges}
                </div>
              </div>
            )}
          </div>

          {/* ================= 2. KEY PROCESSES ================= */}
          {profile.key_processes && profile.key_processes.length > 0 && (
            <div className="space-y-2.5 print-break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">2</span>
                <span>กระบวนการสำคัญ (Key Processes)</span>
              </div>
              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-purple-950/10 text-slate-900 font-bold border-b border-slate-300">
                    <th className="p-2.5 border-r border-slate-300 text-left w-1/3">กระบวนการสำคัญ (Key Process)</th>
                    <th className="p-2.5 border-r border-slate-300 text-left">สิ่งที่คาดหวัง / ข้อกำหนด (Requirements)</th>
                    <th className="p-2.5 text-left w-1/3">ตัวชี้วัดสำคัญ (Indicators)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {profile.key_processes.map((row, idx) => (
                    <tr key={idx} className="align-top hover:bg-slate-50/50">
                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 bg-slate-50/30 whitespace-pre-wrap leading-relaxed">{row.process}</td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">{row.expectation}</td>
                      <td className="p-2.5 text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{row.kpi || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= 3. PERFORMANCE INDICATORS ================= */}
          {profile.performance_indicators && profile.performance_indicators.length > 0 && (
            <div className="space-y-2.5 print-break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">3</span>
                <span>ตัวชี้วัดผลการดำเนินงาน 6 ปี (Performance Indicators 2564–2569)</span>
              </div>
              <table className="w-full text-xs border border-slate-400 border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold border-b border-slate-400">
                    <th className="p-2 border-r border-slate-400 text-center w-9">No</th>
                    <th className="p-2 border-r border-slate-400 text-left w-[42%]">เครื่องชี้วัดผลการดำเนินงาน</th>
                    <th className="p-2 border-r border-slate-400 text-center w-[13%]">เป้าหมาย</th>
                    <th className="p-2 border-r border-slate-400 text-center w-[6.5%] text-slate-200">ปี 64</th>
                    <th className="p-2 border-r border-slate-400 text-center w-[6.5%] text-slate-200">ปี 65</th>
                    <th className="p-2 border-r border-slate-400 text-center w-[6.5%] text-slate-200">ปี 66</th>
                    <th className="p-2 border-r border-slate-400 text-center w-[6.5%] text-slate-200">ปี 67</th>
                    <th className="p-2 border-r border-slate-400 text-center w-[6.5%] text-slate-200">ปี 68</th>
                    <th className="p-2 text-center w-[8.5%] font-black bg-amber-400 text-slate-950">ปี 69</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {profile.performance_indicators.map((kpi, idx) => {
                    const hasSubs = kpi.sub_items && kpi.sub_items.length > 0;
                    
                    const getYr = (obj: any, yr: string, fallbackKey: string) => {
                      if (obj?.years && obj.years[yr] !== undefined && obj.years[yr] !== '') {
                        return obj.years[yr];
                      }
                      return obj?.[fallbackKey] || '-';
                    };

                    return (
                      <React.Fragment key={idx}>
                        {/* Main Category Row */}
                        <tr className={cn(
                          "align-top",
                          hasSubs ? "bg-slate-100 font-bold border-t-2 border-slate-400" : "even:bg-slate-50/60"
                        )}>
                          <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-600 bg-slate-50/50">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-300 leading-snug">
                            <span className={cn(hasSubs ? "font-bold text-slate-900" : "font-medium text-slate-900")}>
                              {kpi.name}
                            </span>
                            {hasSubs && (
                              <span className="text-[10px] text-indigo-700 ml-1.5 font-semibold">
                                ({kpi.sub_items!.length} ข้อย่อย)
                              </span>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-bold text-indigo-800">
                            {!hasSubs ? (kpi.target || '-') : <span className="text-slate-400 italic text-[10px]">ดูข้อย่อย</span>}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center text-slate-700">
                            {!hasSubs ? getYr(kpi, '2564', 'y2564') : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center text-slate-700">
                            {!hasSubs ? getYr(kpi, '2565', 'y2565') : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center text-slate-700">
                            {!hasSubs ? getYr(kpi, '2566', 'y2566') : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center text-slate-700">
                            {!hasSubs ? getYr(kpi, '2567', 'y2567') : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center text-slate-700">
                            {!hasSubs ? getYr(kpi, '2568', 'y2568') : '-'}
                          </td>
                          <td className={cn(
                            "p-2 text-center font-bold",
                            !hasSubs ? "text-amber-950 bg-amber-50" : "text-slate-400"
                          )}>
                            {!hasSubs ? getYr(kpi, '2569', 'y2569') : '-'}
                          </td>
                        </tr>

                        {/* Sub-item Rows (Each sub-indicator has its own aligned row!) */}
                        {hasSubs && kpi.sub_items!.map((sub, sIdx) => (
                          <tr key={`${idx}-sub-${sIdx}`} className="align-top bg-white">
                            <td className="p-1.5 border-r border-slate-300 text-center text-[10px] font-mono text-slate-500">
                              {idx + 1}.{sIdx + 1}
                            </td>
                            <td className="p-1.5 pl-5 border-r border-slate-300 leading-snug">
                              <span className="text-slate-800 font-medium">
                                • {sub.name}
                              </span>
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold text-indigo-700">
                              {sub.target || '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center text-slate-700">
                              {sub.years?.['2564'] || '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center text-slate-700">
                              {sub.years?.['2565'] || '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center text-slate-700">
                              {sub.years?.['2566'] || '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center text-slate-700">
                              {sub.years?.['2567'] || '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center text-slate-700">
                              {sub.years?.['2568'] || '-'}
                            </td>
                            <td className="p-1.5 text-center font-black text-amber-950 bg-amber-100/50">
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
          )}

          {/* ================= 4. CURRENT SYSTEMS & CQI ================= */}
          {(profile.current_systems || profile.ongoing_improvements) && (
            <div className="space-y-3 print-break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">4</span>
                <span>กระบวนการหรือระบบงานเพื่อบรรลุเป้าหมายและมีคุณภาพ (CQI)</span>
              </div>

              {profile.current_systems && (
                <div className="space-y-1">
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-md font-bold text-xs text-emerald-950 border-l-4 border-emerald-600">
                    4.1 ระบบงานที่ใช้อยู่ในปัจจุบัน (รวมทั้งโครงการ CQI ที่สำเร็จแล้ว)
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                    {profile.current_systems}
                  </div>
                </div>
              )}

              {profile.ongoing_improvements && (
                <div className="space-y-1">
                  <div className="bg-purple-50 px-3 py-1.5 rounded-md font-bold text-xs text-purple-950 border-l-4 border-purple-600">
                    4.2 การพัฒนาคุณภาพที่อยู่ระหว่างดำเนินการ
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                    {profile.ongoing_improvements}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 5. FUTURE PLANS ================= */}
          {profile.future_plans && (
            <div className="space-y-2 print-break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">5</span>
                <span>แผนการพัฒนาต่อเนื่อง (Future Continuous Quality Improvement Plans)</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-amber-50/20 rounded border border-amber-100">
                {profile.future_plans}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
