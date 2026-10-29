import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Activity, 
  Search, 
  ChevronRight, 
  Clock, 
  Printer, 
  History, 
  Sparkles, 
  Flame, 
  HeartPulse, 
  Brain, 
  Sun, 
  ShieldAlert, 
  FileText, 
  Stethoscope,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TracerItem {
  id: number;
  code: string;
  title: string;
  subtitle?: string;
  category: 'emergency' | 'chronic' | 'infectious' | 'mental_health' | 'surgical' | 'other';
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  current_version: number;
  updated_at: string;
  kpi_data?: {
    rows?: any[];
  };
  team?: {
    name_th: string;
  };
}

interface RevisionItem {
  id: number;
  clinical_tracer_id: number;
  version_number: number;
  change_summary: string;
  created_at: string;
  tracer: {
    id: number;
    code: string;
    title: string;
  };
  creator?: {
    name: string;
  };
}

interface Props {
  tracers: TracerItem[];
  stats: {
    total: number;
    emergency: number;
    chronic: number;
    infectious: number;
    mental_health: number;
    latest_revisions: RevisionItem[];
  };
  currentCategory: string;
  searchQuery: string;
}

export default function ClinicalTracerIndex({ tracers, stats, currentCategory, searchQuery }: Props) {
  const [search, setSearch] = useState(searchQuery);

  const categories = [
    { id: 'all', label: 'ทั้งหมด', count: stats.total },
    { id: 'emergency', label: '🚨 ฉุกเฉินและวิกฤต', count: stats.emergency },
    { id: 'chronic', label: '🩺 โรคเรื้อรัง (NCDs)', count: stats.chronic },
    { id: 'infectious', label: '🦠 โรคติดเชื้อสำคัญ', count: stats.infectious },
    { id: 'mental_health', label: '🧠 สุขภาพจิต', count: stats.mental_health },
  ];

  const handleCategoryChange = (cat: string) => {
    router.get('/ha/clinical-tracer', { category: cat, search }, { preserveState: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/ha/clinical-tracer', { category: currentCategory, search }, { preserveState: true });
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'emergency':
        return {
          label: 'ฉุกเฉิน / วิกฤต',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          iconBg: 'bg-rose-100 text-rose-700',
        };
      case 'chronic':
        return {
          label: 'โรคเรื้อรัง',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          iconBg: 'bg-blue-100 text-blue-700',
        };
      case 'infectious':
        return {
          label: 'โรคติดเชื้อ',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          iconBg: 'bg-emerald-100 text-emerald-700',
        };
      case 'mental_health':
        return {
          label: 'สุขภาพจิต',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
          iconBg: 'bg-purple-100 text-purple-700',
        };
      default:
        return {
          label: 'ทั่วไป',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          iconBg: 'bg-slate-100 text-slate-700',
        };
    }
  };

  return (
    <AppLayout 
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'Clinical Tracer', href: '/ha/clinical-tracer' }
      ]}
    >
      <Head title="Clinical Tracer (การติดตามทางคลินิก 13 กลุ่มโรค) - งานพัฒนาคุณภาพ HA" />

      <div className="min-h-screen bg-slate-50/50 pb-16">
        {/* Header Banner */}
        <div className="bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold mb-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Clinical Tracer & Patient Journey</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  ระบบติดตามทางคลินิก (Clinical Tracer) 13 กลุ่มโรคสำคัญ
                </h1>
                <p className="text-slate-600 text-sm mt-1">
                  ติดตามกระบวนการดูแลรักษาผู้ป่วยตามแนวทาง CPG และเกณฑ์มาตรฐาน HA (โรงพยาบาลค่ายสุรสิงหนาท)
                </p>
              </div>

              {/* Overview Print Action */}
              <div className="flex items-center gap-3">
                <Link
                  href={`/ha/clinical-tracer/overview/print?category=${currentCategory}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-slate-200 hover:shadow-rose-100 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์รายงานภาพรวม (PDF / Print)</span>
                </Link>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 pt-6 border-t border-slate-100">
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                <div className="text-xs font-medium text-slate-500 mb-1">กลุ่มโรคทั้งหมด</div>
                <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">ครบถ้วนตามเกณฑ์ สรพ.</div>
              </div>
              <div className="bg-rose-50/60 rounded-xl p-3.5 border border-rose-100">
                <div className="text-xs font-medium text-rose-700 mb-1">ฉุกเฉินและวิกฤต</div>
                <div className="text-2xl font-black text-rose-700">{stats.emergency}</div>
                <div className="text-[11px] text-rose-600 mt-0.5">Sepsis, STEMI, Stroke, Heat Stroke, HI</div>
              </div>
              <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100">
                <div className="text-xs font-medium text-blue-700 mb-1">โรคเรื้อรัง (NCDs)</div>
                <div className="text-2xl font-black text-blue-700">{stats.chronic}</div>
                <div className="text-[11px] text-blue-600 mt-0.5">DM, HT, ESRD (ไตวาย)</div>
              </div>
              <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-700 mb-1">โรคติดเชื้อสำคัญ</div>
                <div className="text-2xl font-black text-emerald-700">{stats.infectious}</div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Pneumonia, TB, Dengue, Flu</div>
              </div>
              <div className="bg-purple-50/60 rounded-xl p-3.5 border border-purple-100">
                <div className="text-xs font-medium text-purple-700 mb-1">สุขภาพจิต</div>
                <div className="text-2xl font-black text-purple-700">{stats.mental_health}</div>
                <div className="text-[11px] text-purple-600 mt-0.5">Depression & ฆ่าตัวตาย</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {/* Controls bar: Category filter + Search */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const isActive = currentCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5",
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    )}
                  >
                    <span>{cat.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-md text-[10px] font-mono",
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหากลุ่มโรค หรือรหัส (เช่น Sepsis, DM)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 shadow-xs"
              />
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Tracers Grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {tracers.map((t) => {
                  const theme = getCategoryTheme(t.category);
                  const kpiCount = t.kpi_data?.rows?.length ?? 0;

                  return (
                    <div 
                      key={t.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-rose-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top meta */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-black text-xs">
                            {t.code}
                          </span>
                          <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", theme.badge)}>
                            {theme.label}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug">
                          {t.title}
                        </h3>
                        {t.subtitle && (
                          <p className="text-xs text-slate-400 mb-3 font-medium">
                            {t.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Bottom action & info */}
                      <div className="pt-4 border-t border-slate-100 mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                          <span>{kpiCount} ตัวชี้วัดทางคลินิก</span>
                          <span className="font-mono">v{t.current_version}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/ha/clinical-tracer/${t.id}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <span>เปิดดูข้อมูล</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/ha/clinical-tracer/${t.id}/edit`}
                            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                          >
                            แก้ไข
                          </Link>
                          <Link
                            href={`/ha/clinical-tracer/${t.id}/print`}
                            target="_blank"
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
                            title="พิมพ์รายงาน"
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

            {/* Right sidebar: Recent Revisions */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <History className="w-4 h-4 text-rose-600" />
                    <span>ประวัติการแก้ไขล่าสุด (Revisions)</span>
                  </div>
                  <span className="text-xs text-slate-400">กู้คืนได้</span>
                </div>

                <div className="space-y-3">
                  {stats.latest_revisions.map((rev) => (
                    <Link
                      key={rev.id}
                      href={`/ha/clinical-tracer/${rev.clinical_tracer_id}`}
                      className="block p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-rose-50/50 hover:border-rose-100 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-rose-600 font-mono">
                          {rev.tracer?.code}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          v{rev.version_number}
                        </span>
                      </div>
                      <div className="font-medium text-slate-800 line-clamp-1 mb-1">
                        {rev.tracer?.title}
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

              {/* 6 Dimensions Guide */}
              <div className="bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-sm mb-2">
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>โครงสร้าง 6 มิติ Clinical Tracer</span>
                </div>
                <p className="text-xs text-rose-100 leading-relaxed mb-3">
                  มาตรฐานการจัดทำ Clinical Tracer ของ สรพ.:
                </p>
                <ol className="text-xs text-rose-50 space-y-1 list-decimal list-inside">
                  <li><strong>บริบท & สถิติ:</strong> ขนาดปัญหาและการทบทวนเคส</li>
                  <li><strong>ประเด็นสำคัญ:</strong> ความเสี่ยงทางคลินิก</li>
                  <li><strong>เป้าหมายการพัฒนา:</strong> วัตถุประสงค์</li>
                  <li><strong>กระบวนการคุณภาพ:</strong> CPG / Standing Order</li>
                  <li><strong>ตัวชี้วัด & ผลลัพธ์:</strong> ข้อมูลสถิติ 5 ปี</li>
                  <li><strong>แผนพัฒนาต่อเนื่อง:</strong> CQI & นวัตกรรม</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
