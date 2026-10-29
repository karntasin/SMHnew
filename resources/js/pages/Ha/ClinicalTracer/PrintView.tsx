import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
  Printer, 
  ArrowLeft, 
  Activity, 
  AlertTriangle, 
  Target, 
  GitFork, 
  TrendingUp, 
  Compass, 
  UserCheck, 
  Stethoscope,
  ShieldCheck
} from 'lucide-react';

interface KpiRow {
  name: string;
  target: string;
  y2565: string;
  y2566: string;
  y2567: string;
  y2568: string;
  y2569: string;
}

interface TracerProps {
  id: number;
  code: string;
  title: string;
  subtitle?: string;
  category: string;
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
  tracer: TracerProps;
}

export default function ClinicalTracerPrintView({ tracer }: Props) {
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'emergency': return { label: 'ภาวะฉุกเฉินและวิกฤต (Emergency Fast Track)', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'chronic': return { label: 'โรคเรื้อรัง (NCDs & Chronic Diseases)', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'infectious': return { label: 'โรคติดเชื้อสำคัญ (Infectious Diseases)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'mental_health': return { label: 'สุขภาพจิต (Mental Health & Psychiatric)', badge: 'bg-purple-100 text-purple-800 border-purple-300' };
      default: return { label: 'ทั่วไป', badge: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const catDetails = getCategoryDetails(tracer.category);

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:bg-white text-slate-900 font-sans print-portrait">
      <Head title={`พิมพ์รายงาน Clinical Tracer - ${tracer.code} ${tracer.title}`} />

      {/* Screen action bar */}
      <div className="max-w-4xl mx-auto mb-6 px-4 flex items-center justify-between print:hidden">
        <Link
          href={`/ha/clinical-tracer/${tracer.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้ารายละเอียด</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">แนะนำ: ขนาดกระดาษ A4 แนวตั้ง (Portrait)</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-100 transition-all cursor-pointer"
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
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>รายงานการติดตามกระบวนการดูแลผู้ป่วยทางคลินิก (Clinical Tracer Report)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            โรงพยาบาลค่ายสุรสิงหนาท
          </h1>
          
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="font-mono font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200 text-sm">
              [{tracer.code}]
            </span>
            <span className="text-xl font-black text-slate-900">
              {tracer.title}
            </span>
          </div>

          {tracer.subtitle && (
            <div className="text-xs text-slate-600 font-medium mt-1">
              {tracer.subtitle}
            </div>
          )}

          {/* Metadata chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-md font-semibold border ${catDetails.badge}`}>
              {catDetails.label}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
              ทีมนำ: <strong>{tracer.team?.name_th ?? 'ทีมนำทางคลินิก (PCT)'}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
              เวอร์ชัน: <strong>#{tracer.current_version}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
              สถานะ: <strong>{tracer.status === 'published' ? 'เผยแพร่สมบูรณ์' : tracer.status}</strong>
            </span>
          </div>

          {/* Leads info bar */}
          {(tracer.lead_doctor_name || tracer.lead_nurse_name) && (
            <div className="mt-3 py-1.5 px-4 bg-slate-50 rounded-lg border border-slate-200 inline-flex items-center gap-6 text-[11px] text-slate-600">
              {tracer.lead_doctor_name && (
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-rose-600" />
                  <span>แพทย์ผู้ประสานงาน: <strong className="text-slate-800">{tracer.lead_doctor_name}</strong></span>
                </span>
              )}
              {tracer.lead_nurse_name && (
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>พยาบาลผู้ประสานงาน: <strong className="text-slate-800">{tracer.lead_nurse_name}</strong></span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 6 Dimensions Body */}
        <div className="space-y-7">
          {/* 1. Context */}
          {tracer.context && (
            <div className="space-y-1.5 print-break-inside-avoid">
              <div className="bg-indigo-50 px-3 py-2 rounded-md font-bold text-xs text-indigo-950 border-l-4 border-indigo-600 uppercase flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-indigo-700" />
                <span>1. บริบทและสถิติผู้รับบริการ (Context & Service Statistics)</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                {tracer.context}
              </div>
            </div>
          )}

          {/* 2. Key Issues */}
          {tracer.key_issues && (
            <div className="space-y-1.5 print-break-inside-avoid">
              <div className="bg-rose-50 px-3 py-2 rounded-md font-bold text-xs text-rose-950 border-l-4 border-rose-600 uppercase flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                <span>2. ประเด็นสำคัญและความเสี่ยงทางคลินิก (Key Quality Issues & Clinical Risks)</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-rose-50/20 rounded border border-rose-100">
                {tracer.key_issues}
              </div>
            </div>
          )}

          {/* 3. Goals */}
          {tracer.goals && (
            <div className="space-y-1.5 print-break-inside-avoid">
              <div className="bg-emerald-50 px-3 py-2 rounded-md font-bold text-xs text-emerald-950 border-l-4 border-emerald-600 uppercase flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-emerald-700" />
                <span>3. เป้าหมายการพัฒนา (Development Goals & Objectives)</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-emerald-50/20 rounded border border-emerald-100">
                {tracer.goals}
              </div>
            </div>
          )}

          {/* 4. Processes */}
          {tracer.processes && (
            <div className="space-y-1.5 print-break-inside-avoid">
              <div className="bg-purple-50 px-3 py-2 rounded-md font-bold text-xs text-purple-950 border-l-4 border-purple-600 uppercase flex items-center gap-2">
                <GitFork className="w-3.5 h-3.5 text-purple-700" />
                <span>4. กระบวนการเพื่อให้ได้คุณภาพ (Quality Processes / CPG & Pathways)</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                {tracer.processes}
              </div>
            </div>
          )}

          {/* 5. Clinical KPIs Table */}
          {tracer.kpi_data?.rows && tracer.kpi_data.rows.length > 0 && (
            <div className="space-y-2.5 print-break-inside-avoid">
              <div className="bg-sky-50 px-3 py-2 rounded-md font-bold text-xs text-sky-950 border-l-4 border-sky-600 uppercase flex items-center gap-2">
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
                  {tracer.kpi_data.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border-r border-slate-200 font-medium text-slate-900">{row.name}</td>
                      <td className="p-2.5 border-r border-slate-200 text-center font-bold text-indigo-700">{row.target}</td>
                      <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{row.y2565 || '-'}</td>
                      <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{row.y2566 || '-'}</td>
                      <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{row.y2567 || '-'}</td>
                      <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{row.y2568 || '-'}</td>
                      <td className="p-2.5 text-center font-bold text-rose-700 bg-rose-50/40">{row.y2569 || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {tracer.results_analysis && (
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap p-3 bg-slate-50 rounded-md border border-slate-200 mt-2">
                  <strong className="text-slate-900 block mb-1">บทวิเคราะห์ผลลัพธ์ตามรอบ PDCA:</strong>
                  {tracer.results_analysis}
                </div>
              )}
            </div>
          )}

          {/* 6. Next Plans */}
          {tracer.next_plans && (
            <div className="space-y-1.5 print-break-inside-avoid">
              <div className="bg-amber-50 px-3 py-2 rounded-md font-bold text-xs text-amber-950 border-l-4 border-amber-500 uppercase flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>6. แผนการพัฒนาต่อเนื่อง (Continuous Quality Improvement Plans / CQI)</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-amber-50/20 rounded border border-amber-100">
                {tracer.next_plans}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
