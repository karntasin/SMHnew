import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Printer, ArrowLeft, Award, CheckCircle2, TrendingUp, Compass, FileSpreadsheet, ShieldCheck } from 'lucide-react';

interface AssessmentRow {
  criterion: string;
  score: string;
  dali_gap: string;
  issues_and_plans: string;
}

interface KpiRow {
  name: string;
  target: string;
  y2565: string;
  y2566: string;
  y2567: string;
  y2568: string;
  y2569: string;
}

interface SectionItem {
  id: number;
  code: string;
  title: string;
  requirement?: string;
  context?: string;
  self_assessment_data?: AssessmentRow[];
  process_content?: string;
  achievements?: string;
  results_kpi_data?: {
    headers?: string[];
    rows?: KpiRow[];
    pdca?: string;
  };
  current_version: number;
  lead_team?: {
    name_th: string;
  };
  part?: {
    part_number: string;
    part_name: string;
    cycle?: {
      year: string;
      hospital_name: string;
    };
  };
}

interface Props {
  mode: 'section' | 'part';
  section?: SectionItem;
  part?: {
    part_number: string;
    part_name: string;
    cycle: {
      year: string;
      hospital_name: string;
    };
    sections: SectionItem[];
  };
}

export default function PrintView({ mode, section, part }: Props) {
  const sectionsToRender = mode === 'section' && section ? [section] : (part?.sections || []);
  const hospitalName = part?.cycle.hospital_name || section?.part?.cycle?.hospital_name || 'โรงพยาบาลค่ายสุรสิงหนาท';
  const cycleYear = part?.cycle.year || section?.part?.cycle?.year || '2569';
  const pageTitle = mode === 'section' 
    ? `${section?.code} ${section?.title}` 
    : `ตอนที่ ${part?.part_number} ${part?.part_name}`;

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:bg-white text-slate-900 font-sans print-portrait">
      <Head title={`พิมพ์รายงาน SAR - ${pageTitle}`} />

      {/* Screen action bar */}
      <div className="max-w-4xl mx-auto mb-6 px-4 flex items-center justify-between print:hidden">
        <Link
          href={mode === 'section' ? `/ha/sar/section/${section?.id}` : `/ha/sar/part/${part?.part_number}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าเดิม</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">แนะนำ: ขนาดกระดาษ A4 แนวตั้ง (Portrait)</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เอกสารนี้ (Print / Save PDF)</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 print:border-none p-10 sm:p-14 shadow-lg print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-8 text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] uppercase tracking-widest text-slate-700 font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span>รายงานการประเมินตนเอง (Hospital Accreditation Self-Assessment Report : SAR)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {hospitalName}
          </h1>
          <div className="text-base font-bold text-indigo-900 mt-1">
            {mode === 'part' ? `ตอนที่ ${part?.part_number}: ${part?.part_name}` : `ตอนที่ ${section?.part?.part_number}: ${pageTitle}`}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-3">
            <span>รอบปีการประเมิน พ.ศ. {cycleYear}</span>
            <span>•</span>
            <span>มาตรฐาน HA ฉบับที่ 5 (5th Edition)</span>
            <span>•</span>
            <span>พิมพ์วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sectionsToRender.map((sec, sIdx) => (
            <div 
              key={sec.id} 
              className={`space-y-6 print-break-inside-avoid ${sIdx > 0 && mode === 'part' ? 'print-break-before-page pt-6' : ''}`}
            >
              {/* Section Title Ribbon */}
              <div className="bg-slate-900 text-white p-3.5 rounded-lg flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-black text-amber-300 text-sm bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{sec.code}</span>
                  <span className="text-sm font-bold tracking-tight">{sec.title}</span>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <span>เวอร์ชัน #{sec.current_version}</span>
                  {sec.lead_team && <span className="ml-2 font-medium">({sec.lead_team.name_th})</span>}
                </div>
              </div>

              {/* Requirement */}
              {sec.requirement && (
                <div className="space-y-1.5">
                  <div className="bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-slate-700 text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-slate-600" />
                    <span>ข้อกำหนดโดยรวมของมาตรฐาน (Overall Requirement)</span>
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed bg-slate-50/80 p-3.5 rounded-md border border-slate-200 whitespace-pre-wrap">
                    {sec.requirement}
                  </div>
                </div>
              )}

              {/* Context */}
              {sec.context && (
                <div className="space-y-1.5">
                  <div className="bg-indigo-50 px-3 py-1.5 rounded-md border-l-4 border-indigo-600 text-xs font-bold text-indigo-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span>i. บริบทการดำเนินการ (Context)</span>
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                    {sec.context}
                  </div>
                </div>
              )}

              {/* Self Assessment Table */}
              {Array.isArray(sec.self_assessment_data) && sec.self_assessment_data.length > 0 && (
                <div className="space-y-2">
                  <div className="bg-teal-50 px-3 py-1.5 rounded-md border-l-4 border-teal-600 text-xs font-bold text-teal-950 flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                    <span>ตารางการประเมินตนเองและช่องว่างการพัฒนา (Self-Assessment & DALI Gap)</span>
                  </div>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-teal-900/10 text-slate-900 font-bold border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300 text-left w-[22%]">มาตรฐาน / เกณฑ์</th>
                        <th className="p-2.5 border-r border-slate-300 text-center w-14">คะแนน</th>
                        <th className="p-2.5 border-r border-slate-300 text-center w-16">DALI Gap</th>
                        <th className="p-2.5 text-left">ประเด็นการพัฒนา / แผนการพัฒนา (Issues & Action Plans)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sec.self_assessment_data.map((row, rIdx) => (
                        <tr key={rIdx} className="align-top hover:bg-slate-50/50">
                          <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900 bg-slate-50/40">{row.criterion}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold text-xs">
                              {row.score}
                            </span>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-teal-800 text-[11px] bg-slate-50/30">
                            {row.dali_gap || '-'}
                          </td>
                          <td className="p-2.5 whitespace-pre-wrap leading-relaxed text-slate-800 text-[11.5px]">{row.issues_and_plans}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Process */}
              {sec.process_content && (
                <div className="space-y-1.5">
                  <div className="bg-purple-50 px-3 py-1.5 rounded-md border-l-4 border-purple-600 text-xs font-bold text-purple-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span>ii. กระบวนการปฏิบัติตามมาตรฐาน (Process / Implementation)</span>
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1">
                    {sec.process_content}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {sec.achievements && (
                <div className="space-y-1.5">
                  <div className="bg-amber-50 px-3 py-1.5 rounded-md border-l-4 border-amber-500 text-xs font-bold text-amber-950 flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>iii. ผลการพัฒนาที่โดดเด่นและภาคภูมิใจ (Achievements & Pride)</span>
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 pr-1 py-1 bg-amber-50/30 rounded border border-amber-100">
                    {sec.achievements}
                  </div>
                </div>
              )}

              {/* KPIs Table */}
              {sec.results_kpi_data?.rows && sec.results_kpi_data.rows.length > 0 && (
                <div className="space-y-2">
                  <div className="bg-sky-50 px-3 py-1.5 rounded-md border-l-4 border-sky-600 text-xs font-bold text-sky-950 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-sky-700" />
                    <span>iv. ผลลัพธ์และตัวชี้วัดสำคัญ (Key Performance Indicators)</span>
                  </div>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-sky-900/10 text-slate-900 font-bold border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300 text-left">ข้อมูล / ตัวชี้วัดสำคัญ</th>
                        <th className="p-2.5 border-r border-slate-300 text-center w-16">เป้าหมาย</th>
                        <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 65</th>
                        <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 66</th>
                        <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 67</th>
                        <th className="p-2.5 border-r border-slate-300 text-center w-12">ปี 68</th>
                        <th className="p-2.5 text-center w-14 font-black text-sky-950 bg-sky-100/60">ปี 69</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sec.results_kpi_data.rows.map((kr, kIdx) => (
                        <tr key={kIdx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 border-r border-slate-200 font-medium text-slate-900">{kr.name}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-indigo-700">{kr.target}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2565 || '-'}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2566 || '-'}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2567 || '-'}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center text-slate-600">{kr.y2568 || '-'}</td>
                          <td className="p-2.5 text-center font-bold text-sky-900 bg-sky-50/50">{kr.y2569 || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PDCA Analysis */}
              {sec.results_kpi_data?.pdca && (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800">การวิเคราะห์ผลลัพธ์และวงล้อคุณภาพ (PDCA Analysis):</div>
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-md border border-slate-200">
                    {sec.results_kpi_data.pdca}
                  </div>
                </div>
              )}

              {/* Page separator if multiple */}
              {sIdx < sectionsToRender.length - 1 && (
                <hr className="border-t-2 border-dashed border-slate-300 my-8 print:hidden" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
