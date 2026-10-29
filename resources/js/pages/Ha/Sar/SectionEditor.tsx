import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  FileText, 
  Save, 
  History, 
  Printer, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Users, 
  Sparkles, 
  AlertCircle,
  BarChart2,
  Paperclip,
  Check,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import RevisionHistoryModal from './RevisionHistoryModal';

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

interface SectionProps {
  id: number;
  sar_part_id: number;
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
  lead_team_id?: number;
  lead_person_name?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  current_version: number;
  updated_at: string;
  part: {
    id: number;
    part_number: string;
    part_name: string;
    cycle: {
      year: string;
      hospital_name: string;
    };
  };
  revisions: any[];
  attachments: any[];
}

interface Props {
  section: SectionProps;
  haTeams: { id: number; name_th: string; abbreviation: string }[];
  adjacent: {
    prev?: { id: number; code: string; title: string };
    next?: { id: number; code: string; title: string };
  };
}

export default function SectionEditor({ section, haTeams, adjacent }: Props) {
  const [activeTab, setActiveTab] = useState<'context' | 'assessment' | 'process' | 'achievements' | 'kpis' | 'attachments'>('context');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showSaveNotice, setShowSaveNotice] = useState(false);

  // Form handling
  const { data, setData, put, processing, isDirty, wasSuccessful } = useForm({
    title: section.title || '',
    requirement: section.requirement || '',
    context: section.context || '',
    self_assessment_data: Array.isArray(section.self_assessment_data) && section.self_assessment_data.length > 0 
      ? section.self_assessment_data 
      : [{ criterion: section.title, score: '3', dali_gap: '', issues_and_plans: '' }],
    process_content: section.process_content || '',
    achievements: section.achievements || '',
    results_kpi_data: {
      headers: section.results_kpi_data?.headers || ['ตัวชี้วัด', 'เป้าหมาย', 'ปี 2565', 'ปี 2566', 'ปี 2567', 'ปี 2568', 'ปี 2569'],
      rows: section.results_kpi_data?.rows || [],
      pdca: section.results_kpi_data?.pdca || '',
    },
    lead_team_id: section.lead_team_id || '',
    lead_person_name: section.lead_person_name || '',
    status: section.status || 'in_progress',
    change_summary: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/ha/sar/section/${section.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        setData('change_summary', '');
        setShowSaveNotice(true);
        setTimeout(() => setShowSaveNotice(false), 4000);
      }
    });
  };

  // Self assessment table helper
  const addAssessmentRow = () => {
    setData('self_assessment_data', [
      ...data.self_assessment_data,
      { criterion: '', score: '3', dali_gap: '', issues_and_plans: '' }
    ]);
  };

  const removeAssessmentRow = (index: number) => {
    const updated = data.self_assessment_data.filter((_, i) => i !== index);
    setData('self_assessment_data', updated);
  };

  const updateAssessmentRow = (index: number, field: keyof AssessmentRow, val: string) => {
    const updated = [...data.self_assessment_data];
    updated[index] = { ...updated[index], [field]: val };
    setData('self_assessment_data', updated);
  };

  // KPI table helper
  const addKpiRow = () => {
    setData('results_kpi_data', {
      ...data.results_kpi_data,
      rows: [
        ...data.results_kpi_data.rows,
        { name: '', target: '', y2565: '', y2566: '', y2567: '', y2568: '', y2569: '' }
      ]
    });
  };

  const removeKpiRow = (index: number) => {
    const updated = data.results_kpi_data.rows.filter((_, i) => i !== index);
    setData('results_kpi_data', {
      ...data.results_kpi_data,
      rows: updated,
    });
  };

  const updateKpiRow = (index: number, field: keyof KpiRow, val: string) => {
    const updated = [...data.results_kpi_data.rows];
    updated[index] = { ...updated[index], [field]: val };
    setData('results_kpi_data', {
      ...data.results_kpi_data,
      rows: updated,
    });
  };

  const tabs = [
    { id: 'context', label: '1. บริบท & ข้อกำหนด' },
    { id: 'assessment', label: '2. ประเมินตนเอง (DALI)' },
    { id: 'process', label: '3. กระบวนการดำเนินงาน' },
    { id: 'achievements', label: '4. ผลงานเด่น & ภาคภูมิใจ' },
    { id: 'kpis', label: '5. ตัวชี้วัด & ผลลัพธ์ (PDCA)' },
    { id: 'attachments', label: `6. เอกสารแนบ (${section.attachments.length})` },
  ];

  return (
    <AppLayout 
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'SAR', href: '/ha/sar' },
        { title: `ตอนที่ ${section.part.part_number}`, href: `/ha/sar/part/${section.part.part_number}` },
        { title: section.code, href: `/ha/sar/section/${section.id}` }
      ]}
    >
      <Head title={`${section.code} ${section.title} - แก้ไขรายงาน SAR`} />

      <form onSubmit={handleSubmit} className="min-h-screen bg-slate-50/50 pb-24">
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/ha/sar/part/${section.part.part_number}`}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="กลับไปรายการหมวด"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 font-mono font-black text-indigo-700 text-xs">
                      {section.code}
                    </span>
                    <span className="text-xs text-slate-400">ตอนที่ {section.part.part_number} • รอบปี {section.part.cycle.year}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-bold">
                      v{section.current_version}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    className="mt-1 font-bold text-slate-900 text-base sm:text-lg border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full transition-colors"
                    placeholder="ชื่อหมวดมาตรฐาน"
                  />
                </div>
              </div>

              {/* Action Buttons & Status Selector */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Adjacent navigation */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {adjacent.prev && (
                    <Link
                      href={`/ha/sar/section/${adjacent.prev.id}`}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs text-xs font-semibold flex items-center gap-1 transition-all"
                      title={adjacent.prev.title}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{adjacent.prev.code}</span>
                    </Link>
                  )}
                  {adjacent.next && (
                    <Link
                      href={`/ha/sar/section/${adjacent.next.id}`}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs text-xs font-semibold flex items-center gap-1 transition-all"
                      title={adjacent.next.title}
                    >
                      <span>{adjacent.next.code}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {/* Print button */}
                <Link
                  href={`/ha/sar/section/${section.id}/print`}
                  target="_blank"
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
                  title="พิมพ์หน้ารายงานนี้"
                >
                  <Printer className="w-4 h-4" />
                </Link>

                {/* Revision History Trigger */}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors"
                >
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>ประวัติ ({section.revisions?.length ?? 1}) & กู้คืน</span>
                </button>

                {/* Status Selector */}
                <select
                  value={data.status}
                  onChange={(e: any) => setData('status', e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs outline-none cursor-pointer"
                >
                  <option value="draft">สถานะ: ร่าง (Draft)</option>
                  <option value="in_progress">สถานะ: กำลังดำเนินการ (In Progress)</option>
                  <option value="completed">สถานะ: สมบูรณ์ (Completed)</option>
                  <option value="approved">สถานะ: อนุมัติแล้ว (Approved)</option>
                </select>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{processing ? 'กำลังบันทึก...' : 'บันทึกข้อมูล (Save)'}</span>
                </button>
              </div>
            </div>

            {/* Optional Change Summary Input row */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs text-slate-400 shrink-0">บันทึกเหตุผลการแก้ไข (เพื่อเก็บใน Log):</span>
              <input
                type="text"
                placeholder="ระบุสิ่งที่แก้ไข เช่น ปรับปรุงตัวชี้วัดปี 69, เพิ่มเติมข้อมูลบริบท (เว้นว่างได้)"
                value={data.change_summary}
                onChange={(e) => setData('change_summary', e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-400"
              />
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">ทีมรับผิดชอบ:</span>
                <select
                  value={data.lead_team_id}
                  onChange={(e: any) => setData('lead_team_id', e.target.value)}
                  className="text-xs px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 outline-none"
                >
                  <option value="">(เลือกทีม HA)</option>
                  {haTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name_th}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Success Toast */}
            {showSaveNotice && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>บันทึกข้อมูลสำเร็จ และสร้าง Snapshot บันทึกประวัติการแก้ไขเรียบร้อยแล้ว</span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-2 overflow-x-auto border-t border-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer",
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-700 bg-indigo-50/30"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {/* TAB 1: CONTEXT & REQUIREMENT */}
          {activeTab === 'context' && (
            <div className="space-y-6">
              {/* Requirements Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    R
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    ข้อกำหนดโดยรวมของมาตรฐาน (Overall Requirement)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  ข้อกำหนดและเกณฑ์มาตรฐาน สรพ. ประจำหมวดนี้
                </p>
                <textarea
                  rows={4}
                  value={data.requirement}
                  onChange={(e) => setData('requirement', e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:border-indigo-500"
                  placeholder="กรอกข้อกำหนดมาตรฐาน..."
                />
              </div>

              {/* Context Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    I
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    i. บริบท (Context)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  สรุปข้อมูลสำคัญ สถานการณ์ปัจจุบัน ปัญหา ความเสี่ยง และโอกาสพัฒนาที่สำคัญที่มีผลต่อการออกแบบกระบวนการ
                </p>
                <textarea
                  rows={12}
                  value={data.context}
                  onChange={(e) => setData('context', e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
                  placeholder="ระบุข้อมูลบริบทของโรงพยาบาล..."
                />
              </div>
            </div>
          )}

          {/* TAB 2: SELF ASSESSMENT (DALI GAP & SCORE) */}
          {activeTab === 'assessment' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ตารางประเมินตนเอง (Self-Assessment & DALI Gap)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ประเมินระดับคะแนน (1-5) และช่องว่าง DALI (Deployment, Assessment, Learning, Integration) พร้อมแผนพัฒนา
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAssessmentRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มแถวเกณฑ์มาตรฐาน</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="p-3 w-1/4">มาตรฐาน / ประเด็น</th>
                      <th className="p-3 w-28 text-center">Score (1-5)</th>
                      <th className="p-3 w-32 text-center">DALI Gap</th>
                      <th className="p-3">ประเด็นการพัฒนาที่ได้ดำเนินการ / แผนการพัฒนา</th>
                      <th className="p-3 w-12 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.self_assessment_data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={row.criterion}
                            onChange={(e) => updateAssessmentRow(idx, 'criterion', e.target.value)}
                            className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white text-xs font-medium"
                            placeholder="ระบุข้อกำหนดมาตรฐาน..."
                          />
                        </td>
                        <td className="p-3 align-top text-center">
                          <select
                            value={row.score}
                            onChange={(e) => updateAssessmentRow(idx, 'score', e.target.value)}
                            className="w-20 p-2 bg-slate-50 rounded-lg border border-slate-200 text-center font-bold text-xs"
                          >
                            <option value="1">1 (เริ่มต้น)</option>
                            <option value="2">2 (มีแนวทาง)</option>
                            <option value="3">3 (ปฏิบัติจริง)</option>
                            <option value="4">4 (วัดผล/ปรับปรุง)</option>
                            <option value="5">5 (ยอดเยี่ยม)</option>
                          </select>
                        </td>
                        <td className="p-3 align-top text-center">
                          <input
                            type="text"
                            value={row.dali_gap}
                            onChange={(e) => updateAssessmentRow(idx, 'dali_gap', e.target.value)}
                            className="w-24 p-2 bg-slate-50 rounded-lg border border-slate-200 text-center font-bold font-mono text-xs uppercase"
                            placeholder="D, A, L, I"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <textarea
                            rows={3}
                            value={row.issues_and_plans}
                            onChange={(e) => updateAssessmentRow(idx, 'issues_and_plans', e.target.value)}
                            className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white text-xs leading-relaxed"
                            placeholder="ประเด็นการพัฒนาและแผนงาน..."
                          />
                        </td>
                        <td className="p-3 align-top text-center">
                          <button
                            type="button"
                            onClick={() => removeAssessmentRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="ลบแถวนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PROCESS / IMPLEMENTATION */}
          {activeTab === 'process' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  II
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  ii. กระบวนการปฏิบัติตามมาตรฐาน (Process / Implementation)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                อธิบายแนวทาง วิธีปฏิบัติ และกระบวนการทำงานที่องค์กรได้จัดทำและปฏิบัติจริงตามมาตรฐาน
              </p>
              <textarea
                rows={16}
                value={data.process_content}
                onChange={(e) => setData('process_content', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
                placeholder="ระบุกระบวนการดำเนินงานตามมาตรฐาน..."
              />
            </div>
          )}

          {/* TAB 4: ACHIEVEMENTS & PRIDE */}
          {activeTab === 'achievements' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  III
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  iii. ผลการพัฒนาที่โดดเด่นและภาคภูมิใจ (Achievements & Pride)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                ผลงาน CQI, นวัตกรรม, รางวัลที่ได้รับ หรือการพัฒนาที่เห็นผลลัพธ์เป็นรูปธรรมชัดเจน
              </p>
              <textarea
                rows={12}
                value={data.achievements}
                onChange={(e) => setData('achievements', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
                placeholder="ระบุผลงานเด่นและความภาคภูมิใจ..."
              />
            </div>
          )}

          {/* TAB 5: KPIS & PDCA RESULTS */}
          {activeTab === 'kpis' && (
            <div className="space-y-6">
              {/* KPI Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      ตารางข้อมูลและตัวชี้วัดสำคัญ (Key Performance Indicators)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ข้อมูลสถิติผลการดำเนินงานย้อนหลังเปรียบเทียบกับเป้าหมาย (พ.ศ. 2565 - 2569)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addKpiRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มตัวชี้วัด</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                        <th className="p-3 w-1/3">ข้อมูล / ตัวชี้วัด</th>
                        <th className="p-3 w-24 text-center">เป้าหมาย</th>
                        <th className="p-3 w-20 text-center">ปี 2565</th>
                        <th className="p-3 w-20 text-center">ปี 2566</th>
                        <th className="p-3 w-20 text-center">ปี 2567</th>
                        <th className="p-3 w-20 text-center">ปี 2568</th>
                        <th className="p-3 w-20 text-center">ปี 2569</th>
                        <th className="p-3 w-12 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.results_kpi_data.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateKpiRow(idx, 'name', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white text-xs font-medium"
                              placeholder="ชื่อตัวชี้วัด..."
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.target}
                              onChange={(e) => updateKpiRow(idx, 'target', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs font-bold text-indigo-700"
                              placeholder="เป้าหมาย"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.y2565}
                              onChange={(e) => updateKpiRow(idx, 'y2565', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.y2566}
                              onChange={(e) => updateKpiRow(idx, 'y2566', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.y2567}
                              onChange={(e) => updateKpiRow(idx, 'y2567', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.y2568}
                              onChange={(e) => updateKpiRow(idx, 'y2568', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.y2569}
                              onChange={(e) => updateKpiRow(idx, 'y2569', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs font-bold text-slate-800"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeKpiRow(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PDCA Analysis Narrative */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    IV
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    การวิเคราะห์ผลลัพธ์และแนวทางพัฒนาตามรอบ PDCA
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  วิเคราะห์แนวโน้ม (Trends) ข้อค้นพบจากการติดตามตัวชี้วัด และมาตรการพัฒนาปรับปรุง
                </p>
                <textarea
                  rows={8}
                  value={data.results_kpi_data.pdca}
                  onChange={(e) => setData('results_kpi_data', { ...data.results_kpi_data, pdca: e.target.value })}
                  className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
                  placeholder="ระบุการวิเคราะห์ผลลัพธ์และ PDCA..."
                />
              </div>
            </div>
          )}

          {/* TAB 6: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    เอกสารแนบและหลักฐานอ้างอิง (Evidence & Attachments)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ไฟล์เอกสาร PDF, ภาพถ่าย, คำสั่งแต่งตั้ง หรือหลักฐานประกอบการตรวจประเมิน
                  </p>
                </div>
              </div>

              {section.attachments.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-slate-600">ยังไม่มีเอกสารแนบในหมวดนี้</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    สามารถอัปโหลดไฟล์หลักฐานเพื่อประกอบการตรวจประเมิน HA ได้
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {section.attachments.map((att) => (
                    <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium text-slate-800">{att.file_name}</span>
                        <span className="text-slate-400">({Math.round(att.file_size / 1024)} KB)</span>
                      </div>
                      <a
                        href={att.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        ดาวน์โหลด
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Revision History Modal with Restore button */}
      <RevisionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sectionId={section.id}
        currentVersion={section.current_version}
        revisions={section.revisions}
      />
    </AppLayout>
  );
}
