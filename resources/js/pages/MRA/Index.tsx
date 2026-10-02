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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Settings2,
  Save,
  Loader2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { maskPatientName } from '@/lib/pii';
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
  department?: string | null;
  status: 'pending' | 'in_progress' | 'audited' | 'corrected';
  audit_type: 'opd' | 'ipd';
  audit_target?: 'internal' | 'rta' | null;
  accuracy_percentage: number;
  total_items: number;
  correct_items: number;
  summary_notes?: string | null;
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

  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [editForm, setEditForm] = useState({
    audit_target: 'internal',
    status: 'pending',
    department: '',
    doctor_name: '',
    summary_notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (audit: Audit) => {
    setEditingAudit(audit);
    setEditForm({
      audit_target: audit.audit_target || 'internal',
      status: audit.status || 'pending',
      department: audit.department || '',
      doctor_name: audit.doctor_name || '',
      summary_notes: audit.summary_notes || '',
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAudit) return;
    setSavingEdit(true);
    router.put(`/mra/${editingAudit.id}`, editForm, {
      preserveScroll: true,
      onSuccess: () => {
        setEditingAudit(null);
        setSavingEdit(false);
      },
      onError: () => {
        setSavingEdit(false);
      },
    });
  };

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
                          <div className="font-medium text-slate-800">{maskPatientName(audit.patient_name)}</div>
                          {audit.doctor_name && <div className="text-xs text-slate-400">แพทย์: {audit.doctor_name}</div>}
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="space-y-1">
                            <StatusPill
                              label={audit.audit_type.toUpperCase()}
                              className={audit.audit_type === 'opd' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-violet-200 bg-violet-50 text-violet-700'}
                            />
                            <div>
                              <span className={cn(
                                "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                audit.audit_target === 'rta' ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
                              )}>
                                {audit.audit_target === 'rta' ? 'ส่ง ทบ.' : 'ภายใน'}
                              </span>
                            </div>
                          </div>
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
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                              title={audit.status === 'pending' ? 'เริ่มตรวจสอบ' : 'แก้ไขผลการตรวจ'}
                            >
                              <Link href={`/mra/${audit.id}/audit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem asChild>
                                  <Link href={`/mra/${audit.id}`} className="flex items-center cursor-pointer">
                                    <Eye className="mr-2 h-4 w-4 text-slate-500" />ดูรายละเอียด
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/mra/${audit.id}/audit`} className="flex items-center cursor-pointer text-indigo-600">
                                    <Edit className="mr-2 h-4 w-4" />
                                    {audit.status === 'pending' ? 'เริ่มตรวจสอบ' : 'แก้ไขผลการตรวจ (ประเมินเกณฑ์)'}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditModal(audit)} className="flex items-center cursor-pointer text-amber-600">
                                  <Settings2 className="mr-2 h-4 w-4" />
                                  แก้ไขข้อมูลการตรวจ (ทบ./แผนก/สถานะ)
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-600 cursor-pointer" onClick={() => handleDelete(audit.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />ลบ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

        {/* Modal แก้ไขข้อมูลการตรวจเวชระเบียน */}
        <Dialog open={!!editingAudit} onOpenChange={(open) => !open && setEditingAudit(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-950">
                <Settings2 className="h-5 w-5 text-indigo-600" />
                แก้ไขข้อมูลการตรวจเวชระเบียน
              </DialogTitle>
              <DialogDescription>
                HN: {editingAudit?.hn} · VN: {editingAudit?.vn || '-'} · ผู้ป่วย: {editingAudit ? maskPatientName(editingAudit.patient_name) : ''}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    ตรวจสำหรับ (เป้าหมาย)
                  </label>
                  <Select
                    value={editForm.audit_target}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, audit_target: val }))}
                  >
                    <SelectTrigger className={qualityInput}>
                      <SelectValue placeholder="เลือกเป้าหมาย" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">ตรวจสอบภายใน</SelectItem>
                      <SelectItem value="rta">ส่ง ทบ.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    สถานะ
                  </label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger className={qualityInput}>
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                      <SelectItem value="in_progress">กำลังตรวจสอบ</SelectItem>
                      <SelectItem value="audited">ตรวจสอบแล้ว</SelectItem>
                      <SelectItem value="corrected">แก้ไขแล้ว</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    แผนก / คลินิก
                  </label>
                  <input
                    type="text"
                    className={cn(qualityInput, 'w-full')}
                    value={editForm.department}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="เช่น อายุรกรรม, ศัลยกรรม"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    แพทย์ผู้รักษา
                  </label>
                  <input
                    type="text"
                    className={cn(qualityInput, 'w-full')}
                    value={editForm.doctor_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, doctor_name: e.target.value }))}
                    placeholder="ชื่อแพทย์"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  หมายเหตุสรุปผลการตรวจ
                </label>
                <textarea
                  rows={3}
                  className={cn(qualityInput, 'w-full resize-none py-2')}
                  value={editForm.summary_notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, summary_notes: e.target.value }))}
                  placeholder="บันทึกข้อเสนอแนะ หรือหมายเหตุเพิ่มเติม..."
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAudit(null)}
                  disabled={savingEdit}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      บันทึกการแก้ไข
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </QualityPage>
  );
}
