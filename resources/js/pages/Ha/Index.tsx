import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Award, 
  FileText, 
  Activity, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Building2,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartSummary {
  id: number;
  part_number: string;
  part_name: string;
  total_sections: number;
  completed_sections: number;
  progress_percent: number;
}

interface Props {
  sarStats: {
    total_sections: number;
    completed_sections: number;
    in_progress_sections: number;
    draft_sections: number;
    parts_count: number;
    cycle_year: string;
  };
  partsSummary: PartSummary[];
  haTeamsCount: number;
  clinicalTracersCount?: number;
  currentCycle?: {
    year: string;
    title: string;
    hospital_name: string;
    bed_count: string;
  };
}

export default function HaIndex({ sarStats, partsSummary, haTeamsCount, clinicalTracersCount = 13, currentCycle }: Props) {
  const overallProgress = sarStats.total_sections > 0 
    ? Math.round((sarStats.completed_sections / sarStats.total_sections) * 100) 
    : 0;

  const haModules = [
    {
      title: 'รายงานการประเมินตนเอง (SAR)',
      code: 'SAR System',
      description: 'ระบบจัดเก็บและบริหารข้อมูลรายงานการประเมินตนเองแยกตาม Part I-IV พร้อมประวัติการแก้ไขและกู้คืนได้',
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      badge: 'พร้อมใช้งาน',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      href: '/ha/sar',
      actionText: 'เข้าสู่ระบบ SAR',
      statsText: `${sarStats.completed_sections}/${sarStats.total_sections} หมวดมาตรฐาน`,
      progress: overallProgress,
    },
    {
      title: 'การติดตามทางคลินิก (Clinical Tracer)',
      code: 'Clinical Tracer',
      description: 'บันทึกและวิเคราะห์กระบวนการดูแลรักษาผู้ป่วยใน 13 กลุ่มโรคสำคัญตามแนวทาง CPG และ Fast Track',
      icon: Activity,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      badge: 'พร้อมใช้งาน',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      href: '/ha/clinical-tracer',
      actionText: 'เข้าสู่ระบบ Clinical Tracer',
      statsText: `${clinicalTracersCount} กลุ่มโรคสำคัญ`,
      progress: 100,
    },
    {
      title: 'ข้อมูลการจัดบริการ (Service Profile)',
      code: 'Service Profile',
      description: 'ระบบจัดเก็บข้อมูลบริบท วัตถุประสงค์ ขอบเขต กระบวนการสำคัญ และตัวชี้วัดการจัดบริการของแต่ละแผนก/หน่วยงานใน รพ.',
      icon: Layers,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      badge: 'พร้อมใช้งาน',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      href: '/ha/service-profile',
      actionText: 'เข้าสู่ระบบ Service Profile',
      statsText: '21 หน่วยงานและทีมคุณภาพ',
      progress: 100,
    },
    {
      title: 'บริบทโรงพยาบาล (Hospital Profile)',
      code: 'Hospital Profile',
      description: 'ระบบจัดเก็บข้อมูลภาพรวมและบริบทโรงพยาบาล 7 ส่วนสำคัญ: ข้อมูลทั่วไป, สถิติโรค Top 10, อัตรากำลังแพทย์/บุคลากร, ภาระงาน, กลยุทธ์ และ One-Page Summary',
      icon: Building2,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-100',
      badge: 'พร้อมใช้งาน',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      href: '/ha/hospital-profile',
      actionText: 'เข้าสู่ระบบ Hospital Profile',
      statsText: '7 ส่วนบริบทสำคัญ (Excel Sync)',
      progress: 100,
    },
  ];

  return (
    <AppLayout 
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' }
      ]}
    >
      <Head title="งานพัฒนาคุณภาพโรงพยาบาล (HA)" />

      <div className="min-h-screen bg-slate-50/50 pb-16">
        {/* Hero Section */}
        <div className="relative bg-white border-b border-slate-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-blue-50/50 opacity-70" />
          <div className="relative max-w-7xl mx-auto px-6 py-10 sm:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-700 text-sm font-medium mb-4 shadow-sm">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Hospital Accreditation (HA) Hub</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
                  งานพัฒนาคุณภาพโรงพยาบาล (HA)
                </h1>
                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  ศูนย์รวมรายงานและเอกสารมาตรฐานการรับรองกระบวนการคุณภาพโรงพยาบาล ({currentCycle?.hospital_name ?? 'รพ.ค่ายสุรสิงหนาท'})
                  ตามเกณฑ์มาตรฐาน สรพ.
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>รอบปีประเมิน: <strong>พ.ศ. {currentCycle?.year ?? '2569'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>ขนาด: {currentCycle?.bed_count ?? '60 เตียง'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>คณะกรรมการ Team HA: <strong>{haTeamsCount} ทีม</strong></span>
                  </div>
                </div>
              </div>

              {/* Progress Summary Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-6 shadow-xl lg:w-80 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-indigo-100">ความก้าวหน้า SAR รวม</span>
                  <ShieldCheck className="w-5 h-5 text-indigo-200" />
                </div>
                <div className="text-4xl font-extrabold mb-2">{overallProgress}%</div>
                <div className="w-full bg-white/20 rounded-full h-2.5 mb-3 overflow-hidden">
                  <div 
                    className="bg-white h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="text-xs text-indigo-100 flex justify-between">
                  <span>สมบูรณ์ {sarStats.completed_sections} หมวด</span>
                  <span>ทั้งหมด {sarStats.total_sections} หมวด</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div className="max-w-7xl mx-auto px-6 pt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">ระบบงานมาตรฐาน HA</h2>
              <p className="text-sm text-slate-500">เลือกโมดูลเพื่อจัดการข้อมูลรายงานและประเมินตนเอง</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {haModules.map((m, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", m.bg)}>
                      <m.icon className={cn("w-6 h-6", m.color)} />
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", m.badgeClass)}>
                      {m.badge}
                    </span>
                  </div>
                  
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{m.code}</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{m.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    {m.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span>สถานะความก้าวหน้า</span>
                    <span className="font-semibold text-slate-700">{m.statsText}</span>
                  </div>
                  <Link
                    href={m.href}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-sm font-semibold shadow-sm transition-colors"
                  >
                    <span>{m.actionText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* SAR 4-Part Overview Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">สรุปข้อมูล SAR แยกตาม Part (I - IV)</h2>
                <p className="text-sm text-slate-500">รายงานการประเมินตนเองรอบปี พ.ศ. {sarStats.cycle_year}</p>
              </div>
              <Link 
                href="/ha/sar"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>จัดการ SAR ทั้งหมด</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {partsSummary.map((part) => (
                <Link
                  key={part.id}
                  href={`/ha/sar/part/${part.part_number}`}
                  className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-sm border border-indigo-100">
                        {part.part_number}
                      </span>
                      <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                        เปิดดู <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mb-1">ตอนที่ {part.part_number}</div>
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-1">
                      {part.part_name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>{part.completed_sections}/{part.total_sections} หมวด</span>
                      <span className="font-bold text-slate-700">{part.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${part.progress_percent}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
