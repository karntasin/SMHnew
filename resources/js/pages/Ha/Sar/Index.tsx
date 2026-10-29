import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Calendar, 
  Building2, 
  History, 
  Printer, 
  Search, 
  Layers, 
  Sparkles,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionItem {
  id: number;
  sar_part_id: number;
  code: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  current_version: number;
  updated_at: string;
}

interface PartItem {
  id: number;
  part_number: string;
  part_name: string;
  description: string;
  sections: SectionItem[];
}

interface CycleItem {
  id: number;
  year: string;
  title: string;
  is_current: boolean;
}

interface RevisionItem {
  id: number;
  sar_section_id: number;
  version_number: number;
  change_summary: string;
  created_at: string;
  section: {
    id: number;
    code: string;
    title: string;
  };
  creator?: {
    id: number;
    name: string;
  };
}

interface Props {
  currentCycle: {
    id: number;
    year: string;
    title: string;
    hospital_name: string;
    bed_count: string;
  };
  availableCycles: CycleItem[];
  parts: PartItem[];
  stats: {
    total_sections: number;
    completed: number;
    in_progress: number;
    draft: number;
    latest_revisions: RevisionItem[];
  };
}

export default function SarIndex({ currentCycle, availableCycles, parts, stats }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return { label: 'สมบูรณ์', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'in_progress':
        return { label: 'กำลังดำเนินการ', class: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'ร่าง', class: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  const filteredParts = parts.map(part => ({
    ...part,
    sections: part.sections.filter(s => 
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }));

  return (
    <AppLayout 
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'รายงานประเมินตนเอง (SAR)', href: '/ha/sar' }
      ]}
    >
      <Head title="รายงานประเมินตนเอง (SAR) - งานพัฒนาคุณภาพ HA" />

      <div className="min-h-screen bg-slate-50/50 pb-16">
        {/* Header Section */}
        <div className="bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Hospital Accreditation Self-Assessment Report</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  ระบบจัดเก็บข้อมูล SAR แยกตาม Part (I - IV)
                </h1>
                <p className="text-slate-600 text-sm mt-1">
                  {currentCycle.hospital_name} — รอบปี พ.ศ. {currentCycle.year}
                </p>
              </div>

              {/* Cycle Selector & Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>รอบปี:</span>
                  <select 
                    value={currentCycle.year}
                    onChange={(e) => router.get('/ha/sar', { year: e.target.value })}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    {availableCycles.map(c => (
                      <option key={c.id} value={c.year}>พ.ศ. {c.year} {c.is_current ? '(ปัจจุบัน)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
                <div className="text-xs font-medium text-slate-500 mb-1">หมวดมาตรฐานทั้งหมด</div>
                <div className="text-2xl font-black text-slate-900">{stats.total_sections}</div>
                <div className="text-xs text-slate-400 mt-1">ครอบคลุม 4 Part</div>
              </div>
              <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-700 mb-1">สถานะสมบูรณ์</div>
                <div className="text-2xl font-black text-emerald-700">{stats.completed}</div>
                <div className="text-xs text-emerald-600 mt-1">
                  {stats.total_sections > 0 ? Math.round((stats.completed / stats.total_sections) * 100) : 0}% ของทั้งหมด
                </div>
              </div>
              <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100">
                <div className="text-xs font-medium text-amber-700 mb-1">กำลังดำเนินการ</div>
                <div className="text-2xl font-black text-amber-700">{stats.in_progress}</div>
                <div className="text-xs text-amber-600 mt-1">อยู่ระหว่างการปรับปรุง</div>
              </div>
              <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100">
                <div className="text-xs font-medium text-indigo-700 mb-1">ประวัติการบันทึก (Revisions)</div>
                <div className="text-2xl font-black text-indigo-700">กู้คืนได้ทุกจุด</div>
                <div className="text-xs text-indigo-600 mt-1">Version Control 100%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารหัสหมวด หรือชื่อมาตรฐาน (เช่น I-1, ยา, IC)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
            <div className="text-xs text-slate-500">
              คลิกที่หมวดมาตรฐานเพื่อแก้ไขข้อมูล หรือคลิก <span className="font-semibold text-indigo-600">"ดูทั้งตอน"</span> เพื่อเปิดดูภาพรวม
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 columns: Parts and Sections */}
            <div className="lg:col-span-2 space-y-6">
              {filteredParts.map((part) => (
                <div 
                  key={part.id} 
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
                >
                  {/* Part Header */}
                  <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                        {part.part_number}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                          ตอนที่ {part.part_number}
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          {part.part_name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/ha/sar/part/${part.part_number}/print`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        title="พิมพ์รายงานทั้งตอน"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">พิมพ์</span>
                      </Link>
                      <Link
                        href={`/ha/sar/part/${part.part_number}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
                      >
                        <span>เปิดตอนที่ {part.part_number}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Section List inside Part */}
                  <div className="divide-y divide-slate-100">
                    {part.sections.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        ไม่พบหมวดมาตรฐานที่ตรงกับคำค้นหา
                      </div>
                    ) : (
                      part.sections.map((sec) => {
                        const statusBadge = getStatusBadge(sec.status);
                        return (
                          <Link
                            key={sec.id}
                            href={`/ha/sar/section/${sec.id}`}
                            className="group p-4 flex items-center justify-between hover:bg-indigo-50/40 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-4">
                              <span className="px-2.5 py-1 rounded-md bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-800 text-xs font-bold font-mono shrink-0 transition-colors">
                                {sec.code}
                              </span>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                  {sec.title}
                                </h4>
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>เวอร์ชัน #{sec.current_version}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusBadge.class)}>
                                {statusBadge.label}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right column: Recent Revisions & Guidance */}
            <div className="space-y-6">
              {/* Recent Activity Log */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>ประวัติการแก้ไขล่าสุด (Revisions)</span>
                  </div>
                  <span className="text-xs text-slate-400">กู้คืนได้</span>
                </div>

                <div className="space-y-3">
                  {stats.latest_revisions.map((rev) => (
                    <Link
                      key={rev.id}
                      href={`/ha/sar/section/${rev.sar_section_id}`}
                      className="block p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-indigo-600 font-mono">
                          {rev.section?.code}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          v{rev.version_number}
                        </span>
                      </div>
                      <div className="font-medium text-slate-800 line-clamp-1 mb-1">
                        {rev.section?.title}
                      </div>
                      <p className="text-slate-500 text-[11px] line-clamp-1 mb-1.5">
                        {rev.change_summary || 'แก้ไขข้อมูล'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-200/60">
                        <span>โดย {rev.creator?.name ?? 'ระบบ'}</span>
                        <span>{new Date(rev.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* HA Guidance Note */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm mb-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>โครงสร้าง SAR ตามเกณฑ์ สรพ.</span>
                </div>
                <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                  การประเมินตนเองแยกตาม 4 มิติหลักของมาตรฐานโรงพยาบาลและบริการสุขภาพ:
                </p>
                <ul className="text-xs text-indigo-50 space-y-1.5">
                  <li className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Part I:</span> ภาพรวมองค์กรและการนำ
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Part II:</span> ระบบงานสำคัญ (RM, IC, ยา ฯลฯ)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Part III:</span> กระบวนการดูแลผู้ป่วย
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Part IV:</span> ผลลัพธ์และตัวชี้วัด 6 มิติ
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
