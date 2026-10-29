import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
  Building2, 
  Search, 
  Printer, 
  ArrowLeft, 
  Filter, 
  Stethoscope, 
  FlaskConical, 
  Briefcase, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  ChevronRight, 
  Pencil, 
  Activity,
  Users,
  Compass,
  Sparkles,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileItem {
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
  key_quality_issues?: string;
  key_processes?: Array<{ process: string; expectation: string; kpi: string }>;
  performance_indicators?: Array<{ name: string; target: string; y2569?: string }>;
  status: string;
  current_version: number;
  updated_at: string;
  department?: {
    id: number;
    name: string;
    code?: string;
  };
  team?: {
    id: number;
    name_th: string;
    abbreviation: string;
  };
}

interface Props {
  profiles: ProfileItem[];
  stats: {
    total: number;
    clinical: number;
    diagnostic_support: number;
    general_support: number;
    quality_safety: number;
    latest_revisions: Array<{
      id: number;
      version_number: number;
      change_summary: string;
      created_at: string;
      service_profile?: {
        id: number;
        name: string;
        code: string;
      };
      creator?: {
        name: string;
      };
    }>;
  };
  departments: Array<{ id: number; name: string; code?: string }>;
  haTeams: Array<{ id: number; name_th: string; abbreviation: string }>;
  currentDepartment: string;
  currentTeam: string;
  currentGroup: string;
  searchQuery: string;
}

