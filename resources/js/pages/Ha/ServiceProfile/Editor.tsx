import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Building2, 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  History, 
  Layers, 
  Compass, 
  Users, 
  TrendingUp, 
  Award, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Briefcase
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
  revisions?: any[];
}

interface Props {
  profile: ProfileProps;
  departments: Array<{ id: number; name: string; code?: string }>;
  haTeams: Array<{ id: number; name_th: string; abbreviation: string }>;
  adjacent: {
    prev?: { id: number; code: string; name: string };
    next?: { id: number; code: string; name: string };
  };
}

export default function ServiceProfileEditor({ profile, departments, haTeams, adjacent }: Props) {
  const [activeTab, setActiveTab] = useState<'context' | 'customers' | 'processes' | 'kpis' | 'cqi'>('context');
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const { data, setData, put, processing, errors } = useForm({
    code: profile.code || '',
    name: profile.name || '',
    department_id: profile.department_id || '',
    team_ha_id: profile.team_ha_id || '',
    service_group: profile.service_group || 'clinical',
    cycle_year: profile.cycle_year || '2569',
    leader_name: profile.leader_name || '',
    purpose: profile.purpose || '',
    scope_of_service: profile.scope_of_service || '',
    target_customers: profile.target_customers || [],
    key_quality_issues: profile.key_quality_issues || '',
    key_risks_challenges: profile.key_risks_challenges || '',
    workload_and_resources: profile.workload_and_resources || [],
    key_processes: profile.key_processes || [],
    performance_indicators: profile.performance_indicators || [],
    current_systems: profile.current_systems || '',
    ongoing_improvements: profile.ongoing_improvements || '',
    future_plans: profile.future_plans || '',
    status: profile.status || 'published',
    change_summary: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/ha/service-profile/${profile.id}`);
  };

  // Add / Remove Customer Row
  const addCustomerRow = () => {
    setData('target_customers', [
      ...data.target_customers,
      { customer: '', requirement: '', response: '' }
    ]);
  };

  const removeCustomerRow = (idx: number) => {
    const updated = [...data.target_customers];
    updated.splice(idx, 1);
    setData('target_customers', updated);
  };

  // Add / Remove Process Row
  const addProcessRow = () => {
    setData('key_processes', [
      ...data.key_processes,
      { process: '', expectation: '', kpi: '' }
    ]);
  };

  const removeProcessRow = (idx: number) => {
    const updated = [...data.key_processes];
    updated.splice(idx, 1);
    setData('key_processes', updated);
  };

  // Add / Remove KPI Row
  const addKpiRow = () => {
    setData('performance_indicators', [
      ...data.performance_indicators,
      { name: '', target: '', y2564: '', y2565: '', y2566: '', y2567: '', y2568: '', y2569: '' }
    ]);
  };

  const removeKpiRow = (idx: number) => {
    const updated = [...data.performance_indicators];
    updated.splice(idx, 1);
    setData('performance_indicators', updated);
  };

  return (
    <AppLayout
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'Service Profile', href: '/ha/service-profile' },
        { title: profile.name, href: `/ha/service-profile/${profile.id}` },
        { title: 'แก้ไขข้อมูล', href: '#' },
      ]}
    >
      <Head title={`แก้ไข Service Profile - ${profile.name}`} />

      <form onSubmit={handleSubmit} className="min-h-screen bg-slate-50/60 pb-20 font-sans">
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/ha/service-profile/${profile.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">ยกเลิก & กลับหน้ารายละเอียด</span>
              </Link>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2 py-0.5 rounded">
                [{data.code}]
              </span>
              <span className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                {data.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Prev / Next quick navigation */}
              {adjacent.prev && (
                <Link
                  href={`/ha/service-profile/${adjacent.prev.id}/edit`}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs hidden md:flex items-center gap-1"
                  title={`ก่อนหน้า: ${adjacent.prev.name}`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{adjacent.prev.code}</span>
                </Link>
              )}

              {adjacent.next && (
                <Link
                  href={`/ha/service-profile/${adjacent.next.id}/edit`}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs hidden md:flex items-center gap-1"
                  title={`ถัดไป: ${adjacent.next.name}`}
                >
                  <span>{adjacent.next.code}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <button
                type="button"
                onClick={() => setShowRevisionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>ประวัติ & กู้คืน (v{profile.current_version})</span>
              </button>

              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{processing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto text-xs border-t border-slate-100">
            {[
              { id: 'context', label: '1. ข้อมูลทั่วไป & บริบท', icon: <Building2 className="w-3.5 h-3.5" /> },
              { id: 'customers', label: '2. ผู้รับผลงาน & ความเสี่ยง', icon: <Users className="w-3.5 h-3.5" /> },
              { id: 'processes', label: '3. กระบวนการสำคัญ', icon: <Compass className="w-3.5 h-3.5" /> },
              { id: 'kpis', label: '4. ตัวชี้วัดผลงาน 6 ปี', icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { id: 'cqi', label: '5. ระบบงาน & แผน CQI', icon: <Award className="w-3.5 h-3.5" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-4 py-2.5 font-bold whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-all cursor-pointer",
                    isActive
                      ? "border-amber-600 text-amber-700 bg-amber-50/50"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* ================= TAB 1: CONTEXT ================= */}
          {activeTab === 'context' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                1. ข้อมูลทั่วไปและบริบทหน่วยงาน (Context)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">รหัสหน่วยงาน (Code) *</label>
                  <input
                    type="text"
                    value={data.code}
                    onChange={(e) => setData('code', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold bg-slate-50 focus:bg-white focus:border-amber-500 outline-none"
                    placeholder="เช่น OPD, IPD, ER, LAB"
                  />
                  {errors.code && <div className="text-rose-600 text-[11px] mt-1">{errors.code}</div>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ชื่อหน่วยงาน / แผนก *</label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:bg-white focus:border-amber-500 outline-none"
                    placeholder="ชื่อแผนกเต็ม"
                  />
                  {errors.name && <div className="text-rose-600 text-[11px] mt-1">{errors.name}</div>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">กลุ่มสายงาน (Service Group) *</label>
                  <select
                    value={data.service_group}
                    onChange={(e) => setData('service_group', e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                  >
                    <option value="clinical">🩺 บริการทางคลินิก (Clinical)</option>
                    <option value="diagnostic_support">🔬 วินิจฉัย & สนับสนุนการแพทย์</option>
                    <option value="general_support">🏢 สนับสนุนทั่วไป & บริหาร</option>
                    <option value="quality_safety">🛡️ คุณภาพ & ความปลอดภัย</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">แผนกที่สังกัด (Departments)</label>
                  <select
                    value={data.department_id}
                    onChange={(e) => setData('department_id', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">-- ไม่ระบุแผนก --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ทีมนำคุณภาพ (Team HA)</label>
                  <select
                    value={data.team_ha_id}
                    onChange={(e) => setData('team_ha_id', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">-- ไม่ระบุทีมนำ --</option>
                    {haTeams.map((t) => (
                      <option key={t.id} value={t.id}>[{t.abbreviation}] {t.name_th}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ผู้รับผิดชอบหลัก / หน.แผนก</label>
                  <input
                    type="text"
                    value={data.leader_name}
                    onChange={(e) => setData('leader_name', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none"
                    placeholder="เช่น พยาบาลวิชาชีพ หน.แผนก..."
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">ก. หน้าที่และเป้าหมาย (Purpose)</label>
                  <textarea
                    rows={4}
                    value={data.purpose}
                    onChange={(e) => setData('purpose', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 leading-relaxed outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    placeholder="ระบุหน้าที่หลัก วัตถุประสงค์ และเป้าหมายของหน่วยงาน..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">ข. ขอบเขตการให้บริการ ศักยภาพ และข้อจำกัด (Scope of Service)</label>
                  <textarea
                    rows={5}
                    value={data.scope_of_service}
                    onChange={(e) => setData('scope_of_service', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 leading-relaxed outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    placeholder="ระบุวันเวลาบริการ ประเภทบริการ ศักยภาพ และข้อจำกัดในการให้บริการ..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: CUSTOMERS & RISKS ================= */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">
                  2. ผู้รับผลงาน ความต้องการ และความเสี่ยงสำคัญ
                </h3>
                <button
                  type="button"
                  onClick={addCustomerRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มแถวผู้รับผลงาน</span>
                </button>
              </div>

              {/* Customers Table */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">ค. ผู้รับผลงานและความต้องการสำคัญ (ลูกค้าภายนอก / ลูกค้าภายใน)</label>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <th className="p-2.5 text-left w-1/4">ผู้รับผลงาน (กลุ่มลูกค้า)</th>
                        <th className="p-2.5 text-left">ความต้องการสำคัญ</th>
                        <th className="p-2.5 text-left w-1/3">การตอบสนองของหน่วยงาน</th>
                        <th className="p-2.5 text-center w-12">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.target_customers.map((c, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="p-2">
                            <input
                              type="text"
                              value={c.customer}
                              onChange={(e) => {
                                const updated = [...data.target_customers];
                                updated[idx].customer = e.target.value;
                                setData('target_customers', updated);
                              }}
                              className="w-full p-1.5 text-xs rounded border border-slate-200 font-bold"
                              placeholder="เช่น ผู้ป่วยนอก, แพทย์..."
                            />
                          </td>
                          <td className="p-2">
                            <textarea
                              rows={2}
                              value={c.requirement}
                              onChange={(e) => {
                                const updated = [...data.target_customers];
                                updated[idx].requirement = e.target.value;
                                setData('target_customers', updated);
                              }}
                              className="w-full p-1.5 text-xs rounded border border-slate-200"
                              placeholder="ความต้องการสำคัญ..."
                            />
                          </td>
                          <td className="p-2">
                            <textarea
                              rows={2}
                              value={c.response || ''}
                              onChange={(e) => {
                                const updated = [...data.target_customers];
                                updated[idx].response = e.target.value;
                                setData('target_customers', updated);
                              }}
                              className="w-full p-1.5 text-xs rounded border border-slate-200"
                              placeholder="การตอบสนอง..."
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeCustomerRow(idx)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
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

              {/* Quality Issues & Risks */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">ง. ประเด็นคุณภาพที่สำคัญ (Key Quality Issues)</label>
                  <textarea
                    rows={4}
                    value={data.key_quality_issues}
                    onChange={(e) => setData('key_quality_issues', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 leading-relaxed outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    placeholder="ระบุประเด็นคุณภาพสำคัญที่หน่วยงานมุ่งเน้นพัฒนา..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">จ. ความท้าทายและความเสี่ยงสำคัญ (Clinical & Non-Clinical Risks)</label>
                  <textarea
                    rows={5}
                    value={data.key_risks_challenges}
                    onChange={(e) => setData('key_risks_challenges', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 leading-relaxed outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    placeholder="ระบุจุดเสี่ยงสำคัญ ความเสี่ยงทางคลินิก และความเสี่ยงทั่วไป..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: KEY PROCESSES ================= */}
          {activeTab === 'processes' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    3. กระบวนการสำคัญ (Key Processes)
                  </h3>
                  <p className="text-xs text-slate-500">ระบุขั้นตอน สิ่งที่คาดหวัง และตัวชี้วัดกำกับกระบวนการ</p>
                </div>
                <button
                  type="button"
                  onClick={addProcessRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มกระบวนการ</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-950/5 text-slate-900 font-bold border-b border-slate-200">
                      <th className="p-2.5 text-left w-1/3">กระบวนการสำคัญ (Key Process)</th>
                      <th className="p-2.5 text-left">สิ่งที่คาดหวัง / ข้อกำหนด (Process Requirements)</th>
                      <th className="p-2.5 text-left w-1/3">ตัวชี้วัดสำคัญ (Indicators)</th>
                      <th className="p-2.5 text-center w-12">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.key_processes.map((row, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="p-2">
                          <textarea
                            rows={3}
                            value={row.process}
                            onChange={(e) => {
                              const updated = [...data.key_processes];
                              updated[idx].process = e.target.value;
                              setData('key_processes', updated);
                            }}
                            className="w-full p-2 text-xs rounded border border-slate-200 font-bold"
                            placeholder="กระบวนการสำคัญ..."
                          />
                        </td>
                        <td className="p-2">
                          <textarea
                            rows={3}
                            value={row.expectation}
                            onChange={(e) => {
                              const updated = [...data.key_processes];
                              updated[idx].expectation = e.target.value;
                              setData('key_processes', updated);
                            }}
                            className="w-full p-2 text-xs rounded border border-slate-200"
                            placeholder="สิ่งที่คาดหวัง..."
                          />
                        </td>
                        <td className="p-2">
                          <textarea
                            rows={3}
                            value={row.kpi || ''}
                            onChange={(e) => {
                              const updated = [...data.key_processes];
                              updated[idx].kpi = e.target.value;
                              setData('key_processes', updated);
                            }}
                            className="w-full p-2 text-xs rounded border border-slate-200"
                            placeholder="ตัวชี้วัดกำกับ..."
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeProcessRow(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
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

          {/* ================= TAB 4: KPIS ================= */}
          {activeTab === 'kpis' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    4. ตัวชี้วัดผลการดำเนินงาน 6 ปี (Performance Indicators)
                  </h3>
                  <p className="text-xs text-slate-500">บันทึกเป้าหมายและผลงานรายปี พ.ศ. 2564–2569</p>
                </div>
                <button
                  type="button"
                  onClick={addKpiRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold hover:bg-sky-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มตัวชี้วัด</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                      <th className="p-2.5 text-center w-10">ลำดับ</th>
                      <th className="p-2.5 text-left w-[36%]">เครื่องชี้วัด</th>
                      <th className="p-2.5 text-center w-[13%]">เป้าหมาย</th>
                      <th className="p-2.5 text-center w-[6.5%] text-slate-300">ปี 64</th>
                      <th className="p-2.5 text-center w-[6.5%] text-slate-300">ปี 65</th>
                      <th className="p-2.5 text-center w-[6.5%] text-slate-300">ปี 66</th>
                      <th className="p-2.5 text-center w-[6.5%] text-slate-300">ปี 67</th>
                      <th className="p-2.5 text-center w-[6.5%] text-slate-300">ปี 68</th>
                      <th className="p-2.5 text-center w-[8.5%] bg-amber-500 text-slate-950 font-black">ปี 69</th>
                      <th className="p-2.5 text-center w-10">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.performance_indicators.map((kpi, idx) => {
                      const hasSubs = kpi.sub_items && kpi.sub_items.length > 0;

                      return (
                        <React.Fragment key={idx}>
                          <tr className={cn("align-top", hasSubs ? "bg-slate-50 font-bold" : "hover:bg-slate-50/50")}>
                            <td className="p-2 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="p-1.5">
                              <textarea
                                rows={hasSubs ? 2 : 2}
                                value={kpi.name}
                                onChange={(e) => {
                                  const updated = [...data.performance_indicators];
                                  updated[idx].name = e.target.value;
                                  setData('performance_indicators', updated);
                                }}
                                className={cn(
                                  "w-full p-1.5 text-xs rounded border border-slate-200 outline-none focus:border-amber-500",
                                  hasSubs ? "font-bold text-slate-900 bg-white" : "font-medium"
                                )}
                                placeholder="ชื่อเครื่องชี้วัด..."
                              />
                              {hasSubs && (
                                <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
                                  มี {kpi.sub_items!.length} รายการย่อยด้านล่าง
                                </span>
                              )}
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={kpi.target || ''}
                                disabled={hasSubs}
                                onChange={(e) => {
                                  const updated = [...data.performance_indicators];
                                  updated[idx].target = e.target.value;
                                  setData('performance_indicators', updated);
                                }}
                                className={cn(
                                  "w-full p-1.5 text-xs rounded border border-slate-200 text-center font-bold text-indigo-700 outline-none",
                                  hasSubs && "bg-slate-100 text-slate-400 italic cursor-not-allowed"
                                )}
                                placeholder={hasSubs ? "ตามข้อย่อย" : "เช่น 100%"}
                              />
                            </td>
                            {['y2564', 'y2565', 'y2566', 'y2567', 'y2568', 'y2569'].map((yr) => (
                              <td key={yr} className="p-1.5">
                                <input
                                  type="text"
                                  disabled={hasSubs}
                                  value={(kpi as any)[yr] || ''}
                                  onChange={(e) => {
                                    const updated = [...data.performance_indicators];
                                    (updated[idx] as any)[yr] = e.target.value;
                                    setData('performance_indicators', updated);
                                  }}
                                  className={cn(
                                    "w-full p-1.5 text-xs rounded border border-slate-200 text-center outline-none",
                                    yr === 'y2569' && "bg-amber-50/60 font-bold text-amber-950",
                                    hasSubs && "bg-slate-100 text-slate-300 cursor-not-allowed"
                                  )}
                                  placeholder={hasSubs ? "-" : ""}
                                />
                              </td>
                            ))}
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeKpiRow(idx)}
                                className="p-1.5 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                                title="ลบตัวชี้วัดนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>

                          {/* Editable Sub-items Rows */}
                          {hasSubs && kpi.sub_items!.map((sub, sIdx) => (
                            <tr key={`${idx}-sub-${sIdx}`} className="bg-slate-50/40 border-l-4 border-indigo-400 align-top">
                              <td className="p-1.5 text-center text-[10px] font-mono text-slate-400">
                                {idx + 1}.{sIdx + 1}
                              </td>
                              <td className="p-1.5 pl-4">
                                <input
                                  type="text"
                                  value={sub.name}
                                  onChange={(e) => {
                                    const updated = [...data.performance_indicators];
                                    updated[idx].sub_items![sIdx].name = e.target.value;
                                    setData('performance_indicators', updated);
                                  }}
                                  className="w-full p-1.5 text-xs rounded border border-slate-200 font-medium text-slate-800 bg-white outline-none focus:border-indigo-500"
                                  placeholder="ชื่อข้อย่อย..."
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={sub.target || ''}
                                  onChange={(e) => {
                                    const updated = [...data.performance_indicators];
                                    updated[idx].sub_items![sIdx].target = e.target.value;
                                    setData('performance_indicators', updated);
                                  }}
                                  className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-bold text-indigo-700 bg-white outline-none focus:border-indigo-500"
                                  placeholder="เป้าหมาย"
                                />
                              </td>
                              {['2564', '2565', '2566', '2567', '2568', '2569'].map((yr) => (
                                <td key={yr} className="p-1.5">
                                  <input
                                    type="text"
                                    value={sub.years?.[yr] || ''}
                                    onChange={(e) => {
                                      const updated = [...data.performance_indicators];
                                      if (!updated[idx].sub_items![sIdx].years) {
                                        updated[idx].sub_items![sIdx].years = {};
                                      }
                                      updated[idx].sub_items![sIdx].years![yr] = e.target.value;
                                      setData('performance_indicators', updated);
                                    }}
                                    className={cn(
                                      "w-full p-1.5 text-xs rounded border border-slate-200 text-center bg-white outline-none focus:border-indigo-500",
                                      yr === '2569' && "bg-amber-50/80 font-bold text-amber-950"
                                    )}
                                  />
                                </td>
                              ))}
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...data.performance_indicators];
                                    updated[idx].sub_items!.splice(sIdx, 1);
                                    if (updated[idx].sub_items!.length === 0) {
                                      delete updated[idx].sub_items;
                                    }
                                    setData('performance_indicators', updated);
                                  }}
                                  className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="ลบข้อย่อยนี้"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
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

          {/* ================= TAB 5: CQI & FUTURE PLANS ================= */}
          {activeTab === 'cqi' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
              <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                5. ระบบงานปัจจุบัน โครงการ CQI และแผนพัฒนาต่อเนื่อง
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    4.1 ระบบงานที่ใช้อยู่ในปัจจุบัน (รวมทั้งโครงการ CQI ที่สำเร็จแล้ว)
                  </label>
                  <textarea
                    rows={5}
                    value={data.current_systems}
                    onChange={(e) => setData('current_systems', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 leading-relaxed outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    placeholder="ระบุระบบงานสำคัญ หรือโครงการพัฒนาคุณภาพที่ได้ดำเนินการสำเร็จ..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    4.2 การพัฒนาคุณภาพที่อยู่ระหว่างดำเนินการ
                  </label>
                  <textarea
                    rows={4}
                    value={data.ongoing_improvements}
                    onChange={(e) => setData('ongoing_improvements', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 leading-relaxed outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    placeholder="ระบุโครงการที่กำลังดำเนินการอยู่ในปัจจุบัน..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    5. แผนการพัฒนาต่อเนื่องในระยะ 1–3 ปีข้างหน้า (Future Plans)
                  </label>
                  <textarea
                    rows={5}
                    value={data.future_plans}
                    onChange={(e) => setData('future_plans', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 leading-relaxed outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    placeholder="ระบุเป้าหมายและแผนการพัฒนาต่อเนื่องในอนาคต..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Change Summary & Submit footer card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="w-full sm:max-w-md">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                หมายเหตุสรุปการแก้ไข (Revision Note)
              </label>
              <input
                type="text"
                value={data.change_summary}
                onChange={(e) => setData('change_summary', e.target.value)}
                placeholder="เช่น ปรับปรุงตัวชี้วัดปี 69, เพิ่มกระบวนการสำคัญ..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link
                href={`/ha/service-profile/${profile.id}`}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {processing ? 'กำลังบันทึกข้อมูล...' : 'บันทึกเวอร์ชันใหม่'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Revision Modal */}
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
