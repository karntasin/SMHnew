import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Download,
  CheckCircle2,
  Clock,
  RefreshCcw,
  TrendingUp,
  CalendarRange,
  FileSearch,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import MraSubNav, { mraBreadcrumbs } from './MraSubNav';

interface Audit {
  id: number;
  vn: string;
  an: string | null;
  hn: string;
  patient_name: string;
  visit_date: string;
  doctor_name: string | null;
  status: 'pending' | 'in_progress' | 'audited' | 'corrected';
  audit_type: 'opd' | 'ipd';
  accuracy_percentage: number;
  total_items: number;
  correct_items: number;
  auditor: {
    name: string;
  } | null;
  audited_at: string | null;
}

interface Props {
  audits: {
    data: Audit[];
    links: any[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  filters: {
    search?: string;
    status?: string;
    audit_type?: string;
    date_from?: string;
    date_to?: string;
    score_range?: string;
  };
  stats: {
    total: number;
    pending: number;
    in_progress: number;
    audited: number;
    avg_accuracy: number;
  };
}

export default function MraIndex({ audits, filters, stats }: Props) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const [typeFilter, setTypeFilter] = useState(filters.audit_type || 'all');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [scoreFilter, setScoreFilter] = useState(filters.score_range || 'all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <StatusPill label="รอตรวจสอบ" className="border-amber-200 bg-amber-50 text-amber-700" />;
      case 'in_progress':
        return <StatusPill label="กำลังตรวจสอบ" className="border-sky-200 bg-sky-50 text-sky-700" />;
      case 'audited':
        return <StatusPill label="ตรวจสอบแล้ว" className="border-emerald-200 bg-emerald-50 text-emerald-700" />;
      case 'corrected':
        return <StatusPill label="แก้ไขแล้ว" className="border-violet-200 bg-violet-50 text-violet-700" />;
      default:
        return <StatusPill label={status} className="border-slate-200 bg-slate-50 text-slate-600" />;
    }
  };

  const getScoreBadge = (percentage: number) => {
    const pct = Number(percentage || 0);
    if (pct >= 90) {
      return <StatusPill label={`${pct.toFixed(1)}%`} className="border-emerald-200 bg-emerald-50 text-emerald-700" />;
    } else if (pct >= 70) {
      return <StatusPill label={`${pct.toFixed(1)}%`} className="border-amber-200 bg-amber-50 text-amber-700" />;
    }
    return <StatusPill label={`${pct.toFixed(1)}%`} className="border-rose-200 bg-rose-50 text-rose-700" />;
  };

  const handleSearch = () => {
    const params: any = {};
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.audit_type = typeFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (scoreFilter !== 'all') params.score_range = scoreFilter;
    router.get('/mra', params, { preserveState: true });
  };

  const handleFilterChange = (key: string, value: string) => {
    const params: any = {};
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== 'all' && key !== 'status') params.status = statusFilter;
    if (typeFilter !== 'all' && key !== 'audit_type') params.audit_type = typeFilter;
    if (dateFrom && key !== 'date_from') params.date_from = dateFrom;
    if (dateTo && key !== 'date_to') params.date_to = dateTo;
    if (scoreFilter !== 'all' && key !== 'score_range') params.score_range = scoreFilter;

    if (value !== 'all' && value !== '') {
      params[key] = value;
    }
    router.get('/mra', params, { preserveState: true });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setScoreFilter('all');
    router.get('/mra', {}, { preserveState: true });
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo || scoreFilter !== 'all';

  const handleDelete = (id: number) => {
    if (confirm('ยืนยันการลบรายการนี้?')) {
      router.delete(`/mra/${id}`);
    }
  };

  return (
    <QualityPage
      tone="indigo"
      icon={FileSearch}
      badge="ศูนย์คุณภาพ · MRA"
      title="รายการตรวจสอบเวชระเบียน"
      subtitle="รายการผู้ป่วยที่ถูกสุ่มเพื่อตรวจสอบความถูกต้องของเวชระเบียน ตามมาตรฐาน สรพ. 2563"
      breadcrumbs={mraBreadcrumbs()}
      headTitle="รายการตรวจสอบเวชระเบียน"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/mra/reports"><Download className="mr-2 h-4 w-4" />รายงาน</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/mra/dashboard"><BarChart3 className="mr-2 h-4 w-4" />ภาพรวม</Link>
          </Button>
          <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
            <Link href="/mra/create"><Plus className="mr-2 h-4 w-4" />สร้างใหม่</Link>
          </Button>
        </div>
      }
      subNav={<MraSubNav active="mra.index" />}
    >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="ทั้งหมด" value={stats?.total || 0} icon={FileText} tone="slate" />
          <StatCard label="รอตรวจสอบ" value={stats?.pending || 0} icon={Clock} tone="amber" />
          <StatCard label="กำลังตรวจ" value={stats?.in_progress || 0} icon={RefreshCcw} tone="sky" />
          <StatCard label="ตรวจแล้ว" value={stats?.audited || 0} icon={CheckCircle2} tone="emerald" />
          <StatCard
            label="ความถูกต้องเฉลี่ย"
            value={`${Number(stats?.avg_accuracy || 0).toFixed(1)}%`}
            icon={TrendingUp}
            tone={Number(stats?.avg_accuracy || 0) >= 90 ? 'emerald' : Number(stats?.avg_accuracy || 0) >= 70 ? 'amber' : 'rose'}
          />
        </div>

