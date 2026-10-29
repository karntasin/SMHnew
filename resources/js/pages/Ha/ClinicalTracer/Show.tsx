import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Activity, 
  ArrowLeft, 
  Edit3, 
  Printer, 
  History, 
  Clock, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  Paperclip,
  TrendingUp,
  BarChart2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import RevisionHistoryModal from './RevisionHistoryModal';

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
  revisions: any[];
  attachments: any[];
}

interface Props {
  tracer: TracerProps;
}

export default function ClinicalTracerShow({ tracer }: Props) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'emergency': return { label: 'ฉุกเฉินและวิกฤต', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'chronic': return { label: 'โรคเรื้อรัง (NCDs)', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'infectious': return { label: 'โรคติดเชื้อสำคัญ', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'mental_health': return { label: 'สุขภาพจิต', badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      default: return { label: 'ทั่วไป', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const catTheme = getCategoryLabel(tracer.category);

  return (
    <AppLayout 
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'Clinical Tracer', href: '/ha/clinical-tracer' },
        { title: tracer.code, href: `/ha/clinical-tracer/${tracer.id}` }
      ]}
    >
      <Head title={`${tracer.code} ${tracer.title} - Clinical Tracer`} />

      <div className="min-h-screen bg-slate-50/50 pb-20">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Link
                    href="/ha/clinical-tracer"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 font-mono font-black text-rose-700 text-xs">
                    {tracer.code}
                  </span>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", catTheme.badge)}>
                    {catTheme.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono font-bold">
                    v{tracer.current_version}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {tracer.title}
                </h1>
                {tracer.subtitle && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {tracer.subtitle}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4 text-rose-600" />
                  <span>ประวัติ ({tracer.revisions?.length ?? 1}) & กู้คืน</span>
                </button>

                <Link
                  href={`/ha/clinical-tracer/${tracer.id}/print`}
                  target="_blank"
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
                  title="พิมพ์รายงาน"
                >
                  <Printer className="w-4 h-4" />
                </Link>

                <Link
                  href={`/ha/clinical-tracer/${tracer.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>แก้ไขข้อมูล Tracer</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body: 6 Dimensions */}
        <div className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
          {/* Dimension 1: Context & Service Statistics */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  1. บริบทและสถิติผู้รับบริการ (Context & Statistics)
                </h3>
                <p className="text-xs text-slate-400">
                  สถิติผู้ป่วย, ข้อมูลขนาดปัญหา และการทบทวนเคสทางคลินิก (Masked PII)
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {tracer.context || 'ไม่มีข้อมูลบริบท'}
            </div>
          </div>

          {/* Dimension 2: Key Issues & Clinical Risks */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. ประเด็นสำคัญและความเสี่ยงทางคลินิก (Key Quality Issues & Clinical Risks)
                </h3>
                <p className="text-xs text-slate-400">
                  จุดเสี่ยงสำคัญในกระบวนการดูแลรักษา (คัดกรอง, วินิจฉัย, รักษา, ส่งต่อ)
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {tracer.key_issues || 'ไม่มีข้อมูลประเด็นความเสี่ยง'}
            </div>
          </div>

          {/* Dimension 3: Development Goals */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. เป้าหมายการพัฒนา (Development Goals & Objectives)
                </h3>
                <p className="text-xs text-slate-400">
                  เป้าหมายเชิงผลลัพธ์และกระบวนการดูแลผู้ป่วย
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {tracer.goals || 'ไม่มีข้อมูลเป้าหมาย'}
            </div>
          </div>

          {/* Dimension 4: Quality Processes & CPG */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                4
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  4. กระบวนการเพื่อให้ได้คุณภาพ (Quality Processes / CPG & Standing Order)
                </h3>
                <p className="text-xs text-slate-400">
                  แนวทางเวชปฏิบัติ, Fast Track, Standing Order และการเชื่อมประสานสหสาขาวิชาชีพ
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {tracer.processes || 'ไม่มีข้อมูลกระบวนการ'}
            </div>
          </div>

          {/* Dimension 5: Results & Clinical KPIs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                5
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  5. ผลการพัฒนาและตัวชี้วัดทางคลินิก (Results & Clinical KPIs)
                </h3>
                <p className="text-xs text-slate-400">
                  สถิติเปรียบเทียบเป้าหมายและผลงานย้อนหลัง 5 ปี (พ.ศ. 2565 - 2569) พร้อมบทวิเคราะห์ PDCA
                </p>
              </div>
            </div>

            {tracer.kpi_data?.rows && tracer.kpi_data.rows.length > 0 ? (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-3 border-r border-slate-200">ตัวชี้วัดทางคลินิก</th>
                      <th className="p-3 border-r border-slate-200 text-center w-24">เป้าหมาย</th>
                      <th className="p-3 border-r border-slate-200 text-center w-20">ปี 65</th>
                      <th className="p-3 border-r border-slate-200 text-center w-20">ปี 66</th>
                      <th className="p-3 border-r border-slate-200 text-center w-20">ปี 67</th>
                      <th className="p-3 border-r border-slate-200 text-center w-20">ปี 68</th>
                      <th className="p-3 text-center w-20 font-bold text-rose-700">ปี 69</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tracer.kpi_data.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5 border-r border-slate-100 font-medium text-slate-800">{row.name}</td>
                        <td className="p-2.5 border-r border-slate-100 text-center font-bold text-indigo-700">{row.target}</td>
                        <td className="p-2.5 border-r border-slate-100 text-center">{row.y2565 || '-'}</td>
                        <td className="p-2.5 border-r border-slate-100 text-center">{row.y2566 || '-'}</td>
                        <td className="p-2.5 border-r border-slate-100 text-center">{row.y2567 || '-'}</td>
                        <td className="p-2.5 border-r border-slate-100 text-center">{row.y2568 || '-'}</td>
                        <td className="p-2.5 text-center font-bold text-slate-900 bg-rose-50/30">{row.y2569 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4">ยังไม่มีข้อมูลตารางตัวชี้วัด</p>
            )}

            {/* Results analysis / PDCA */}
            {tracer.results_analysis && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="font-bold text-xs text-slate-700 block mb-1">การวิเคราะห์ผลลัพธ์ตามรอบ PDCA:</span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {tracer.results_analysis}
                </p>
              </div>
            )}
          </div>

          {/* Dimension 6: Continuous Improvement Plans */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                6
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  6. แผนการพัฒนาต่อเนื่อง (Continuous Quality Improvement Plans / CQI)
                </h3>
                <p className="text-xs text-slate-400">
                  แผนงานพัฒนาในอนาคต, การปรับ CPG และนวัตกรรม
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {tracer.next_plans || 'ไม่มีข้อมูลแผนพัฒนา'}
            </div>
          </div>
        </div>
      </div>

      {/* Revision History Modal */}
      <RevisionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        tracerId={tracer.id}
        currentVersion={tracer.current_version}
        revisions={tracer.revisions}
      />
    </AppLayout>
  );
}
