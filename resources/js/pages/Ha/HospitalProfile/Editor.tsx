import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Building2, 
  FileText, 
  Users, 
  Activity, 
  ShieldCheck, 
  Save, 
  ArrowLeft, 
  History, 
  Plus, 
  Trash2, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import RevisionModal from './RevisionModal';

interface Props {
  profile: any;
  activeTab?: string;
}

export default function HospitalProfileEditor({ profile, activeTab = 'gen' }: Props) {
  const [currentTab, setCurrentTab] = useState<string>(activeTab);
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);

  const { data, setData, put, processing, errors } = useForm({
    hospital_name_th: profile.hospital_name_th || '',
    hospital_name_en: profile.hospital_name_en || '',
    address: profile.address || '',
    hospital_type: profile.hospital_type || '',
    hospital_level: profile.hospital_level || '',
    affiliation: profile.affiliation || '',
    registered_beds: profile.registered_beds || 60,
    actual_beds: profile.actual_beds || 30,
    occupancy_rate: profile.occupancy_rate || 78.5,
    vision: profile.vision || '',
    mission: profile.mission || '',
    core_values: profile.core_values || '',
    core_competencies: profile.core_competencies || '',
    strategic_focus: profile.strategic_focus || '',
    strategic_advantages: profile.strategic_advantages || '',
    strategic_challenges: profile.strategic_challenges || '',
    front_page_info: profile.front_page_info || {},
    patient_profile: profile.patient_profile || { top_opd: [], top_ipd: [], rights: [], high_risk_groups: [] },
    staff_profile: profile.staff_profile || { staff_table: [] },
    workload_data: profile.workload_data || { outpatient_physician_workload: [] },
    entry_data: profile.entry_data || {},
    one_page_summary: profile.one_page_summary || {},
    change_summary: '',
    tab: currentTab,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put('/ha/hospital-profile');
  };

  const tabs = [
    { id: 'gen', label: 'ข้อมูลทั่วไป & ทิศทาง' },
    { id: 'strategy', label: 'กลยุทธ์ & จุดเน้น' },
    { id: 'pt', label: 'สถิติผู้ป่วย (Pt Profile)' },
    { id: 'staff', label: 'อัตรากำลัง (Staff)' },
    { id: 'workload', label: 'ภาระงาน (Workload)' },
    { id: 'entry', label: 'ลักษณะสำคัญขององค์กร' },
  ];

  return (
    <AppLayout
      title="แก้ไขข้อมูล Hospital Profile"
      breadcrumbs={[
        { title: 'หน้าแรก', href: '/' },
        { title: 'ศูนย์พัฒนาคุณภาพ (งาน HA)', href: '/ha' },
        { title: 'Hospital Profile', href: '/ha/hospital-profile' },
        { title: 'แบบฟอร์มแก้ไข', href: '/ha/hospital-profile/edit' },
      ]}
    >
      <Head title="แก้ไข Hospital Profile - โรงพยาบาลค่ายสุรสิงหนาท" />

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header Action Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/ha/hospital-profile"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                แก้ไขข้อมูล Hospital Profile
              </h1>
            </div>
            <p className="text-xs text-slate-500 pl-8">
              เวอร์ชันปัจจุบัน #{profile.current_version} • บันทึกแล้วระบบจะสร้าง snapshot revision ให้อัตโนมัติ
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setShowRevisionModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>ประวัติ & กู้คืน ({profile.revisions?.length ?? 0})</span>
            </button>

            <button
              type="submit"
              disabled={processing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{processing ? 'กำลังบันทึก...' : 'บันทึกข้อมูล (Save)'}</span>
            </button>
          </div>
        </div>

        {/* Change summary input */}
        <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-amber-950 whitespace-nowrap shrink-0">
            บันทึกการปรับปรุง (Change Summary):
          </label>
          <input
            type="text"
            value={data.change_summary}
            onChange={(e) => setData('change_summary', e.target.value)}
            placeholder="เช่น อัปเดตสถิติ Top 10 OPD ปี 69, ปรับเพิ่มอัตรากำลังแพทย์..."
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-amber-200 bg-white text-slate-900 outline-none focus:border-amber-500"
          />
        </div>

        {/* Editor Tabs Navigation */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setCurrentTab(t.id);
                setData('tab', t.id);
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                currentTab === t.id
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: GEN INFOR */}
        {currentTab === 'gen' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              ข้อมูลทั่วไปและทิศทางองค์กร
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ชื่อองค์กร (ภาษาไทย) *</label>
                <input
                  type="text"
                  value={data.hospital_name_th}
                  onChange={(e) => setData('hospital_name_th', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ชื่อองค์กร (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  value={data.hospital_name_en}
                  onChange={(e) => setData('hospital_name_en', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">ที่อยู่ / สถานที่ตั้ง</label>
                <input
                  type="text"
                  value={data.address}
                  onChange={(e) => setData('address', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ประเภทสถานพยาบาล</label>
                <input
                  type="text"
                  value={data.hospital_type}
                  onChange={(e) => setData('hospital_type', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ระดับสถานพยาบาล</label>
                <input
                  type="text"
                  value={data.hospital_level}
                  onChange={(e) => setData('hospital_level', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">ต้นสังกัด</label>
                <input
                  type="text"
                  value={data.affiliation}
                  onChange={(e) => setData('affiliation', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">เตียงขออนุญาต (เตียง)</label>
                <input
                  type="number"
                  value={data.registered_beds}
                  onChange={(e) => setData('registered_beds', Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">เตียงเปิดจริง (เตียง)</label>
                <input
                  type="number"
                  value={data.actual_beds}
                  onChange={(e) => setData('actual_beds', Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">วิสัยทัศน์ (Vision)</label>
                <textarea
                  rows={3}
                  value={data.vision}
                  onChange={(e) => setData('vision', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">พันธกิจ (Mission)</label>
                <textarea
                  rows={4}
                  value={data.mission}
                  onChange={(e) => setData('mission', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">ค่านิยมองค์กร (Core Values)</label>
                  <textarea
                    rows={3}
                    value={data.core_values}
                    onChange={(e) => setData('core_values', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">สมรรถนะหลัก (Core Competencies)</label>
                  <textarea
                    rows={3}
                    value={data.core_competencies}
                    onChange={(e) => setData('core_competencies', e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STRATEGY */}
        {currentTab === 'strategy' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              กลยุทธ์และจุดเน้นในการพัฒนา
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                เข็มมุ่งและจุดเน้นในการพัฒนา (Strategic Focus พ.ศ. 2566–2570)
              </label>
              <textarea
                rows={5}
                value={data.strategic_focus}
                onChange={(e) => setData('strategic_focus', e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                ความได้เปรียบเชิงกลยุทธ์ (Strategic Advantages)
              </label>
              <textarea
                rows={6}
                value={data.strategic_advantages}
                onChange={(e) => setData('strategic_advantages', e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                ความท้าทายเชิงกลยุทธ์ (Strategic Challenges)
              </label>
              <textarea
                rows={6}
                value={data.strategic_challenges}
                onChange={(e) => setData('strategic_challenges', e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 3: PT PROFILE */}
        {currentTab === 'pt' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                10 อันดับโรคผู้ป่วยนอกที่พบบ่อย (Top 10 Diagnosis - OPD)
              </h3>
              <button
                type="button"
                onClick={() => {
                  const updated = [...(data.patient_profile.top_opd || [])];
                  updated.push({ rank: String(updated.length + 1), disease: '', y2567: '0', y2568: '0', y2569: '0' });
                  setData('patient_profile', { ...data.patient_profile, top_opd: updated });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มแถวโรค</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2 text-center w-12">ลำดับ</th>
                    <th className="p-2 text-left">ชื่อโรค / ภาวะ (Diagnosis)</th>
                    <th className="p-2 text-center w-24">ปี 2567</th>
                    <th className="p-2 text-center w-24">ปี 2568</th>
                    <th className="p-2 text-center w-24 bg-amber-500 text-slate-950">ปี 2569</th>
                    <th className="p-2 text-center w-12">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.patient_profile.top_opd || []).map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.disease}
                          onChange={(e) => {
                            const updated = [...data.patient_profile.top_opd];
                            updated[idx].disease = e.target.value;
                            setData('patient_profile', { ...data.patient_profile, top_opd: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 font-bold"
                          placeholder="ชื่อโรค..."
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.y2567 || ''}
                          onChange={(e) => {
                            const updated = [...data.patient_profile.top_opd];
                            updated[idx].y2567 = e.target.value;
                            setData('patient_profile', { ...data.patient_profile, top_opd: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.y2568 || ''}
                          onChange={(e) => {
                            const updated = [...data.patient_profile.top_opd];
                            updated[idx].y2568 = e.target.value;
                            setData('patient_profile', { ...data.patient_profile, top_opd: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.y2569 || ''}
                          onChange={(e) => {
                            const updated = [...data.patient_profile.top_opd];
                            updated[idx].y2569 = e.target.value;
                            setData('patient_profile', { ...data.patient_profile, top_opd: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono font-bold bg-amber-50"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...data.patient_profile.top_opd];
                            updated.splice(idx, 1);
                            setData('patient_profile', { ...data.patient_profile, top_opd: updated });
                          }}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50"
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
        )}

        {/* TAB 4: STAFF */}
        {currentTab === 'staff' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              อัตรากำลังบุคลากรทางการแพทย์ (Staff Profile)
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2.5 text-left">ตำแหน่ง / สาขาวิชาชีพ</th>
                    <th className="p-2.5 text-center w-28">Full Time</th>
                    <th className="p-2.5 text-center w-32">Part Time FTE</th>
                    <th className="p-2.5 text-center w-28 bg-amber-500 text-slate-950 font-black">รวมทั้งหมด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.staff_profile.staff_table || []).map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.role}
                          onChange={(e) => {
                            const updated = [...data.staff_profile.staff_table];
                            updated[idx].role = e.target.value;
                            setData('staff_profile', { ...data.staff_profile, staff_table: updated });
                          }}
                          className={cn("w-full p-1.5 text-xs rounded border border-slate-200", row.is_sub && "pl-6 text-slate-600")}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.full_time}
                          onChange={(e) => {
                            const updated = [...data.staff_profile.staff_table];
                            updated[idx].full_time = e.target.value;
                            setData('staff_profile', { ...data.staff_profile, staff_table: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.part_time_fte}
                          onChange={(e) => {
                            const updated = [...data.staff_profile.staff_table];
                            updated[idx].part_time_fte = e.target.value;
                            setData('staff_profile', { ...data.staff_profile, staff_table: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.total}
                          onChange={(e) => {
                            const updated = [...data.staff_profile.staff_table];
                            updated[idx].total = e.target.value;
                            setData('staff_profile', { ...data.staff_profile, staff_table: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono font-bold bg-slate-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: WORKLOAD */}
        {currentTab === 'workload' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              ภาระงานผู้ป่วยนอก / แพทย์ตรวจต่อชั่วโมง (Workload)
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2.5 text-left">หน่วยงาน / สาขาวิชา</th>
                    <th className="p-2.5 text-center w-32">จำนวน Visit (ปี 67)</th>
                    <th className="p-2.5 text-center w-32">ตรวจ/ชม. (ปี 67)</th>
                    <th className="p-2.5 text-center w-32 bg-amber-600 text-white">จำนวน Visit (ปี 68)</th>
                    <th className="p-2.5 text-center w-32 bg-amber-500 text-slate-950 font-black">ตรวจ/ชม. (ปี 68)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.workload_data.outpatient_physician_workload || []).map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.department}
                          onChange={(e) => {
                            const updated = [...data.workload_data.outpatient_physician_workload];
                            updated[idx].department = e.target.value;
                            setData('workload_data', { ...data.workload_data, outpatient_physician_workload: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.visits_y2567}
                          onChange={(e) => {
                            const updated = [...data.workload_data.outpatient_physician_workload];
                            updated[idx].visits_y2567 = e.target.value;
                            setData('workload_data', { ...data.workload_data, outpatient_physician_workload: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.rate_y2567}
                          onChange={(e) => {
                            const updated = [...data.workload_data.outpatient_physician_workload];
                            updated[idx].rate_y2567 = e.target.value;
                            setData('workload_data', { ...data.workload_data, outpatient_physician_workload: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono font-bold text-indigo-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.visits_y2568}
                          onChange={(e) => {
                            const updated = [...data.workload_data.outpatient_physician_workload];
                            updated[idx].visits_y2568 = e.target.value;
                            setData('workload_data', { ...data.workload_data, outpatient_physician_workload: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.rate_y2568}
                          onChange={(e) => {
                            const updated = [...data.workload_data.outpatient_physician_workload];
                            updated[idx].rate_y2568 = e.target.value;
                            setData('workload_data', { ...data.workload_data, outpatient_physician_workload: updated });
                          }}
                          className="w-full p-1.5 text-xs rounded border border-slate-200 text-center font-mono font-black bg-amber-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: ENTRY */}
        {currentTab === 'entry' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              ลักษณะสำคัญขององค์กรและบริการหลัก
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                บริการหลักขององค์กร (Core Services - ด้านการทหารและพลเรือน)
              </label>
              <textarea
                rows={6}
                value={data.entry_data?.core_services || ''}
                onChange={(e) => setData('entry_data', { ...data.entry_data, core_services: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 leading-relaxed outline-none"
              />
            </div>
          </div>
        )}
      </form>

      {/* Revision Modal */}
      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        revisions={profile.revisions || []}
        currentVersion={profile.current_version}
      />
    </AppLayout>
  );
}
