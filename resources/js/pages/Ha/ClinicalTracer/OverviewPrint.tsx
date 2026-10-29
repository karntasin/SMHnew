import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
  Printer, 
  ArrowLeft, 
  Table, 
  BookOpen, 
  Activity, 
  AlertTriangle,
  Target,
  GitFork,
  TrendingUp,
  Compass,
  Monitor,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiRow {
  name: string;
  target: string;
  y2565: string;
  y2566: string;
  y2567: string;
  y2568: string;
  y2569: string;
}

interface TracerItem {
  id: number;
  code: string;
  title: string;
  subtitle?: string;
  category: 'emergency' | 'chronic' | 'infectious' | 'mental_health' | 'surgical' | 'other';
  lead_doctor_name?: string;
  lead_nurse_name?: string;
  context?: string;
  key_issues?: string;
  goals?: string;
  processes?: string;
  kpi_data?: {
    headers?: string[];
    rows?: KpiRow[];
  };
  results_analysis?: string;
  next_plans?: string;
  status: string;
  current_version: number;
  updated_at: string;
  team?: {
    name_th: string;
  };
}

interface Props {
  tracers: TracerItem[];
  currentCategory: string;
  stats: {
    total: number;
    emergency: number;
    chronic: number;
    infectious: number;
    mental_health: number;
    total_kpis: number;
  };
}

