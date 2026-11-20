import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { 
  Bed, 
  FileText, 
  Plus, 
  History, 
  Users, 
  Printer, 
  Calendar, 
  ArrowRight, 
  Activity,
  Hospital,
  Sparkles,
  ClipboardList
} from 'lucide-react';

interface AdmissionItem {
  an: string;
  hn: string;
  vn: string;
  patient_name: string;
  gender: string;
  age: string;
  ward: string;
  pttype: string;
  admit_date: string;
  admit_time: string;
  status: string;
}

interface NoteItem {
  id: number;
  an: string | null;
  hn: string;
  patient_name: string;
  age: string | null;
  gender: string | null;
  ward: string | null;
  admit_date: string | null;
  doctor_name: string | null;
  created_at: string;
  creator?: { id: number; name: string };
}

interface DashboardProps {
  stats: {
    total_notes: number;
    active_ipd_census: number;
  };
  recentNotes: NoteItem[];
  currentAdmissions: AdmissionItem[];
}

export default function Index({ stats, recentNotes, currentAdmissions }: DashboardProps) {
  return (
    <AppLayout
      title="Doctor - ระบบผู้ป่วยใน & แบบบันทึกทางการแพทย์"
      breadcrumbs={[
        { title: 'Doctor', href: '/ipd' },
        { title: 'ภาพรวมระบบ', href: '/ipd' },
      ]}
    >
      <Head title="Doctor - ระบบผู้ป่วยใน FSHH / SMH" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Banner Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 text-white shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-blue-200 text-xs font-medium">
                <Bed className="w-3.5 h-3.5" />
                <span>Doctor Portal & In-Patient Department</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Doctor - ระบบงานผู้ป่วยใน & จัดทำแบบบันทึกทางการแพทย์
              </h1>
              <p className="text-blue-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
                สร้างและพิมพ์แบบฟอร์มผู้ป่วยในมาตรฐาน เชื่อมต่อข้อมูล HOSxP อัตโนมัติ พร้อมระบบมาร์กตำแหน่งรอยโรคบนรูปอวัยวะร่างกาย (Lesion Marking Canvas)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button asChild className="bg-white text-blue-800 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md">
                <Link href="/ipd/admission-notes/create">
                  <Plus className="w-4 h-4 mr-1.5 text-blue-700" />
                  สร้าง Admission Note ใหม่
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 text-xs font-medium rounded-xl">
                <Link href="/ipd/admission-notes">
                  <History className="w-4 h-4 mr-1.5" />
                  ประวัติแบบบันทึก
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">แบบบันทึกที่จัดทำแล้ว</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_notes}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">ในฐานข้อมูลระบบ</div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ผู้ป่วยกำลัง Admit อยู่ (Census)</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.active_ipd_census}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">ดึงสดจาก HOSxP</div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <div className="text-xs font-medium text-slate-500">สถานะการเชื่อมต่อฐานข้อมูล HOSxP</div>
              <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>เชื่อมต่อสำเร็จ (Read-Only)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Host: 192.168.1.202 (hos)</div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Hospital className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Current In-Patient Census Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  รายชื่อผู้ป่วยที่กำลัง Admit อยู่ในโรงพยาบาล (Current IPD Census)
                </h2>
                <p className="text-[11px] text-slate-500">
                  คลิกที่เคสเพื่อดึงข้อมูลซักประวัติ สัญญาณชีพ และตรวจร่างกายเข้าแบบบันทึก Admission Note ทันที
                </p>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/ipd/admission-notes/create">
                <Plus className="w-3.5 h-3.5 mr-1" />
                กรอกฟอร์มอิสระ
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">ชื่อ-สกุล ผู้ป่วย</th>
                  <th className="px-4 py-2.5">HN / AN</th>
                  <th className="px-4 py-2.5">หอผู้ป่วย</th>
                  <th className="px-4 py-2.5">สิทธิการรักษา</th>
                  <th className="px-4 py-2.5">วันที่ Admit</th>
                  <th className="px-4 py-2.5 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentAdmissions.length > 0 ? (
                  currentAdmissions.map((pt) => (
                    <tr key={pt.an} className="hover:bg-blue-50/40 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900">{pt.patient_name}</div>
                        <div className="text-[11px] text-slate-500">{pt.gender} / {pt.age} ปี</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800">HN: {pt.hn}</div>
                        <div className="text-[11px] text-slate-500">AN: {pt.an}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {pt.ward}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{pt.pttype}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {pt.admit_date} {pt.admit_time}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Button
                          asChild
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-7 rounded-lg"
                        >
                          <Link href={`/ipd/admission-notes/create?an=${pt.an}`}>
                            <span>จัดทำ Note</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลผู้ป่วย Admit ปัจจุบันใน HOSxP
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Generated Admission Notes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  แบบบันทึก Admission Notes ล่าสุดในระบบ
                </h2>
                <p className="text-[11px] text-slate-500">
                  รายการแบบบันทึกที่บันทึกไว้ล่าสุด
                </p>
              </div>
            </div>

            <Button asChild variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
              <Link href="/ipd/admission-notes">
                ดูทั้งหมด ({stats.total_notes})
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">ผู้ป่วย</th>
                  <th className="px-4 py-2.5">HN / AN</th>
                  <th className="px-4 py-2.5">วันที่ Admit</th>
                  <th className="px-4 py-2.5">แพทย์ผู้ตรวจ</th>
                  <th className="px-4 py-2.5">ผู้บันทึก</th>
                  <th className="px-4 py-2.5 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900">{note.patient_name}</div>
                        <div className="text-[11px] text-slate-500">{note.gender || '-'} / {note.age ? `${note.age} ปี` : '-'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800">HN: {note.hn}</div>
                        <div className="text-[11px] text-slate-500">AN: {note.an || '-'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{note.admit_date || '-'}</td>
                      <td className="px-4 py-2.5 text-slate-800">{note.doctor_name || '-'}</td>
                      <td className="px-4 py-2.5 text-slate-500">{note.creator?.name || 'ระบบ'}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-slate-700"
                          >
                            <Link href={`/ipd/admission-notes/${note.id}/print`}>
                              <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              พิมพ์
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Link href={`/ipd/admission-notes/${note.id}/edit`}>
                              แก้ไข
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                      ยังไม่มีรายการบันทึก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
