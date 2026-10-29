import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
  Printer, 
  ArrowLeft, 
  Building2, 
  FileText, 
  Users, 
  Activity, 
  ShieldCheck, 
  Award, 
  Sparkles,
  Bed,
  Target,
  Flame,
  Zap,
  CheckCircle2,
  Stethoscope,
  HeartHandshake,
  Clock,
  Layers,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  profile: any;
  mode?: 'onepage' | 'full';
}

export default function HospitalProfilePrintView({ profile, mode = 'onepage' }: Props) {
  const [printMode, setPrintMode] = useState<'onepage' | 'full'>(mode);

  const front = profile.front_page_info || {};
  const pt = profile.patient_profile || {};
  const staff = profile.staff_profile || {};
  const workload = profile.workload_data || {};
  const entry = profile.entry_data || {};
  const onepage = profile.one_page_summary || {};

  // Clean workload rows: filter out empty headers if any
  const workloadRows = (workload.outpatient_physician_workload || []).filter((r: any) => {
    return r.department && !r.department.includes('˹§ҹ') && !r.department.includes('หน่วยงาน/สาขา');
  });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-800 font-sans p-4 sm:p-8 print:p-0">
      <Head title={`Hospital Profile - ${profile.hospital_name_th}`} />

      {/* Control Bar (Hidden on print) */}
      <div className="max-w-5xl mx-auto mb-6 print:hidden">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/ha/hospital-profile"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                พิมพ์รายงาน Hospital Profile
              </h2>
              <p className="text-xs text-slate-500">
                โรงพยาบาลค่ายสุรสิงหนาท • เวอร์ชัน #{profile.current_version}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPrintMode('onepage')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                  printMode === 'onepage' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                1. สรุป 1 หน้า (One-Page)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('full')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                  printMode === 'full' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                2. เล่มเต็ม 7 หมวด (Full Report)
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร (Print / PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= PRINT SHEET ================= */}
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 print:border-none p-8 sm:p-12 shadow-lg print:shadow-none print:p-0 space-y-8">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] uppercase tracking-widest text-slate-700 font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Hospital Accreditation Document (HA Hospital Profile)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {profile.hospital_name_th}
          </h1>
          <p className="text-sm font-bold text-slate-600">
            {profile.hospital_name_en} • สังกัด: {profile.affiliation}
          </p>
          <div className="text-xs text-slate-500 flex items-center justify-center gap-3 pt-1">
            <span>พิมพ์วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>•</span>
            <span>เวอร์ชัน #{profile.current_version}</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">
              {printMode === 'onepage' ? 'รายงานสรุปภาพรวม 1 หน้า (Executive One-Page)' : 'เอกสารบริบทโรงพยาบาลฉบับสมบูรณ์ 7 หมวด (Full Dossier)'}
            </span>
          </div>
        </div>

        {/* ================= MODE 1: ONE-PAGE EXECUTIVE SUMMARY ================= */}
        {printMode === 'onepage' && (
          <div className="space-y-6 text-xs leading-relaxed">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-300 text-center">
              <div>
                <span className="text-slate-500 block text-[10px]">ระดับสถานพยาบาล</span>
                <strong className="text-slate-900 text-xs">{profile.hospital_type} ({profile.hospital_level})</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ขนาดเตียง</span>
                <strong className="text-slate-900 text-xs">{profile.registered_beds} (เปิดจริง {profile.actual_beds} เตียง)</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">อัตราครองเตียง</span>
                <strong className="text-emerald-700 text-xs font-bold">{profile.occupancy_rate}%</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ผู้ป่วยนอกต่อปี</span>
                <strong className="text-indigo-700 text-xs font-bold">42,000+ ครั้ง</strong>
              </div>
            </div>

            {/* 3 Column Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Col 1 */}
              <div className="space-y-4">
                <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                  <div className="bg-indigo-50 px-2 py-1 rounded text-[11px] font-bold text-indigo-950 border-l-4 border-indigo-600">
                    วิสัยทัศน์ (Vision)
                  </div>
                  <p className="text-[11px] text-slate-800 leading-normal pl-1">{profile.vision}</p>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                  <div className="bg-amber-50 px-2 py-1 rounded text-[11px] font-bold text-amber-950 border-l-4 border-amber-600">
                    เข็มมุ่งยุทธศาสตร์ 2566–2570
                  </div>
                  <p className="text-[11px] text-slate-800 leading-normal pl-1">{profile.strategic_focus}</p>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                  <div className="bg-slate-100 px-2 py-1 rounded text-[11px] font-bold text-slate-900 border-l-4 border-slate-600">
                    สมรรถนะหลัก (Core Competency)
                  </div>
                  <p className="text-[11px] text-slate-800 leading-normal pl-1">{profile.core_competencies}</p>
                </div>
              </div>

              {/* Col 2 */}
              <div className="space-y-4">
                <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                  <div className="bg-emerald-50 px-2 py-1 rounded text-[11px] font-bold text-emerald-950 border-l-4 border-emerald-600">
                    ความได้เปรียบเชิงกลยุทธ์ (11 ข้อ)
                  </div>
                  <p className="text-[10.5px] text-slate-800 leading-normal pl-1 whitespace-pre-wrap">{profile.strategic_advantages}</p>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                  <div className="bg-rose-50 px-2 py-1 rounded text-[11px] font-bold text-rose-950 border-l-4 border-rose-600">
                    ความท้าทายเชิงกลยุทธ์ (8 ข้อ)
                  </div>
                  <p className="text-[10.5px] text-slate-800 leading-normal pl-1 whitespace-pre-wrap">{profile.strategic_challenges}</p>
                </div>
              </div>

              {/* Col 3 */}
              <div className="space-y-4">
                <div className="border border-slate-300 rounded-lg p-3 space-y-2">
                  <div className="bg-sky-50 px-2 py-1 rounded text-[11px] font-bold text-sky-950 border-l-4 border-sky-600">
                    Top 5 โรค OPD สูงสุด
                  </div>
                  <table className="w-full text-[10.5px] border-collapse">
                    <tbody>
                      {(pt.top_opd || []).slice(0, 5).map((d: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="py-1 text-slate-700">{idx + 1}. {d.disease}</td>
                          <td className="py-1 text-right font-mono font-bold text-indigo-800">{Number(d.y2568 || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 space-y-2">
                  <div className="bg-slate-100 px-2 py-1 rounded text-[11px] font-bold text-slate-900 border-l-4 border-slate-700">
                    อัตรากำลังและบริการสำคัญ
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-700 pl-1">
                    <div>• แพทย์เฉพาะทาง: <strong>11 ท่าน</strong> (FTE 15)</div>
                    <div>• พยาบาลวิชาชีพ: <strong>38 ท่าน</strong></div>
                    <div>• สิทธิหลัก: บัตรทอง 44%, ข้าราชการ/ทหาร 38%</div>
                    <div>• บริการสำคัญ: สโตรก, หัวใจ, แล็บ, เอกซเรย์, ไตเทียม</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODE 2: FULL REPORT (ALL 7 SECTIONS) ================= */}
        {printMode === 'full' && (
          <div className="space-y-10 text-xs leading-relaxed">

            {/* ================= 1. FRONT PAGE / WHAT & WHY ================= */}
            <div className="space-y-3 break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">1</span>
                  <span>หมวดที่ 1: บทนำและกรอบแนวคิด Hospital Profile (Front Page - WHAT & WHY)</span>
                </div>
                <span className="text-[10px] text-slate-300 font-normal">มาตรฐาน สรพ.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-indigo-200 bg-indigo-50/40 rounded-lg p-3.5 space-y-2">
                  <div className="inline-block px-2 py-0.5 rounded bg-indigo-700 text-white font-bold text-[10.5px]">
                    WHAT คืออะไร?
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {front.what || 'Hospital Profile คือสรุปข้อมูลสำคัญของโรงพยาบาล แสดงให้เห็นบริบทที่เป็นตัวกำหนดทิศทางการทำงานของโรงพยาบาล เพื่อเป็นกรอบอ้างอิงในการประเมินและพัฒนาคุณภาพ'}
                  </p>
                </div>

                <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-3.5 space-y-2">
                  <div className="inline-block px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[10.5px]">
                    WHY ทำไมต้องมี?
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {front.why || 'ความเข้าใจในโจทย์ขององค์กรหรือความต้องการขององค์กร มีความสำคัญต่อทีมงานของ รพ.เองและผู้เยี่ยมสำรวจในการพิจารณาว่าสิ่งที่องค์กรดำเนินการนั้นสอดคล้องกับบริบทขององค์กรหรือไม่'}
                  </p>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2">
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-700" />
                  <span>องค์ประกอบสำคัญ 7 ประการของ Hospital Profile:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px] text-slate-700">
                  {(front.components && front.components.length > 0 ? front.components : [
                    '1. บทนำและกรอบแนวคิด (Front Page)',
                    '2. ข้อมูลทั่วไปและทิศทางองค์กร (General Information)',
                    '3. ข้อมูลสถิติผู้รับบริการ (Patient Profile)',
                    '4. อัตรากำลังและบุคลากร (Staff / Workforce Profile)',
                    '5. ภาระงานและปริมาณงานบริการ (Workload & Utilization)',
                    '6. ลักษณะสำคัญขององค์กรและกลยุทธ์ (Entry & Strategy)',
                    '7. สรุปภาพรวมสำหรับผู้บริหาร (Executive One-Page Matrix)'
                  ]).map((comp: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">{comp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ================= 2. GENERAL INFO & STRATEGIC DIRECTION ================= */}
            <div className="space-y-3 break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">2</span>
                  <span>หมวดที่ 2: ข้อมูลทั่วไปและทิศทางองค์กร (General Information & Direction)</span>
                </div>
                <span className="text-[10px] text-slate-300 font-normal">บริบทและยุทธศาสตร์</span>
              </div>

              <table className="w-full text-xs border border-slate-300 border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 font-bold w-1/4 bg-slate-50">ชื่อสถานพยาบาล</td>
                    <td className="p-2 font-bold text-slate-900">{profile.hospital_name_th} ({profile.hospital_name_en})</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 font-bold bg-slate-50">สถานที่ตั้ง & สังกัด</td>
                    <td className="p-2">{profile.address} • {profile.affiliation}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 font-bold bg-slate-50">ประเภท & ระดับ</td>
                    <td className="p-2">{profile.hospital_type} • ระดับ{profile.hospital_level}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 font-bold bg-slate-50">ขนาดเตียง & การครองเตียง</td>
                    <td className="p-2">
                      ขออนุญาต <strong>{profile.registered_beds} เตียง</strong> (เปิดให้บริการจริง <strong>{profile.actual_beds} เตียง</strong>) • อัตราครองเตียง <strong>{profile.occupancy_rate}%</strong>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-200 font-bold bg-slate-50">พื้นที่บริการ & เครือข่าย</td>
                    <td className="p-2">
                      {profile.service_area || 'กำลังพล ครอบครัว และประชาชนในอำเภอเมืองสระบุรีและพื้นที่ใกล้เคียง'} • รพ.เครือข่าย: {profile.network_hospitals || 'รพ.สระบุรี และ รพ.พระมงกุฎเกล้า'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Strategic Focus Box */}
              {profile.strategic_focus && (
                <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold text-[11px]">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span>เข็มมุ่งและจุดเน้นในการพัฒนา (Strategic Focus พ.ศ. 2566–2570)</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium pl-5 whitespace-pre-wrap">
                    {profile.strategic_focus}
                  </p>
                </div>
              )}

              {/* Vision & Mission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-[11px]">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    <span>วิสัยทัศน์ (Vision)</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed pl-5 font-medium">{profile.vision}</p>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-[11px]">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>พันธกิจ (Mission)</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed pl-5 font-medium">{profile.mission}</p>
                </div>
              </div>

              {/* Core Values & Core Competencies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-900 text-[11px]">
                    ค่านิยมและวัฒนธรรมองค์กร (Core Values)
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {profile.core_values || '-'}
                  </p>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-900 text-[11px]">
                    สมรรถนะหลักขององค์กร (Core Competencies)
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {profile.core_competencies || '-'}
                  </p>
                </div>
              </div>

              {/* Strategic Objectives */}
              {profile.strategic_objectives && (
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-1">
                  <div className="font-bold text-slate-900 text-[11px]">
                    วัตถุประสงค์เชิงกลยุทธ์ (Strategic Objectives)
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {profile.strategic_objectives}
                  </p>
                </div>
              )}
            </div>

            {/* ================= 3. PATIENT PROFILE (OPD, IPD, HIGH RISK, RIGHTS) ================= */}
            <div className="space-y-4 break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">3</span>
                  <span>หมวดที่ 3: ข้อมูลสถิติผู้รับบริการ (Patient Profile)</span>
                </div>
                <span className="text-[10px] text-slate-300 font-normal">สถิติโรคและกลุ่มผู้ป่วย</span>
              </div>

              {/* 10 อันดับโรคผู้ป่วยนอก (Top 10 OPD) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>10 อันดับโรคผู้ป่วยนอกที่พบบ่อย (Top 10 Diagnosis - OPD)</span>
                </div>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-12">อันดับ</th>
                      <th className="p-2 border-r border-slate-300 text-left">ชื่อโรค / ภาวะ (Diagnosis)</th>
                      <th className="p-2 border-r border-slate-300 text-center w-24">ปี 2567</th>
                      <th className="p-2 border-r border-slate-300 text-center w-24">ปี 2568</th>
                      <th className="p-2 text-center w-24 bg-amber-100 font-bold text-amber-950">ปี 2569 (พ.ค.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(pt.top_opd || []).map((row: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                        <td className="p-2 border-r border-slate-200 text-center text-slate-500">{row.rank || idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-medium text-slate-900">{row.disease}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{Number(row.y2567 || 0).toLocaleString()}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{Number(row.y2568 || 0).toLocaleString()}</td>
                        <td className="p-2 text-center font-mono font-bold bg-amber-50/60 text-amber-950">{Number(row.y2569 || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 10 อันดับโรคผู้ป่วยใน (Top 10 IPD) */}
              {pt.top_ipd && pt.top_ipd.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>อันดับโรคผู้ป่วยในและโรคสำคัญ (Top Diagnosis - IPD & Key Diseases)</span>
                  </div>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-300">
                        <th className="p-2 border-r border-slate-300 text-center w-12">ลำดับ</th>
                        <th className="p-2 border-r border-slate-300 text-left">ชื่อโรค / ภาวะผู้ป่วยใน</th>
                        <th className="p-2 border-r border-slate-300 text-center w-24">ปี 2567</th>
                        <th className="p-2 border-r border-slate-300 text-center w-24">ปี 2568</th>
                        <th className="p-2 text-center w-24 bg-amber-100 font-bold text-amber-950">ปี 2569 (พ.ค.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pt.top_ipd.slice(0, 10).map((row: any, idx: number) => (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                          <td className="p-2 border-r border-slate-200 text-center text-slate-500">{row.rank || idx + 1}</td>
                          <td className="p-2 border-r border-slate-200 font-medium text-slate-900">{row.disease}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono">{Number(row.y2567 || 0).toLocaleString()}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono">{Number(row.y2568 || 0).toLocaleString()}</td>
                          <td className="p-2 text-center font-mono font-bold bg-amber-50/60 text-amber-950">{Number(row.y2569 || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* High-Risk Groups & Rights Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="border border-rose-200 bg-rose-50/30 rounded-lg p-3 space-y-2">
                  <div className="font-bold text-rose-950 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                    <span>กลุ่มผู้ป่วยความเสี่ยงสูง / กลุ่มเฉพาะ (High Risk Groups)</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 pl-1">
                    {(pt.high_risk_groups || []).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-indigo-200 bg-indigo-50/30 rounded-lg p-3 space-y-2">
                  <div className="font-bold text-indigo-950 text-[11px] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>สัดส่วนสิทธิการรักษาพยาบาล (Payment / Rights)</span>
                  </div>
                  <div className="space-y-1.5">
                    {(pt.rights || []).map((r: any, idx: number) => (
                      <div key={idx} className="bg-white border border-indigo-100 rounded p-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-800 font-medium">{r.name}</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{r.ratio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ================= 4. STAFF PROFILE ================= */}
            <div className="space-y-3 break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">4</span>
                  <span>หมวดที่ 4: อัตรากำลังและบุคลากรทางการแพทย์ (Staff / Workforce Profile)</span>
                </div>
                <span className="text-[10px] text-slate-300 font-normal">กำลังพลและบุคลากร</span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <span className="block text-[10px] text-slate-500">แพทย์ทั้งหมด</span>
                  <strong className="text-sm font-black text-indigo-900">{staff.summary?.total_doctors || '15'} ท่าน</strong>
                  <span className="block text-[9px] text-slate-400">เฉพาะทาง 11</span>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <span className="block text-[10px] text-slate-500">พยาบาลวิชาชีพ</span>
                  <strong className="text-sm font-black text-emerald-900">{staff.summary?.total_nurses || '38'} ท่าน</strong>
                  <span className="block text-[9px] text-slate-400">RN เต็มเวลา</span>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <span className="block text-[10px] text-slate-500">เภสัชกร</span>
                  <strong className="text-sm font-black text-slate-900">{staff.summary?.total_pharmacists || '4'} ท่าน</strong>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <span className="block text-[10px] text-slate-500">เทคนิคการแพทย์</span>
                  <strong className="text-sm font-black text-slate-900">{staff.summary?.total_lab_techs || '4'} ท่าน</strong>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <span className="block text-[10px] text-slate-500">วิชาชีพอื่น</span>
                  <strong className="text-sm font-black text-slate-900">{staff.summary?.total_other_prof || '22'} ท่าน</strong>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <span className="block text-[10px] text-slate-500">สายสนับสนุน</span>
                  <strong className="text-sm font-black text-slate-900">{staff.summary?.total_support || '45'} ท่าน</strong>
                </div>
              </div>

              {/* Staff Table */}
              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 text-left">ตำแหน่ง / สาขาวิชาชีพ</th>
                    <th className="p-2 border-r border-slate-300 text-center w-28">Full Time</th>
                    <th className="p-2 border-r border-slate-300 text-center w-32">Part Time FTE</th>
                    <th className="p-2 text-center w-28 bg-amber-100 font-bold text-amber-950">รวมทั้งหมด (คน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(staff.staff_table || []).map((row: any, idx: number) => (
                    <tr key={idx} className={row.is_sub ? "bg-slate-50/40 text-slate-700" : "font-bold bg-white"}>
                      <td className={cn("p-2 border-r border-slate-200", row.is_sub && "pl-6 font-normal")}>{row.role}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{row.full_time}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{row.part_time_fte}</td>
                      <td className="p-2 text-center font-mono font-bold bg-slate-50">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ================= 5. WORKLOAD & UTILIZATION ================= */}
            <div className="space-y-4 break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">5</span>
                  <span>หมวดที่ 5: ภาระงานและปริมาณงานบริการ (Workload & Utilization)</span>
                </div>
                <span className="text-[10px] text-slate-300 font-normal">สถิติบริการย้อนหลัง</span>
              </div>

              {/* Outpatient Workload Table */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 text-xs">
                  ภาระงานผู้ป่วยนอกและอัตราการตรวจของแพทย์ต่อชั่วโมง เปรียบเทียบปี 2567 - 2568
                </div>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-left">หน่วยงาน / สาขาวิชา</th>
                      <th className="p-2 border-r border-slate-300 text-center w-28">Visit (ปี 67)</th>
                      <th className="p-2 border-r border-slate-300 text-center w-28">ตรวจ/ชม. (ปี 67)</th>
                      <th className="p-2 border-r border-slate-300 text-center w-28">Visit (ปี 68)</th>
                      <th className="p-2 text-center w-28 bg-amber-100 font-bold text-amber-950">ตรวจ/ชม. (ปี 68)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {workloadRows.map((row: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{row.department}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{Number(row.visits_y2567 || 0).toLocaleString()}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-indigo-700 font-medium">{row.rate_y2567 || '-'}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">{Number(row.visits_y2568 || 0).toLocaleString()}</td>
                        <td className="p-2 text-center font-mono font-black bg-amber-50/60 text-amber-950">{row.rate_y2568 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* IPD & ER Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/60 space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-indigo-700" />
                    <span>สถิติบริการผู้ป่วยใน (Inpatient Statistics)</span>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">จำนวนรับไว้รักษา (Admissions) ปี 2567</td>
                        <td className="py-1 text-right font-mono font-bold text-slate-900">{workload.inpatient_stats?.admissions_y2567 || '1,420'} ราย</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">จำนวนรับไว้รักษา (Admissions) ปี 2568</td>
                        <td className="py-1 text-right font-mono font-bold text-slate-900">{workload.inpatient_stats?.admissions_y2568 || '1,560'} ราย</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">วันนอนเฉลี่ย (ALOS)</td>
                        <td className="py-1 text-right font-mono font-bold text-indigo-700">{workload.inpatient_stats?.alos_days || '3.8'} วัน</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-600 font-medium">อัตราการครองเตียงเฉลี่ย</td>
                        <td className="py-1 text-right font-mono font-bold text-emerald-700">{workload.inpatient_stats?.occupancy_rate_percent || `${profile.occupancy_rate}%`}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/60 space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    <span>สถิติบริการอุบัติเหตุและส่งต่อ (ER & Refer)</span>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">ผู้รับบริการแผนกอุบัติเหตุ-ฉุกเฉิน (ปี 2568)</td>
                        <td className="py-1 text-right font-mono font-bold text-slate-900">{workload.er_stats?.total_visits_y2568 || '14,850'} ครั้ง</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">สัดส่วนผู้ป่วยระดับวิกฤต/ฉุกเฉินเร่งด่วน</td>
                        <td className="py-1 text-right font-mono font-bold text-rose-700">{workload.er_stats?.emergency_ratio || '28.4%'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-600 font-medium">ผู้ป่วยส่งต่อรักษาต่อยัง รพ.แม่ข่าย (Refer Out)</td>
                        <td className="py-1 text-right font-mono font-bold text-amber-800">{workload.er_stats?.refer_cases || '312'} ราย</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ================= 6. ENTRY & STRATEGY ================= */}
            <div className="space-y-4 break-inside-avoid">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">6</span>
                  <span>หมวดที่ 6: ลักษณะสำคัญขององค์กรและกลยุทธ์ (Entry & Strategy)</span>
                </div>
                <span className="text-[10px] text-slate-300 font-normal">บริบทและยุทธศาสตร์ขับเคลื่อน</span>
              </div>

              {/* Core Services */}
              <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900 text-xs">
                  บริการหลักขององค์กร (Core Services - ด้านการทหารและพลเรือน)
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {entry.core_services || profile.scope_of_service || 'ให้บริการดูแลสุขภาพกำลังพล ครอบครัว และประชาชนทั่วไป ครอบคลุมการส่งเสริมสุขภาพ การป้องกันโรค การรักษาพยาบาล และการฟื้นฟูสภาพ รวมถึงภารกิจสนับสนุนทางการแพทย์ในภารกิจทางทหาร'}
                </p>
              </div>

              {/* Advantages & Challenges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-emerald-300 bg-emerald-50/40 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>ความได้เปรียบเชิงกลยุทธ์ (Strategic Advantages - 11 ข้อ)</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap pl-5">
                    {profile.strategic_advantages}
                  </p>
                </div>

                <div className="border border-amber-300 bg-amber-50/40 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>ความท้าทายเชิงกลยุทธ์ (Strategic Challenges - 8 ข้อ)</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap pl-5">
                    {profile.strategic_challenges}
                  </p>
                </div>
              </div>

              {/* Org Characteristics */}
              {entry.org_characteristics && (
                <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-1">
                  <div className="font-bold text-slate-900 text-xs">
                    ลักษณะและบริบทสำคัญขององค์กร (Organizational Characteristics)
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                    {entry.org_characteristics}
                  </p>
                </div>
              )}
            </div>

            {/* ================= 7. ONE-PAGE EXECUTIVE SUMMARY MATRIX ================= */}
            <div className="space-y-4 break-inside-avoid pt-2">
              <div className="bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold text-xs uppercase flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black text-[11px]">7</span>
                  <span>หมวดที่ 7: สรุปสาระสำคัญภาพรวมองค์กร (Executive Summary Dashboard Matrix)</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">สรุปสำหรับผู้บริหารและผู้ตรวจประเมิน</span>
              </div>

              <div className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50/70 space-y-4">
                <div className="grid grid-cols-4 gap-2.5 text-center">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="block text-[10px] text-slate-500">ระดับสถานพยาบาล</span>
                    <strong className="text-xs text-slate-900">{profile.hospital_type} ({profile.hospital_level})</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="block text-[10px] text-slate-500">เตียงขออนุญาต / เปิดจริง</span>
                    <strong className="text-xs text-indigo-700">{profile.registered_beds} / {profile.actual_beds} เตียง</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="block text-[10px] text-slate-500">อัตราการครองเตียง</span>
                    <strong className="text-xs text-emerald-700">{profile.occupancy_rate}%</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="block text-[10px] text-slate-500">ผู้ป่วยนอกรวม</span>
                    <strong className="text-xs text-slate-900">42,000+ ครั้ง/ปี</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block text-[11px]">ทิศทางและเข็มมุ่ง</span>
                    <p className="text-slate-700 text-[11px] leading-relaxed line-clamp-4">{profile.strategic_focus}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block text-[11px]">จุดแข็งและความได้เปรียบ</span>
                    <p className="text-slate-700 text-[11px] leading-relaxed line-clamp-4">{profile.strategic_advantages}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block text-[11px]">ความท้าทายและโอกาสพัฒนา</span>
                    <p className="text-slate-700 text-[11px] leading-relaxed line-clamp-4">{profile.strategic_challenges}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= DOCUMENT SIGN-OFF / APPROVAL BLOCK ================= */}
            <div className="pt-6 border-t border-slate-300 break-inside-avoid">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-12">
                  <span className="text-slate-500 font-medium">ผู้จัดทำและรวบรวมข้อมูล Hospital Profile</span>
                  <div className="space-y-1">
                    <div className="w-48 mx-auto border-b border-slate-400 border-dashed" />
                    <p className="font-bold text-slate-800">(.......................................................................)</p>
                    <p className="text-[10px] text-slate-500">หัวหน้าทีมพัฒนาคุณภาพและมาตรฐาน รพ. (HA Coordinator)</p>
                  </div>
                </div>

                <div className="space-y-12">
                  <span className="text-slate-500 font-medium">ผู้อนุมัติข้อมูลและรับรองความถูกต้อง</span>
                  <div className="space-y-1">
                    <div className="w-48 mx-auto border-b border-slate-400 border-dashed" />
                    <p className="font-bold text-slate-800">(.......................................................................)</p>
                    <p className="text-[10px] text-slate-500">ผู้อำนวยการ{profile.hospital_name_th}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-slate-400">
                เอกสารนี้เป็นข้อมูลบริบทสถานพยาบาลสำหรับการพัฒนาคุณภาพและการประเมินตนเองตามมาตรฐาน HA สถาบันรับรองคุณภาพสถานพยาบาล (องค์การมหาชน)
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