export default function ServiceProfileIndex({
  profiles,
  stats,
  departments,
  haTeams,
  currentDepartment,
  currentTeam,
  currentGroup,
  searchQuery,
}: Props) {
  const [selectedGroup, setSelectedGroup] = useState<string>(currentGroup || 'all');
  const [selectedDept, setSelectedDept] = useState<string>(currentDepartment || 'all');
  const [selectedTeam, setSelectedTeam] = useState<string>(currentTeam || 'all');
  const [search, setSearch] = useState<string>(searchQuery || '');

  // Apply filters
  const applyFilters = (group = selectedGroup, dept = selectedDept, team = selectedTeam, q = search) => {
    router.get('/ha/service-profile', {
      service_group: group !== 'all' ? group : undefined,
      department_id: dept !== 'all' ? dept : undefined,
      team_id: team !== 'all' ? team : undefined,
      search: q || undefined,
    }, {
      preserveState: true,
      replace: true,
    });
  };

  const getGroupBadge = (group: string) => {
    switch (group) {
      case 'clinical':
        return {
          label: 'บริการทางคลินิก',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          chip: 'border-l-rose-500',
          icon: <Stethoscope className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'diagnostic_support':
        return {
          label: 'วินิจฉัย & สนับสนุนการแพทย์',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          chip: 'border-l-blue-500',
          icon: <FlaskConical className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'general_support':
        return {
          label: 'สนับสนุนทั่วไป & บริหาร',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          chip: 'border-l-amber-500',
          icon: <Briefcase className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'quality_safety':
        return {
          label: 'คุณภาพ & ความปลอดภัย',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          chip: 'border-l-emerald-500',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
        };
      default:
        return {
          label: 'ทั่วไป',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          chip: 'border-l-slate-400',
          icon: <Building2 className="w-3.5 h-3.5 text-slate-500" />,
        };
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'งานพัฒนาคุณภาพ (HA)', href: '/ha' },
        { title: 'Service Profile แต่ละแผนก', href: '/ha/service-profile' },
      ]}
    >
      <Head title="Service Profile ข้อมูลการจัดบริการแต่ละแผนก - งานพัฒนาคุณภาพ HA" />

      <div className="min-h-screen bg-slate-50/60 pb-16 font-sans">
        {/* Header Hero Section */}
        <div className="bg-white border-b border-slate-200/90 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Link
              href="/ha"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับสู่หน้าหลักงาน HA Hub</span>
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Service Profile ข้อมูลการจัดบริการประจำหน่วยงาน
                    </h1>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 hidden sm:inline">
                      {stats.total} หน่วยงาน
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                    บันทึกและติดตามบริบท วัตถุประสงค์ ขอบเขตบริการ กระบวนการสำคัญ และตัวชี้วัดรายแผนก (Hospital Accreditation 5th Edition)
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/ha/service-profile/overview/print?service_group=${selectedGroup}&department_id=${selectedDept}&team_id=${selectedTeam}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์รายงานภาพรวม (PDF / Print)</span>
                </Link>
              </div>
            </div>

            {/* Stats Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-rose-600 flex items-center justify-center shadow-xs border border-rose-100">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-rose-800/80">บริการทางคลินิก</div>
                  <div className="text-lg font-black text-rose-950 mt-0.5">{stats.clinical} <span className="text-xs font-normal text-rose-700">แผนก</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-xs border border-blue-100">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-blue-800/80">วินิจฉัย & สนับสนุนการแพทย์</div>
                  <div className="text-lg font-black text-blue-950 mt-0.5">{stats.diagnostic_support} <span className="text-xs font-normal text-blue-700">แผนก</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-amber-700 flex items-center justify-center shadow-xs border border-amber-100">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-amber-800/80">สนับสนุนทั่วไป & บริหาร</div>
                  <div className="text-lg font-black text-amber-950 mt-0.5">{stats.general_support} <span className="text-xs font-normal text-amber-800">แผนก</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center shadow-xs border border-emerald-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-emerald-800/80">คุณภาพ & ความปลอดภัย</div>
                  <div className="text-lg font-black text-emerald-950 mt-0.5">{stats.quality_safety} <span className="text-xs font-normal text-emerald-800">แผนก</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Multi-Faceted Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
            {/* Top row: Search and Selects */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    applyFilters(selectedGroup, selectedDept, selectedTeam, e.target.value);
                  }}
                  placeholder="ค้นหาชื่อแผนก, รหัส, วัตถุประสงค์..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Department Dropdown */}
              <div className="md:col-span-4 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">แผนก:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    applyFilters(selectedGroup, e.target.value, selectedTeam, search);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                >
                  <option value="all">ทุกแผนกในโรงพยาบาล</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team HA Dropdown */}
              <div className="md:col-span-4 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">ทีมนำ:</span>
                <select
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    applyFilters(selectedGroup, selectedDept, e.target.value, search);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                >
                  <option value="all">ทุกทีมนำคุณภาพ (Team HA)</option>
                  {haTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.abbreviation}] {t.name_th}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom row: Service Group Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>สายงาน:</span>
              </span>
              {[
                { id: 'all', label: 'ทั้งหมด', count: stats.total },
                { id: 'clinical', label: 'บริการคลินิก', count: stats.clinical, icon: <Stethoscope className="w-3 h-3 text-rose-600" /> },
                { id: 'diagnostic_support', label: 'วินิจฉัย/สนับสนุนการแพทย์', count: stats.diagnostic_support, icon: <FlaskConical className="w-3 h-3 text-blue-600" /> },
                { id: 'general_support', label: 'สนับสนุนทั่วไป', count: stats.general_support, icon: <Briefcase className="w-3 h-3 text-amber-600" /> },
                { id: 'quality_safety', label: 'งานคุณภาพ/ความปลอดภัย', count: stats.quality_safety, icon: <ShieldCheck className="w-3 h-3 text-emerald-600" /> },
              ].map((tab) => {
                const isActive = selectedGroup === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedGroup(tab.id);
                      applyFilters(tab.id, selectedDept, selectedTeam, search);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px]",
                      isActive ? "bg-slate-800 text-amber-300" : "bg-slate-200 text-slate-600"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid of Service Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const groupInfo = getGroupBadge(p.service_group);
              const kpiCount = p.performance_indicators?.length ?? 0;
              const processCount = p.key_processes?.length ?? 0;

              return (
                <div
                  key={p.id}
                  className={cn(
                    "bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden border-l-4",
                    groupInfo.chip
                  )}
                >
                  <div className="p-5 space-y-3">
                    {/* Header: Code & Group Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-900 text-amber-300 tracking-wider">
                        {p.code}
                      </span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10.5px] font-semibold border flex items-center gap-1", groupInfo.badge)}>
                        {groupInfo.icon}
                        <span>{groupInfo.label}</span>
                      </span>
                    </div>

                    {/* Department Name */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
                        {p.name}
                      </h3>
                      {p.team && (
                        <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>ทีมนำ: <strong>[{p.team.abbreviation}] {p.team.name_th}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Leader / Supervisor */}
                    {p.leader_name && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400">ผู้รับผิดชอบ: </span>
                        <span className="font-medium text-slate-800">{p.leader_name}</span>
                      </div>
                    )}

                    {/* Purpose Snippet */}
                    {p.purpose && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {p.purpose}
                      </p>
                    )}

                    {/* Metadata Chips: KPIs and Processes */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Activity className="w-3.5 h-3.5 text-amber-600" />
                        <span>{kpiCount} ตัวชี้วัด</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Compass className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{processCount} กระบวนการ</span>
                      </span>
                      <span>•</span>
                      <span className="text-slate-400 font-mono">v{p.current_version}</span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/ha/service-profile/${p.id}/print`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                      title="พิมพ์รายงาน A4 รายแผนก"
                    >
                      <Printer className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/ha/service-profile/${p.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-amber-700 hover:border-amber-300 transition-all shadow-2xs"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </Link>

                      <Link
                        href={`/ha/service-profile/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-600 text-white transition-all shadow-2xs"
                      >
                        <span>เปิดดู</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {profiles.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">ไม่พบ Service Profile ตามเงื่อนไขที่เลือก</h3>
                <p className="text-xs text-slate-500 mt-1">ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา</p>
                <button
                  onClick={() => {
                    setSelectedGroup('all');
                    setSelectedDept('all');
                    setSelectedTeam('all');
                    setSearch('');
                    applyFilters('all', 'all', 'all', '');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