export default function OverviewPrint({ tracers, currentCategory, stats }: Props) {
  const [viewMode, setViewMode] = useState<'matrix' | 'dossier'>('matrix');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory || 'all');

  const filteredTracers = tracers.filter(t => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'emergency': return { label: 'ฉุกเฉิน/วิกฤต', badge: 'bg-rose-100 text-rose-800 border-rose-300', codeColor: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'chronic': return { label: 'โรคเรื้อรัง', badge: 'bg-blue-100 text-blue-800 border-blue-300', codeColor: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'infectious': return { label: 'โรคติดเชื้อ', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', codeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'mental_health': return { label: 'สุขภาพจิต', badge: 'bg-purple-100 text-purple-800 border-purple-300', codeColor: 'text-purple-700 bg-purple-50 border-purple-200' };
      default: return { label: 'ทั่วไป', badge: 'bg-slate-100 text-slate-800 border-slate-300', codeColor: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  // Helper to extract first clean sentence or bullet from text
  const getSummarySnippet = (text?: string, maxLen: number = 220) => {
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
      <Head title="พิมพ์รายงานภาพรวม Clinical Tracer - โรงพยาบาลค่ายสุรสิงหนาท" />

      {/* Screen action bar (Hidden on Print) */}
      <div className={cn("mx-auto mb-6 px-4 print:hidden space-y-4", printOrientation === 'landscape' ? 'max-w-[1200px]' : 'max-w-5xl')}>
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <Link
            href="/ha/clinical-tracer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors"
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
              <Table className="w-3.5 h-3.5 text-rose-600" />
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
              <BookOpen className="w-3.5 h-3.5 text-rose-600" />
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
                  printOrientation === 'landscape' ? "bg-white text-rose-700 font-bold shadow-xs" : "text-slate-500"
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
                  printOrientation === 'portrait' ? "bg-white text-rose-700 font-bold shadow-xs" : "text-slate-500"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">แนวตั้ง</span>
              </button>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">แสดงทั้งหมด ({stats.total} โรค)</option>
              <option value="emergency">🚨 ภาวะฉุกเฉิน/วิกฤต ({stats.emergency})</option>
              <option value="chronic">🩺 โรคเรื้อรัง ({stats.chronic})</option>
              <option value="infectious">🦠 โรคติดเชื้อ ({stats.infectious})</option>
              <option value="mental_health">🧠 สุขภาพจิต ({stats.mental_health})</option>
            </select>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-100 transition-all cursor-pointer"
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
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>รายงานสรุปภาพรวมกระบวนการดูแลผู้ป่วยทางคลินิก (Clinical Tracer Overview Report)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            โรงพยาบาลค่ายสุรสิงหนาท
          </h1>
          <div className="text-sm font-bold text-rose-700 mt-1">
            {viewMode === 'matrix' 
              ? 'ตารางสรุปสาระสำคัญผู้บริหาร (Executive Master Matrix 13 กลุ่มโรคสำคัญ)' 
              : 'เล่มรายงานกระบวนการดูแลผู้ป่วยฉบับสมบูรณ์ (Comprehensive Clinical Tracer Dossier)'}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-3">
            <span>พิมพ์วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>•</span>
            <span>จำนวนกลุ่มโรค: {filteredTracers.length} กลุ่มโรค</span>
            <span>•</span>
            <span>ตัวชี้วัดทางคลินิกรวม: {stats.total_kpis} รายการ</span>
            <span>•</span>
            <span>รอบปีประเมิน พ.ศ. 2569</span>
          </div>
        </div>

        {/* Executive Stats Bar (Printable) */}
        <div className="grid grid-cols-4 gap-3 mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
          <div>
            <div className="text-slate-500 font-medium">กลุ่มโรคทั้งหมด</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</div>
          </div>
          <div>
            <div className="text-rose-700 font-medium">ฉุกเฉินและวิกฤต</div>
            <div className="text-xl font-black text-rose-700 mt-0.5">{stats.emergency}</div>
          </div>
          <div>
            <div className="text-blue-700 font-medium">โรคเรื้อรัง (NCDs)</div>
            <div className="text-xl font-black text-blue-700 mt-0.5">{stats.chronic}</div>
          </div>
          <div>
            <div className="text-emerald-700 font-medium">โรคติดเชื้อ & สุขภาพจิต</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.infectious + stats.mental_health}</div>
          </div>
        </div>

        {/* ================= MODE 1: EXECUTIVE MASTER MATRIX ================= */}
        {viewMode === 'matrix' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>ตารางสรุปสาระสำคัญกระบวนการดูแลรักษาผู้ป่วยรายกลุ่มโรค (Executive Clinical Tracer Matrix)</span>
              <span className="text-[11px] text-slate-500 font-normal">จัดพิมพ์แบบ: {printOrientation === 'landscape' ? 'แนวนอน (A4 Landscape)' : 'แนวตั้ง (A4 Portrait)'}</span>
            </div>

            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-700 text-center w-10">ลำดับ</th>
                  <th className="p-2 border-r border-slate-700 text-left w-32">กลุ่มโรค / รหัส</th>
                  <th className="p-2 border-r border-slate-700 text-center w-20">หมวดหมู่</th>
                  <th className="p-2 border-r border-slate-700 text-left w-[28%]">จุดเสี่ยงสำคัญทางคลินิก (Key Risks)</th>
                  <th className="p-2 border-r border-slate-700 text-left w-[28%]">เป้าหมาย & กระบวนการ CPG</th>
                  <th className="p-2 border-r border-slate-700 text-left w-[13%]">ตัวชี้วัดสำคัญ (เป้า/ล่าสุด)</th>
                  <th className="p-2 text-center w-12">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTracers.map((t, idx) => {
                  const catTheme = getCategoryLabel(t.category);
                  const firstKpi = t.kpi_data?.rows && t.kpi_data.rows.length > 0 ? t.kpi_data.rows[0] : null;

                  return (
                    <tr key={t.id} className="align-top hover:bg-slate-50/50 print-break-inside-avoid">
                      <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-500 bg-slate-50/30">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <span className={cn("font-mono font-bold block text-[11px] px-1.5 py-0.5 rounded border mb-1 w-fit", catTheme.codeColor)}>
                          {t.code}
                        </span>
                        <span className="font-bold text-slate-900 text-xs block leading-snug">{t.title}</span>
                        {t.subtitle && <span className="text-[10px] text-slate-400 block mt-0.5">{t.subtitle}</span>}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border inline-block whitespace-nowrap", catTheme.badge)}>
                          {catTheme.label}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 leading-relaxed text-[11.5px] text-slate-800">
                        {getSummarySnippet(t.key_issues, 220)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 leading-relaxed text-[11.5px] text-slate-800">
                        <div className="mb-1">
                          <strong className="text-slate-900">เป้าหมาย: </strong>
                          <span>{getSummarySnippet(t.goals, 120)}</span>
                        </div>
                        {t.processes && (
                          <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                            <strong className="text-slate-700">กระบวนการ/CPG: </strong>
                            <span>{getSummarySnippet(t.processes, 100)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-[11px] bg-slate-50/20">
                        {firstKpi ? (
                          <div>
                            <div className="font-semibold text-slate-900 line-clamp-2 leading-tight">{firstKpi.name}</div>
                            <div className="text-[10.5px] mt-1.5 space-y-0.5">
                              <div className="text-slate-500">เป้า: <strong className="text-indigo-700">{firstKpi.target}</strong></div>
                              <div className="text-slate-700">ปี 69: <strong className="text-rose-700 font-black">{firstKpi.y2569 || firstKpi.y2568 || '-'}</strong></div>
                            </div>
                            <div className="text-[9.5px] text-slate-400 mt-1">
                              (+ อีก {Math.max(0, (t.kpi_data?.rows?.length ?? 1) - 1)} ตัวชี้วัด)
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center text-[10px]">
                        <span className="font-semibold text-emerald-700 block">สมบูรณ์</span>
                        <span className="text-slate-400 font-mono">v{t.current_version}</span>
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
            {filteredTracers.map((t, idx) => {
              const catTheme = getCategoryLabel(t.category);

              return (
                <div 
                  key={t.id} 
                  className={`space-y-6 print-break-inside-avoid ${idx > 0 ? 'print-break-before-page pt-6' : ''}`}
                >
                  {/* Disease Header Banner */}
                  <div className="bg-slate-900 text-white p-3.5 rounded-lg flex items-center justify-between shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-amber-300 text-sm bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {t.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">ลำดับที่ {idx + 1}</span>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", catTheme.badge)}>
                          {catTheme.label}
                        </span>
                      </div>
                      <h2 className="text-base font-black tracking-tight">{t.title}</h2>
                      {t.subtitle && <p className="text-xs text-slate-300 mt-0.5">{t.subtitle}</p>}
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <div>เวอร์ชัน #{t.current_version}</div>
                      <div>ทีมนำ: {t.team?.name_th ?? 'ทีมนำทางคลินิก (PCT)'}</div>
                    </div>
                  </div>

                  {/* 1. Context */}
                  {t.context && (
                    <div className="space-y-1.5">
                      <div className="bg-indigo-50 px-3 py-1.5 rounded-md border-l-4 border-indigo-600 text-xs font-bold text-indigo-950 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-indigo-700" />
                        <span>1. บริบทและสถิติผู้รับบริการ (Context & Service Statistics)</span>
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                        {t.context}
                      </div>
                    </div>
                  )}

                  {/* 2. Key Issues */}
                  {t.key_issues && (
                    <div className="space-y-1.5">
                      <div className="bg-rose-50 px-3 py-1.5 rounded-md border-l-4 border-rose-600 text-xs font-bold text-rose-950 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                        <span>2. ประเด็นสำคัญและความเสี่ยงทางคลินิก (Key Quality Issues & Clinical Risks)</span>
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-rose-50/20 rounded border border-rose-100">
                        {t.key_issues}
                      </div>
                    </div>
                  )}

                  {/* 3. Goals */}
                  {t.goals && (
                    <div className="space-y-1.5">
                      <div className="bg-emerald-50 px-3 py-1.5 rounded-md border-l-4 border-emerald-600 text-xs font-bold text-emerald-950 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-emerald-700" />
                        <span>3. เป้าหมายการพัฒนา (Development Goals & Objectives)</span>
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-emerald-50/20 rounded border border-emerald-100">
                        {t.goals}
                      </div>
                    </div>
                  )}

                  {/* 4. Processes */}
                  {t.processes && (
                    <div className="space-y-1.5">
                      <div className="bg-purple-50 px-3 py-1.5 rounded-md border-l-4 border-purple-600 text-xs font-bold text-purple-950 flex items-center gap-2">
                        <GitFork className="w-3.5 h-3.5 text-purple-700" />
                        <span>4. กระบวนการคุณภาพและแนวทาง CPG (Quality Processes / CPG & Pathways)</span>
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                        {t.processes}
                      </div>
                    </div>
                  )}

                  {/* 5. KPIs Table */}
                  {t.kpi_data?.rows && t.kpi_data.rows.length > 0 && (
                    <div className="space-y-2">
                      <div className="bg-sky-50 px-3 py-1.5 rounded-md border-l-4 border-sky-600 text-xs font-bold text-sky-950 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-sky-700" />
                        <span>5. ผลการพัฒนาและตัวชี้วัดทางคลินิก (Results & Clinical KPIs)</span>
                      </div>
                      <table className="w-full text-xs border border-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-sky-900/10 text-slate-900 font-bold border-b border-slate-300">
                            <th className="p-2.5 border-r border-slate-300 text-left">ตัวชี้วัดทางคลินิกที่สำคัญ</th>
                            <th className="p-2.5 border-r border-slate-300 text-center w-16">เป้าหมาย</th>
                            <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 65</th>
                            <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 66</th>
                            <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 67</th>
                            <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 68</th>
                            <th className="p-2.5 text-center w-14 font-black text-rose-800 bg-rose-100/60">ปี 69</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {t.kpi_data.rows.map((kr, kIdx) => (
                            <tr key={kIdx} className="hover:bg-slate-50/50">
                              <td className="p-2.5 border-r border-slate-200 font-medium text-slate-900">{kr.name}</td>
                              <td className="p-2.5 border-r border-slate-200 text-center font-bold text-indigo-700">{kr.target}</td>
                              <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2565 || '-'}</td>
                              <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2566 || '-'}</td>
                              <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2567 || '-'}</td>
                              <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2568 || '-'}</td>
                              <td className="p-2.5 text-center font-bold text-rose-700 bg-rose-50/40">{kr.y2569 || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {t.results_analysis && (
                        <div className="text-[11.5px] text-slate-800 leading-relaxed whitespace-pre-wrap p-2.5 bg-slate-50 rounded border border-slate-200 mt-1">
                          <strong className="text-slate-900">บทวิเคราะห์ผลลัพธ์ PDCA:</strong> {t.results_analysis}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. Next Plans */}
                  {t.next_plans && (
                    <div className="space-y-1.5">
                      <div className="bg-amber-50 px-3 py-1.5 rounded-md border-l-4 border-amber-500 text-xs font-bold text-amber-950 flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5 text-amber-600" />
                        <span>6. แผนการพัฒนาต่อเนื่อง (Continuous Quality Improvement Plans / CQI)</span>
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-amber-50/20 rounded border border-amber-100">
                        {t.next_plans}
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
