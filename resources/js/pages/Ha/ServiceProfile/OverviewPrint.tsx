import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
  Printer, 
  ArrowLeft, 
  Table, 
  BookOpen, 
  Building2, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  Activity,
  Briefcase,
  FlaskConical,
  Stethoscope
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

interface ProfileItem {
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
  profiles: ProfileItem[];
  currentDepartment: string;
  currentTeam: string;
  currentGroup: string;
  stats: {
    total: number;
    clinical: number;
    diagnostic_support: number;
    general_support: number;
    quality_safety: number;
    total_kpis: number;
  };
}

export default function ServiceProfileOverviewPrint({
  profiles,
  currentDepartment,
  currentTeam,
  currentGroup,
  stats,
}: Props) {
  const [viewMode, setViewMode] = useState<'matrix' | 'dossier'>('matrix');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [selectedGroup, setSelectedGroup] = useState<string>(currentGroup || 'all');

  const filteredProfiles = profiles.filter((p) => {
    if (selectedGroup === 'all') return true;
    return p.service_group === selectedGroup;
  });

  const getGroupBadge = (group: string) => {
    switch (group) {
      case 'clinical':
        return { label: 'บริการคลินิก', badge: 'bg-rose-100 text-rose-800 border-rose-300', codeColor: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'diagnostic_support':
        return { label: 'วินิจฉัย/หนุนแพทย์', badge: 'bg-blue-100 text-blue-800 border-blue-300', codeColor: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'general_support':
        return { label: 'สนับสนุนทั่วไป', badge: 'bg-amber-100 text-amber-800 border-amber-300', codeColor: 'text-amber-800 bg-amber-50 border-amber-300' };
      case 'quality_safety':
        return { label: 'คุณภาพ/ปลอดภัย', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', codeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      default:
        return { label: 'ทั่วไป', badge: 'bg-slate-100 text-slate-800 border-slate-300', codeColor: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  const getSummarySnippet = (text?: string, maxLen: number = 200) => {
    if (!text) return '-';
    const clean = text.replace(/[\r\n]+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen) + '...';
  };

  return (
    <div className={cn(
      "bg-slate-100 min-h-screen py-8 print:py-0 print:bg-white text-slate-900 font-sans",
      printOrientation === 'landscape' ? 'print-landscape' : 'print-portrait'
    )}>
      <Head title="พิมพ์รายงานสรุปภาพรวม Service Profile - โรงพยาบาลค่ายสุรสิงหนาท" />

      {/* Screen action bar (Hidden on Print) */}
      <div className={cn(
        "mx-auto mb-6 px-4 print:hidden space-y-4",
        printOrientation === 'landscape' ? 'max-w-[1240px]' : 'max-w-5xl'
      )}>
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <Link
            href="/ha/service-profile"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-amber-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่หน้าแดชบอร์ด</span>
          </Link>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => {
                setViewMode('matrix');
                setPrintOrientation('landscape');
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === 'matrix'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Table className="w-3.5 h-3.5 text-amber-600" />
              <span>ตารางสรุปผู้บริหาร (Executive Matrix)</span>
            </button>
            <button
              onClick={() => {
                setViewMode('dossier');
                setPrintOrientation('portrait');
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === 'dossier'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>เล่มรายงานฉบับเต็ม (Full Dossier)</span>
            </button>
          </div>

          {/* Orientation Switcher & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium">
              <button
                onClick={() => setPrintOrientation('landscape')}
                title="พิมพ์แนวนอน (A4 Landscape)"
                className={cn(
                  "px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer",
                  printOrientation === 'landscape' ? "bg-white text-amber-800 font-bold shadow-xs" : "text-slate-500"
                )}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">แนวนอน</span>
              </button>
              <button
                onClick={() => setPrintOrientation('portrait')}
                title="พิมพ์แนวตั้ง (A4 Portrait)"
                className={cn(
                  "px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer",
                  printOrientation === 'portrait' ? "bg-white text-amber-800 font-bold shadow-xs" : "text-slate-500"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">แนวตั้ง</span>
              </button>
            </div>

            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">ทุกสายงาน ({stats.total} แผนก)</option>
              <option value="clinical">🩺 บริการคลินิก ({stats.clinical})</option>
              <option value="diagnostic_support">🔬 วินิจฉัย & สนับสนุนแพทย์ ({stats.diagnostic_support})</option>
              <option value="general_support">🏢 สนับสนุนทั่วไป ({stats.general_support})</option>
              <option value="quality_safety">🛡️ คุณภาพ & ปลอดภัย ({stats.quality_safety})</option>
            </select>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร / บันทึก PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className={cn(
        "mx-auto bg-white border border-slate-200 print:border-none p-8 sm:p-12 shadow-lg print:shadow-none print:p-0 transition-all",
        printOrientation === 'landscape' ? 'max-w-[1240px]' : 'max-w-5xl'
      )}>
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] uppercase tracking-widest text-slate-700 font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>รายงานสรุปภาพรวมข้อมูลการจัดบริการประจำหน่วยงาน (Service Profile Executive Report)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            โรงพยาบาลค่ายสุรสิงหนาท
          </h1>
          <div className="text-sm font-bold text-amber-800 mt-1">
            {viewMode === 'matrix' 
              ? 'ตารางสรุปสาระสำคัญผู้บริหาร (Executive Master Matrix 21 แผนก/หน่วยงาน)' 
              : 'เล่มรายงานข้อมูลการจัดบริการฉบับสมบูรณ์ (Comprehensive Service Profile Dossier)'}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-3">
            <span>พิมพ์วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>•</span>
            <span>จำนวนหน่วยงาน: {filteredProfiles.length} หน่วยงาน</span>
            <span>•</span>
            <span>ตัวชี้วัดผลการดำเนินงานรวม: {stats.total_kpis} รายการ</span>
            <span>•</span>
            <span>รอบปีประเมิน พ.ศ. 2569</span>
          </div>
        </div>

        {/* Executive Stats Bar (Printable) */}
        <div className="grid grid-cols-4 gap-3 mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
          <div>
            <div className="text-slate-500 font-medium">หน่วยงานทั้งหมด</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</div>
          </div>
          <div>
            <div className="text-rose-700 font-medium">บริการทางคลินิก</div>
            <div className="text-xl font-black text-rose-700 mt-0.5">{stats.clinical}</div>
          </div>
          <div>
            <div className="text-blue-700 font-medium">วินิจฉัย & สนับสนุนการแพทย์</div>
            <div className="text-xl font-black text-blue-700 mt-0.5">{stats.diagnostic_support}</div>
          </div>
          <div>
            <div className="text-amber-800 font-medium">สนับสนุนทั่วไป & คุณภาพ</div>
            <div className="text-xl font-black text-amber-800 mt-0.5">{stats.general_support + stats.quality_safety}</div>
          </div>
        </div>

        {/* ================= MODE 1: EXECUTIVE MASTER MATRIX ================= */}
        {viewMode === 'matrix' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>ตารางสรุปสาระสำคัญข้อมูลการจัดบริการรายหน่วยงาน (Executive Service Profile Matrix)</span>
              <span className="text-[11px] text-slate-500 font-normal">จัดพิมพ์แบบ: {printOrientation === 'landscape' ? 'แนวนอน (A4 Landscape)' : 'แนวตั้ง (A4 Portrait)'}</span>
            </div>

            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-700 text-center w-10">ลำดับ</th>
                  <th className="p-2 border-r border-slate-700 text-left w-32">หน่วยงาน / รหัส</th>
                  <th className="p-2 border-r border-slate-700 text-center w-24">กลุ่ม / ทีมนำ</th>
                  <th className="p-2 border-r border-slate-700 text-left w-[26%]">หน้าที่และเป้าหมาย (Purpose)</th>
                  <th className="p-2 border-r border-slate-700 text-left w-[26%]">ประเด็นคุณภาพ & จุดเสี่ยงสำคัญ</th>
                  <th className="p-2 border-r border-slate-700 text-left w-[13%]">ตัวชี้วัดสำคัญ (เป้า/ปี 69)</th>
                  <th className="p-2 text-center w-12">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProfiles.map((p, idx) => {
                  const groupTheme = getGroupBadge(p.service_group);
                  const firstKpi = p.performance_indicators && p.performance_indicators.length > 0 ? p.performance_indicators[0] : null;

                  return (
                    <tr key={p.id} className="align-top hover:bg-slate-50/50 print-break-inside-avoid">
                      <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-500 bg-slate-50/30">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <span className={cn("font-mono font-bold block text-[11px] px-1.5 py-0.5 rounded border mb-1 w-fit", groupTheme.codeColor)}>
                          {p.code}
                        </span>
                        <span className="font-bold text-slate-900 text-xs block leading-snug">{p.name}</span>
                        {p.leader_name && <span className="text-[10px] text-slate-500 block mt-0.5 truncate">{p.leader_name}</span>}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border inline-block whitespace-nowrap mb-1", groupTheme.badge)}>
                          {groupTheme.label}
                        </span>
                        {p.team && (
                          <span className="block text-[10px] text-slate-500 font-mono">
                            [{p.team.abbreviation}]
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 leading-relaxed text-[11.5px] text-slate-800">
                        {getSummarySnippet(p.purpose, 200)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 leading-relaxed text-[11.5px] text-slate-800">
                        {p.key_quality_issues && (
                          <div className="mb-1">
                            <strong className="text-slate-900 block text-[11px]">ประเด็นคุณภาพ:</strong>
                            <span>{getSummarySnippet(p.key_quality_issues, 100)}</span>
                          </div>
                        )}
                        {p.key_risks_challenges && (
                          <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                            <strong className="text-amber-900 block text-[11px]">จุดเสี่ยง:</strong>
                            <span>{getSummarySnippet(p.key_risks_challenges, 100)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-[11px] bg-slate-50/20">
                        {firstKpi ? (() => {
                          const hasSubs = firstKpi.sub_items && firstKpi.sub_items.length > 0;
                          const displayKpiName = hasSubs ? `${firstKpi.name}: ${firstKpi.sub_items![0].name}` : firstKpi.name;
                          const displayTarget = hasSubs ? (firstKpi.sub_items![0].target || '-') : (firstKpi.target || '-');
                          const displayY69 = hasSubs 
                            ? (firstKpi.sub_items![0].years?.['2569'] || firstKpi.sub_items![0].years?.['2568'] || '-')
                            : (firstKpi.years?.['2569'] || firstKpi.y2569 || firstKpi.y2568 || '-');

                          return (
                            <div>
                              <div className="font-semibold text-slate-900 line-clamp-2 leading-tight">{displayKpiName}</div>
                              <div className="text-[10.5px] mt-1.5 space-y-0.5">
                                <div className="text-slate-500">เป้า: <strong className="text-indigo-700">{displayTarget}</strong></div>
                                <div className="text-slate-700">ปี 69: <strong className="text-amber-900 font-black">{displayY69}</strong></div>
                              </div>
                              <div className="text-[9.5px] text-slate-400 mt-1">
                                (+ อีก {Math.max(0, (p.performance_indicators?.length ?? 1) - 1)} ตัวชี้วัด)
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center text-[10px]">
                        <span className="font-semibold text-emerald-700 block">สมบูรณ์</span>
                        <span className="text-slate-400 font-mono">v{p.current_version}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= MODE 2: FULL COMPREHENSIVE DOSSIER ================= */}
        {viewMode === 'dossier' && (
          <div className="space-y-12">
            {filteredProfiles.map((p, idx) => {
              const groupTheme = getGroupBadge(p.service_group);

              return (
                <div 
                  key={p.id} 
                  className={`space-y-6 print-break-inside-avoid ${idx > 0 ? 'print-break-before-page pt-6' : ''}`}
                >
                  {/* Department Header Banner */}
                  <div className="bg-slate-900 text-white p-3.5 rounded-lg flex items-center justify-between shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-amber-300 text-sm bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {p.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">ลำดับที่ {idx + 1}</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", groupTheme.badge)}>
                          {groupTheme.label}
                        </span>
                      </div>
                      <h2 className="text-base font-black tracking-tight">{p.name}</h2>
                      {p.leader_name && <p className="text-xs text-slate-300 mt-0.5">หน.หน่วยงาน: {p.leader_name}</p>}
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <div>เวอร์ชัน #{p.current_version}</div>
                      <div>ทีมนำ: {p.team?.name_th ?? 'คณะกรรมการคุณภาพ'}</div>
                    </div>
                  </div>

                  {/* 1. Purpose & Scope */}
                  {p.purpose && (
                    <div className="space-y-1">
                      <div className="bg-indigo-50 px-3 py-1.5 rounded-md font-bold text-xs text-indigo-950 border-l-4 border-indigo-600">
                        1. หน้าที่และเป้าหมาย (Purpose):
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                        {p.purpose}
                      </div>
                    </div>
                  )}

                  {/* 2. Key Issues & Risks */}
                  {p.key_risks_challenges && (
                    <div className="space-y-1">
                      <div className="bg-amber-50 px-3 py-1.5 rounded-md font-bold text-xs text-amber-950 border-l-4 border-amber-600">
                        2. ความท้าทายและความเสี่ยงสำคัญ (Challenges & Risks):
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-amber-50/20 rounded border border-amber-100">
                        {p.key_risks_challenges}
                      </div>
                    </div>
                  )}

                  {/* 3. Key Processes */}
                  {p.key_processes && p.key_processes.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="bg-purple-50 px-3 py-1.5 rounded-md font-bold text-xs text-purple-950 border-l-4 border-purple-600">
                        3. กระบวนการสำคัญ (Key Processes):
                      </div>
                      <table className="w-full text-xs border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-purple-950/10 text-slate-900 font-bold border-b border-slate-300">
                            <th className="p-2 border-r border-slate-300 text-left w-1/3">กระบวนการสำคัญ</th>
                            <th className="p-2 border-r border-slate-300 text-left">สิ่งที่คาดหวัง</th>
                            <th className="p-2 text-left w-1/3">ตัวชี้วัดกำกับ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {p.key_processes.slice(0, 5).map((row, pIdx) => (
                            <tr key={pIdx}>
                              <td className="p-2 border-r border-slate-200 font-bold">{row.process}</td>
                              <td className="p-2 border-r border-slate-200">{row.expectation}</td>
                              <td className="p-2">{row.kpi || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 4. Performance Indicators */}
                  {p.performance_indicators && p.performance_indicators.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="bg-sky-50 px-3 py-1.5 rounded-md font-bold text-xs text-sky-950 border-l-4 border-sky-600">
                        4. ตัวชี้วัดผลการดำเนินงาน (Performance Indicators):
                      </div>
                      <table className="w-full text-xs border border-slate-300 border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-800 text-white font-bold border-b border-slate-400">
                            <th className="p-2 border-r border-slate-400 text-left w-[46%]">ตัวชี้วัด</th>
                            <th className="p-2 border-r border-slate-400 text-center w-[14%]">เป้าหมาย</th>
                            <th className="p-2 border-r border-slate-400 text-center w-[9%] text-slate-200">ปี 66</th>
                            <th className="p-2 border-r border-slate-400 text-center w-[9%] text-slate-200">ปี 67</th>
                            <th className="p-2 border-r border-slate-400 text-center w-[9%] text-slate-200">ปี 68</th>
                            <th className="p-2 text-center w-[13%] font-black bg-amber-400 text-slate-950">ปี 69</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {p.performance_indicators.slice(0, 8).map((kpi, kIdx) => {
                            const hasSubs = kpi.sub_items && kpi.sub_items.length > 0;
                            return (
                              <React.Fragment key={kIdx}>
                                <tr className={cn("align-top", hasSubs ? "bg-slate-50 font-bold" : "even:bg-slate-50/40")}>
                                  <td className="p-2 border-r border-slate-200 leading-snug">
                                    <span className={cn(hasSubs ? "font-bold text-slate-900" : "font-medium text-slate-900")}>
                                      {kpi.name}
                                    </span>
                                    {hasSubs && <span className="text-[10px] text-indigo-700 ml-1">({kpi.sub_items!.length} ข้อย่อย)</span>}
                                  </td>
                                  <td className="p-2 border-r border-slate-200 text-center font-bold text-indigo-800">
                                    {!hasSubs ? (kpi.target || '-') : <span className="text-slate-400 text-[10px] italic">ดูข้อย่อย</span>}
                                  </td>
                                  <td className="p-2 border-r border-slate-200 text-center text-slate-700">
                                    {!hasSubs ? (kpi.years?.['2566'] || kpi.y2566 || '-') : '-'}
                                  </td>
                                  <td className="p-2 border-r border-slate-200 text-center text-slate-700">
                                    {!hasSubs ? (kpi.years?.['2567'] || kpi.y2567 || '-') : '-'}
                                  </td>
                                  <td className="p-2 border-r border-slate-200 text-center text-slate-700">
                                    {!hasSubs ? (kpi.years?.['2568'] || kpi.y2568 || '-') : '-'}
                                  </td>
                                  <td className={cn("p-2 text-center font-bold", !hasSubs ? "text-amber-950 bg-amber-50" : "text-slate-400")}>
                                    {!hasSubs ? (kpi.years?.['2569'] || kpi.y2569 || '-') : '-'}
                                  </td>
                                </tr>
                                {hasSubs && kpi.sub_items!.map((sub, sIdx) => (
                                  <tr key={`${kIdx}-sub-${sIdx}`} className="align-top bg-white">
                                    <td className="p-1.5 pl-4 border-r border-slate-200 text-slate-800 leading-snug">
                                      • {sub.name}
                                    </td>
                                    <td className="p-1.5 border-r border-slate-200 text-center font-bold text-indigo-700">
                                      {sub.target || '-'}
                                    </td>
                                    <td className="p-1.5 border-r border-slate-200 text-center text-slate-700">
                                      {sub.years?.['2566'] || '-'}
                                    </td>
                                    <td className="p-1.5 border-r border-slate-200 text-center text-slate-700">
                                      {sub.years?.['2567'] || '-'}
                                    </td>
                                    <td className="p-1.5 border-r border-slate-200 text-center text-slate-700">
                                      {sub.years?.['2568'] || '-'}
                                    </td>
                                    <td className="p-1.5 text-center font-black text-amber-950 bg-amber-50">
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

                  {/* 5. Future Plans */}
                  {p.future_plans && (
                    <div className="space-y-1">
                      <div className="bg-amber-50 px-3 py-1.5 rounded-md font-bold text-xs text-amber-950 border-l-4 border-amber-600">
                        5. แผนการพัฒนาต่อเนื่อง (Future CQI Plans):
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-amber-50/20 rounded border border-amber-100">
                        {p.future_plans}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