        <Panel
          title="กรองข้อมูล"
          description="ค้นหาและกรองรายการตรวจสอบ"
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="rounded-xl text-rose-600">
                <RefreshCcw className="mr-1 h-4 w-4" />ล้างตัวกรอง
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="ค้นหา HN, VN หรือ ชื่อ..."
                  className={cn(qualityInput, 'w-72 pl-10')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleFilterChange('status', v); }}>
                <SelectTrigger className={cn(qualityInput, 'h-auto w-44 py-2')}><SelectValue placeholder="สถานะ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                  <SelectItem value="in_progress">กำลังตรวจสอบ</SelectItem>
                  <SelectItem value="audited">ตรวจสอบแล้ว</SelectItem>
                  <SelectItem value="corrected">แก้ไขแล้ว</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); handleFilterChange('audit_type', v); }}>
                <SelectTrigger className={cn(qualityInput, 'h-auto w-36 py-2')}><SelectValue placeholder="ประเภท" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  <SelectItem value="opd">OPD</SelectItem>
                  <SelectItem value="ipd">IPD</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scoreFilter} onValueChange={(v) => { setScoreFilter(v); handleFilterChange('score_range', v); }}>
                <SelectTrigger className={cn(qualityInput, 'h-auto w-44 py-2')}><SelectValue placeholder="ช่วงคะแนน" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกคะแนน</SelectItem>
                  <SelectItem value="high">สูง (≥90%)</SelectItem>
                  <SelectItem value="medium">ปานกลาง (70-89%)</SelectItem>
                  <SelectItem value="low">ต่ำ (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50/50 p-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarRange className="h-4 w-4" />ช่วงวันที่:
              </div>
              <input type="date" className={cn(qualityInput, 'w-44')} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-sm text-slate-500">ถึง</span>
              <input type="date" className={cn(qualityInput, 'w-44')} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              <Button onClick={handleSearch} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                <Search className="mr-2 h-4 w-4" />ค้นหา
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="รายการตรวจสอบ" description={`ทั้งหมด ${audits.total} รายการ`}>
            {audits.data.length === 0 ? (
              <EmptyState text="ไม่พบข้อมูลการตรวจสอบ" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                      <th className="py-2 pr-3 w-12">#</th>
                      <th className="py-2 pr-3">วันที่</th>
                      <th className="py-2 pr-3">HN / VN</th>
                      <th className="py-2 pr-3">ผู้ป่วย</th>
                      <th className="py-2 pr-3">ประเภท</th>
                      <th className="py-2 pr-3">ผู้ตรวจ</th>
                      <th className="py-2 pr-3">ผลตรวจ</th>
                      <th className="py-2 pr-3">สถานะ</th>
                      <th className="py-2 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.data.map((audit, index) => (
                      <tr key={audit.id} className="border-b border-slate-50">
                        <td className="py-2.5 pr-3 font-mono text-slate-400">{(audits.current_page - 1) * audits.per_page + index + 1}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{new Date(audit.visit_date).toLocaleDateString('th-TH')}</td>
                        <td className="py-2.5 pr-3">
                          <div className="font-mono font-semibold text-indigo-600">{audit.hn}</div>
                          <div className="text-xs text-slate-400">VN: {audit.vn || '-'}</div>
                          {audit.an && <div className="text-xs text-violet-600">AN: {audit.an}</div>}
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-slate-800">{audit.patient_name}</div>
                          {audit.doctor_name && <div className="text-xs text-slate-400">แพทย์: {audit.doctor_name}</div>}
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusPill
                            label={audit.audit_type.toUpperCase()}
                            className={audit.audit_type === 'opd' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-violet-200 bg-violet-50 text-violet-700'}
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">
                          {audit.auditor?.name || '-'}
                          {audit.audited_at && <div className="text-xs text-slate-400">{new Date(audit.audited_at).toLocaleDateString('th-TH')}</div>}
                        </td>
                        <td className="py-2.5 pr-3">
                          {audit.status !== 'pending' ? (
                            <div className="space-y-1">
                              {getScoreBadge(audit.accuracy_percentage)}
                              <div className="text-xs text-slate-400">{audit.correct_items}/{audit.total_items} รายการ</div>
                              <Progress value={Number(audit.accuracy_percentage || 0)} className="h-1.5 w-24" />
                            </div>
                          ) : (
                            <span className="text-xs italic text-slate-400">รอตรวจ</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">{getStatusBadge(audit.status)}</td>
                        <td className="py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/mra/${audit.id}`} className="flex items-center"><Eye className="mr-2 h-4 w-4" />ดูรายละเอียด</Link>
                              </DropdownMenuItem>
                              {(audit.status === 'pending' || audit.status === 'in_progress') && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/mra/${audit.id}/audit`} className="flex items-center"><Edit className="mr-2 h-4 w-4" />ตรวจสอบ</Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(audit.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />ลบ
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {audits.last_page > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="text-sm text-slate-500">
                  แสดง {(audits.current_page - 1) * audits.per_page + 1} - {Math.min(audits.current_page * audits.per_page, audits.total)} จาก {audits.total} รายการ
                </div>
                <div className="flex gap-1">
                  {audits.links.map((link: any, index: number) => (
                    <Button
                      key={index}
                      variant={link.active ? 'default' : 'outline'}
                      size="sm"
                      disabled={!link.url}
                      onClick={() => link.url && router.get(link.url)}
                      className={cn(link.active && 'rounded-xl bg-indigo-600 hover:bg-indigo-700')}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>
            )}
        </Panel>
    </QualityPage>
  );
}
