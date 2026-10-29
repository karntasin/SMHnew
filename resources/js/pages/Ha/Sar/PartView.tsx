import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  FileText, 
  ChevronRight, 
  Printer, 
  ArrowLeft, 
  Clock, 
  User, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionItem {
  id: number;
  sar_part_id: number;
  code: string;
  title: string;
  requirement?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  current_version: number;
  lead_person_name?: string;
  lead_team?: {
    id: number;
    name_th: string;
    abbreviation: string;
  };
  last_modified_user?: {
    id: number;
    name: string;
  };
  updated_at: string;
}

interface PartProps {
  id: number;
  part_number: string;
  part_name: string;
  description?: string;
  cycle: {
    year: string;
    hospital_name: string;
  };
  sections: SectionItem[];
}

interface Props {
  part: PartProps;
  allParts: {
    id: number;
    part_number: string;
    part_name: string;
  }[];
}

export default function PartView({ part, allParts }: Props) {
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

  return (
    <AppLayout 
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'SAR', href: '/ha/sar' },
        { title: `ตอนที่ ${part.part_number}`, href: `/ha/sar/part/${part.part_number}` }
      ]}
    >
      <Head title={`ตอนที่ ${part.part_number} ${part.part_name} - SAR`} />

      <div className="min-h-screen bg-slate-50/50 pb-16">
        {/* Header Banner */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link 
                    href="/ha/sar"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>กลับไปหน้าภาพรวม SAR</span>
                  </Link>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-indigo-600">รอบปี พ.ศ. {part.cycle.year}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  ตอนที่ {part.part_number}: {part.part_name}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  จำนวนทั้งหมด {part.sections.length} หมวดมาตรฐาน — {part.cycle.hospital_name}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Link
                  href={`/ha/sar/part/${part.part_number}/print`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>พิมพ์รายงานทั้งตอน</span>
                </Link>
              </div>
            </div>

            {/* Part Navigation Pills */}
            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-100 overflow-x-auto pb-2">
              <span className="text-xs font-semibold text-slate-400 mr-2 shrink-0">เลือกตอน:</span>
              {allParts.map((p) => {
                const isActive = p.part_number === part.part_number;
                return (
                  <Link
                    key={p.id}
                    href={`/ha/sar/part/${p.part_number}`}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2",
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <span>ตอนที่ {p.part_number}</span>
                    <span className="opacity-80 font-normal">({p.part_name})</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="max-w-7xl mx-auto px-6 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {part.sections.map((sec) => {
              const statusBadge = getStatusBadge(sec.status);
              return (
                <div
                  key={sec.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-100">
                        {sec.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusBadge.class)}>
                          {statusBadge.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          v{sec.current_version}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      {sec.title}
                    </h3>

                    {/* Requirement preview */}
                    {sec.requirement && (
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-4">
                        {sec.requirement}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mb-4 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>ทีมรับผิดชอบ: <strong>{sec.lead_team?.name_th ?? 'ทีมนำ รพ.'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>ปรับปรุง: {new Date(sec.updated_at).toLocaleDateString('th-TH')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/ha/sar/section/${sec.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        <span>เปิดแบบฟอร์ม / แก้ไข</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/ha/sar/section/${sec.id}/print`}
                        target="_blank"
                        className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
                        title="พิมพ์หมวดนี้"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
