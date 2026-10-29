import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Activity, 
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
  Paperclip,
  Check,
  Stethoscope
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
  category: 'emergency' | 'chronic' | 'infectious' | 'mental_health' | 'surgical' | 'other';
  team_ha_id?: number;
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
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  current_version: number;
  updated_at: string;
  revisions: any[];
  attachments: any[];
}

interface Props {
  tracer: TracerProps;
  haTeams: { id: number; name_th: string; abbreviation: string }[];
  adjacent: {
    prev?: { id: number; code: string; title: string };
    next?: { id: number; code: string; title: string };
  };
}

export default function ClinicalTracerEditor({ tracer, haTeams, adjacent }: Props) {
  const [activeTab, setActiveTab] = useState<'context' | 'key_issues' | 'goals' | 'processes' | 'kpis' | 'next_plans' | 'attachments'>('context');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showSaveNotice, setShowSaveNotice] = useState(false);

  const { data, setData, put, processing } = useForm({
    title: tracer.title || '',
    subtitle: tracer.subtitle || '',
    category: tracer.category || 'emergency',
    team_ha_id: tracer.team_ha_id || '',
    lead_doctor_name: tracer.lead_doctor_name || '',
    lead_nurse_name: tracer.lead_nurse_name || '',
    context: tracer.context || '',
    key_issues: tracer.key_issues || '',
    goals: tracer.goals || '',
    processes: tracer.processes || '',
    kpi_data: {
      headers: tracer.kpi_data?.headers || ['ตัวชี้วัด', 'เป้าหมาย', 'ปี 2565', 'ปี 2566', 'ปี 2567', 'ปี 2568', 'ปี 2569'],
      rows: tracer.kpi_data?.rows || [],
    },
    results_analysis: tracer.results_analysis || '',
    next_plans: tracer.next_plans || '',
    status: tracer.status || 'completed',
    change_summary: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/ha/clinical-tracer/${tracer.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        setData('change_summary', '');
        setShowSaveNotice(true);
        setTimeout(() => setShowSaveNotice(false), 4000);
      }
    });
  };

  const addKpiRow = () => {
    setData('kpi_data', {
      ...data.kpi_data,
      rows: [
        ...data.kpi_data.rows,
        { name: '', target: '', y2565: '', y2566: '', y2567: '', y2568: '', y2569: '' }
      ]
    });
  };

  const removeKpiRow = (index: number) => {
    const updated = data.kpi_data.rows.filter((_, i) => i !== index);
    setData('kpi_data', {
      ...data.kpi_data,
      rows: updated,
    });
  };

  const updateKpiRow = (index: number, field: keyof KpiRow, val: string) => {
    const updated = [...data.kpi_data.rows];
    updated[index] = { ...updated[index], [field]: val };
    setData('kpi_data', {
      ...data.kpi_data,
      rows: updated,
    });
  };

  const tabs = [
    { id: 'context', label: '1. บริบท & สถิติ' },
    { id: 'key_issues', label: '2. ประเด็นสำคัญ & ความเสี่ยง' },
    { id: 'goals', label: '3. เป้าหมายการพัฒนา' },
    { id: 'processes', label: '4. กระบวนการ & CPG' },
    { id: 'kpis', label: '5. ตัวชี้วัด & ผลลัพธ์ (PDCA)' },
    { id: 'next_plans', label: '6. แผนพัฒนาต่อเนื่อง (CQI)' },
    { id: 'attachments', label: `7. เอกสารแนบ (${tracer.attachments.length})` },
  ];

  return (
    <AppLayout 
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'Clinical Tracer', href: '/ha/clinical-tracer' },
        { title: tracer.code, href: `/ha/clinical-tracer/${tracer.id}` },
        { title: 'แก้ไข', href: `/ha/clinical-tracer/${tracer.id}/edit` }
      ]}
    >
      <Head title={`${tracer.code} ${tracer.title} - แก้ไข Clinical Tracer`} />

      <form onSubmit={handleSubmit} className="min-h-screen bg-slate-50/50 pb-24">
        {/* Sticky Top Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/ha/clinical-tracer/${tracer.id}`}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="กลับไปหน้าดูข้อมูล"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 font-mono font-black text-rose-700 text-xs">
                      {tracer.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-bold">
                      v{tracer.current_version}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    className="mt-1 font-bold text-slate-900 text-base sm:text-lg border-b border-transparent hover:border-slate-300 focus:border-rose-500 focus:outline-none bg-transparent w-full transition-colors"
                    placeholder="ชื่อกลุ่มโรค / หัวข้อ Tracer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Adjacent prev/next */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {adjacent.prev && (
                    <Link
                      href={`/ha/clinical-tracer/${adjacent.prev.id}/edit`}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white text-xs font-semibold flex items-center gap-1 transition-all"
                      title={adjacent.prev.title}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{adjacent.prev.code}</span>
                    </Link>
                  )}
                  {adjacent.next && (
                    <Link
                      href={`/ha/clinical-tracer/${adjacent.next.id}/edit`}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white text-xs font-semibold flex items-center gap-1 transition-all"
                      title={adjacent.next.title}
                    >
                      <span>{adjacent.next.code}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                <Link
                  href={`/ha/clinical-tracer/${tracer.id}/print`}
                  target="_blank"
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                  title="พิมพ์รายงาน"
                >
                  <Printer className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4 text-rose-600" />
                  <span>ประวัติ ({tracer.revisions?.length ?? 1}) & กู้คืน</span>
                </button>

                <select
                  value={data.status}
                  onChange={(e: any) => setData('status', e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs outline-none cursor-pointer"
                >
                  <option value="draft">ร่าง (Draft)</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="completed">สมบูรณ์ (Completed)</option>
                  <option value="approved">อนุมัติแล้ว (Approved)</option>
                </select>

                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-100 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{processing ? 'กำลังบันทึก...' : 'บันทึกข้อมูล (Save)'}</span>
                </button>
              </div>
            </div>

            {/* Subtitle & Category Row */}
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">หมวดหมู่กลุ่มโรค:</span>
                <select
                  value={data.category}
                  onChange={(e: any) => setData('category', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium"
                >
                  <option value="emergency">🚨 ภาวะฉุกเฉินและวิกฤต (Emergency/Critical)</option>
                  <option value="chronic">🩺 โรคเรื้อรัง (Chronic / NCDs)</option>
                  <option value="infectious">🦠 โรคติดเชื้อสำคัญ (Infectious)</option>
                  <option value="mental_health">🧠 สุขภาพจิต (Mental Health)</option>
                  <option value="surgical">🔪 งานศัลยกรรม (Surgical)</option>
                  <option value="other">📋 อื่นๆ (Other)</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">ทีมนำทางคลินิก (Team HA):</span>
                <select
                  value={data.team_ha_id}
                  onChange={(e: any) => setData('team_ha_id', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium"
                >
                  <option value="">(เลือกทีมนำคลินิก)</option>
                  {haTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name_th}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">บันทึกเหตุผลการแก้ไข (Log Note):</span>
                <input
                  type="text"
                  placeholder="เช่น อัปเดตสถิติปี 69, ปรับปรุงแนวทาง CPG"
                  value={data.change_summary}
                  onChange={(e) => setData('change_summary', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs focus:bg-white"
                />
              </div>
            </div>

            {/* Success Notice */}
            {showSaveNotice && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>บันทึกข้อมูล Clinical Tracer และสร้าง Snapshot สำหรับกู้คืนเรียบร้อยแล้ว</span>
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
                    ? "border-rose-600 text-rose-700 bg-rose-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Body */}
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {/* TAB 1: CONTEXT */}
          {activeTab === 'context' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  1. บริบทและสถิติผู้รับบริการ (Context & Service Statistics)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                สถิติผู้ป่วย, ข้อมูลขนาดปัญหา และสรุปการทบทวนเคสทางคลินิก (ข้อมูลผู้ป่วยได้รับการ Mask PII ตามกฎหมาย)
              </p>
              <textarea
                rows={16}
                value={data.context}
                onChange={(e) => setData('context', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-rose-500 font-sans"
                placeholder="ระบุข้อมูลบริบทและสถิติ..."
              />
            </div>
          )}

          {/* TAB 2: KEY ISSUES & RISKS */}
          {activeTab === 'key_issues' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  2. ประเด็นสำคัญและความเสี่ยงทางคลินิก (Key Quality Issues & Clinical Risks)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                จุดเสี่ยงในกระบวนการดูแลรักษา (คัดกรอง, วินิจฉัย, การรักษา, การส่งต่อ, ภาวะแทรกซ้อน)
              </p>
              <textarea
                rows={14}
                value={data.key_issues}
                onChange={(e) => setData('key_issues', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-rose-500 font-sans"
                placeholder="ระบุประเด็นความเสี่ยงสำคัญ..."
              />
            </div>
          )}

          {/* TAB 3: GOALS */}
          {activeTab === 'goals' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  3. เป้าหมายการพัฒนา (Development Goals & Objectives)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                เป้าหมายเชิงผลลัพธ์การดูแลผู้ป่วย (เช่น อัตราการรอดชีวิต, ลดระยะเวลาการรักษา, ความพึงพอใจ)
              </p>
              <textarea
                rows={12}
                value={data.goals}
                onChange={(e) => setData('goals', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-rose-500 font-sans"
                placeholder="ระบุเป้าหมายการพัฒนา..."
              />
            </div>
          )}

          {/* TAB 4: PROCESSES & CPG */}
          {activeTab === 'processes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  4. กระบวนการเพื่อให้ได้คุณภาพ (Quality Processes / CPG & Standing Order)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                แนวทางเวชปฏิบัติ CPG, Standing Order, Fast Track, Clinical Pathways และระบบการส่งต่อ
              </p>
              <textarea
                rows={16}
                value={data.processes}
                onChange={(e) => setData('processes', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-rose-500 font-sans"
                placeholder="ระบุกระบวนการพัฒนาคุณภาพ..."
              />
            </div>
          )}

          {/* TAB 5: KPIS & RESULTS */}
          {activeTab === 'kpis' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      ตารางตัวชี้วัดผลลัพธ์ทางคลินิก (Clinical Indicators)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ข้อมูลเปรียบเทียบเป้าหมายและผลงานย้อนหลัง 5 ปี (พ.ศ. 2565 - 2569)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addKpiRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มตัวชี้วัด</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                        <th className="p-3 w-1/3">ตัวชี้วัดทางคลินิก</th>
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
                      {data.kpi_data.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateKpiRow(idx, 'name', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white text-xs font-medium"
                              placeholder="ชื่อตัวชี้วัดทางคลินิก..."
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.target}
                              onChange={(e) => updateKpiRow(idx, 'target', e.target.value)}
                              className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs font-bold text-rose-700"
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
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  บทวิเคราะห์ผลลัพธ์และแนวทางพัฒนาตามรอบ PDCA
                </h3>
                <textarea
                  rows={8}
                  value={data.results_analysis}
                  onChange={(e) => setData('results_analysis', e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-rose-500 font-sans"
                  placeholder="ระบุการวิเคราะห์ผลลัพธ์..."
                />
              </div>
            </div>
          )}

          {/* TAB 6: NEXT PLANS */}
          {activeTab === 'next_plans' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  6
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  6. แผนการพัฒนาต่อเนื่อง (Continuous Quality Improvement Plans / CQI)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                แผนงานพัฒนาในปีถัดไป นวัตกรรม และกิจกรรมการป้องกันส่งเสริม
              </p>
              <textarea
                rows={12}
                value={data.next_plans}
                onChange={(e) => setData('next_plans', e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-rose-500 font-sans"
                placeholder="ระบุแผนการพัฒนาต่อเนื่อง..."
              />
            </div>
          )}

          {/* TAB 7: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    เอกสารแนบและแนวทางเวชปฏิบัติ (CPG & Evidence)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ไฟล์แนวทาง CPG, แผนผัง Fast Track หรือผลการประชุมทบทวนเคส
                  </p>
                </div>
              </div>

              {tracer.attachments.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-500" />
                  <p className="text-xs font-semibold text-slate-600">ยังไม่มีเอกสารแนบ</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    สามารถแนบไฟล์ CPG หรือแนวทางการรักษาประกอบการตรวจประเมินได้
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tracer.attachments.map((att) => (
                    <div key={att.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-rose-500" />
                        <span className="font-medium text-slate-800">{att.file_name}</span>
                        <span className="text-slate-400">({Math.round(att.file_size / 1024)} KB)</span>
                      </div>
                      <a
                        href={att.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-600 font-bold hover:underline"
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
