import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  FileText,
  CheckCircle,
  BarChart3,
  Calendar,
  Target,
  Clock,
  Plus,
  ChevronRight,
  Download,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState } from '@/components/quality/quality-ui';
import MraSubNav, { mraBreadcrumbs } from './MraSubNav';

interface CategoryStat {
  id: number;
  code: string;
  name: string;
  total_audits: number;
  pass_count: number;
  fail_count: number;
  accuracy: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
  accuracy: number;
}

interface TopError {
  criteria_code: string;
  criteria_name: string;
  category_name: string;
  fail_count: number;
  percentage: number;
}

interface RecentAudit {
  id: number;
  hn: string;
  patient_name: string;
  visit_date: string;
  status: string;
  accuracy_percentage: number;
  auditor_name: string;
  audited_at: string;
}

interface Props {
  stats: {
    total_audits: number;
    pending_audits: number;
    in_progress_audits: number;
    completed_audits: number;
    avg_accuracy: number;
    this_month_audits: number;
    this_month_accuracy: number;
    last_month_accuracy: number;
    target_accuracy: number;
  };
  categoryStats: CategoryStat[];
  monthlyTrends: MonthlyTrend[];
  topErrors: TopError[];
  recentAudits: RecentAudit[];
}

export default function MraDashboard({
  stats,
  categoryStats = [],
  monthlyTrends = [],
  topErrors = [],
  recentAudits = [],
}: Props) {
  const accuracyTrend = stats?.this_month_accuracy - stats?.last_month_accuracy;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <StatusPill label="รอตรวจสอบ" className="border-amber-200 bg-amber-50 text-amber-700" />;
      case 'in_progress':
        return <StatusPill label="กำลังตรวจ" className="border-sky-200 bg-sky-50 text-sky-700" />;
      case 'audited':
        return <StatusPill label="เสร็จสิ้น" className="border-emerald-200 bg-emerald-50 text-emerald-700" />;
      default:
        return <StatusPill label={status} className="border-slate-200 bg-slate-50 text-slate-600" />;
    }
  };

  return (
    <QualityPage
      tone="indigo"
      icon={FileSearch}
      badge="ศูนย์คุณภาพ · MRA"
      title="ภาพรวม MRA"
      subtitle="ระบบติดตามคุณภาพเวชระเบียน ตามเกณฑ์ สรพ. 2563"
      breadcrumbs={mraBreadcrumbs({ title: 'ภาพรวม', href: route('mra.dashboard') })}
      headTitle="ภาพรวม MRA"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl">
            <Download className="mr-2 h-4 w-4" />
            ส่งออกรายงาน
          </Button>
          <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
            <Link href="/mra/create">
              <Plus className="mr-2 h-4 w-4" />
              เริ่มการตรวจสอบใหม่
            </Link>
          </Button>
        </div>
      }
      subNav={<MraSubNav active="mra.dashboard" />}
    >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="ตรวจสอบทั้งหมด" value={stats?.total_audits || 0} sub={`เดือนนี้ +${stats?.this_month_audits || 0}`} icon={FileText} tone="indigo" />
          <StatCard label="รอการตรวจสอบ" value={stats?.pending_audits || 0} sub={`กำลังดำเนินการ ${stats?.in_progress_audits || 0}`} icon={Clock} tone="amber" />
          <StatCard label="ตรวจสอบแล้ว" value={stats?.completed_audits || 0} sub={stats?.total_audits > 0 ? `${((stats?.completed_audits / stats?.total_audits) * 100).toFixed(0)}% ของทั้งหมด` : undefined} icon={CheckCircle} tone="emerald" />
          <StatCard label="ความถูกต้องเฉลี่ย" value={`${Number(stats?.avg_accuracy || 0).toFixed(1)}%`} sub={`${Number(accuracyTrend || 0) >= 0 ? '+' : ''}${Number(accuracyTrend || 0).toFixed(1)}% จากเดือนก่อน`} icon={Activity} tone={Number(stats?.avg_accuracy || 0) >= 90 ? 'emerald' : Number(stats?.avg_accuracy || 0) >= 70 ? 'amber' : 'rose'} />
          <StatCard label="เป้าหมาย" value={`${stats?.target_accuracy || 90}%`} icon={Target} tone="violet" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title="ผลตามหมวดหมู่" description="อัตราความถูกต้องแยกตามหมวดหมู่การตรวจสอบ 9 หมวด">
              <div className="space-y-4">
                {categoryStats.length > 0 ? (
                  categoryStats.map((cat) => (
                    <div key={cat.id} className="rounded-xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <StatusPill label={cat.code} className="font-mono border-slate-200 bg-white text-slate-700" />
                          <span className="max-w-[200px] truncate font-medium text-slate-800">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-lg font-bold',
                            Number(cat.accuracy || 0) >= 90 ? 'text-emerald-600' :
                            Number(cat.accuracy || 0) >= 70 ? 'text-amber-600' : 'text-rose-600',
                          )}>
                            {Number(cat.accuracy || 0).toFixed(1)}%
                          </span>
                          <span className="text-xs text-slate-400">
                            ({cat.pass_count}/{cat.pass_count + cat.fail_count})
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={Number(cat.accuracy || 0)}
                        className={cn(
                          'h-2.5 rounded-full',
                          Number(cat.accuracy || 0) >= 90 ? '[&>div]:bg-emerald-500' :
                          Number(cat.accuracy || 0) >= 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-rose-500',
                        )}
                      />
                    </div>
                  ))
                ) : (
                  <EmptyState text="ยังไม่มีข้อมูลเพียงพอ" />
                )}
              </div>
          </Panel>

          <Panel title="ข้อผิดพลาดที่พบบ่อย" description="รายการที่มักพบปัญหาจากการตรวจสอบ">
              <div className="space-y-3">
                {topErrors.length > 0 ? (
                  topErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{error.criteria_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {error.category_name} • ไม่ผ่าน <span className="font-semibold text-rose-600">{error.fail_count}</span> ครั้ง ({Number(error.percentage || 0).toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="ไม่พบข้อผิดพลาดที่พบบ่อย" />
                )}
              </div>
          </Panel>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="แนวโน้มรายเดือน" description="สถิติการตรวจสอบและความถูกต้อง 6 เดือนย้อนหลัง">
              {monthlyTrends.length > 0 ? (
                <div className="grid grid-cols-6 gap-3 text-center">
                  {monthlyTrends.map((trend, index) => (
                    <div key={index} className="space-y-2">
                      <div className="text-xs font-medium text-slate-500">{trend.month}</div>
                      <div className="relative flex h-28 items-end justify-center rounded-lg bg-slate-50 p-1">
                        <div
                          className={cn(
                            'w-full rounded-t-lg transition-all',
                            Number(trend.accuracy || 0) >= 90 ? 'bg-emerald-500' :
                            Number(trend.accuracy || 0) >= 70 ? 'bg-amber-500' : 'bg-rose-500',
                          )}
                          style={{ height: `${Number(trend.accuracy || 0)}%` }}
                        />
                      </div>
                      <div className={cn(
                        'text-sm font-bold',
                        Number(trend.accuracy || 0) >= 90 ? 'text-emerald-600' :
                        Number(trend.accuracy || 0) >= 70 ? 'text-amber-600' : 'text-rose-600',
                      )}>
                        {Number(trend.accuracy || 0).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400">{trend.total} รายการ</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="ยังไม่มีข้อมูลรายเดือน" />
              )}
          </Panel>

          <Panel
            title="การตรวจสอบล่าสุด"
            description="รายการที่เพิ่งตรวจสอบ"
            action={
              <Link href="/mra">
                <Button variant="outline" size="sm" className="rounded-xl">
                  ดูทั้งหมด <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            }
          >
              <div className="space-y-3">
                {recentAudits.length > 0 ? (
                  recentAudits.slice(0, 5).map((audit) => (
                    <Link key={audit.id} href={`/mra/${audit.id}`}>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-indigo-200 hover:shadow-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-indigo-600">{audit.hn}</span>
                            {getStatusBadge(audit.status)}
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-500">{audit.patient_name}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(audit.visit_date).toLocaleDateString('th-TH')}
                            {audit.auditor_name && ` • ${audit.auditor_name}`}
                          </p>
                        </div>
                        {audit.status !== 'pending' && (
                          <div className={cn(
                            'rounded-lg px-3 py-1 text-xl font-bold',
                            Number(audit.accuracy_percentage || 0) >= 90 ? 'bg-emerald-50 text-emerald-600' :
                            Number(audit.accuracy_percentage || 0) >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600',
                          )}>
                            {Number(audit.accuracy_percentage || 0).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState text="ยังไม่มีการตรวจสอบ" />
                )}
              </div>
          </Panel>
        </div>

        <Panel title="การดำเนินการด่วน">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Link href="/mra/create">
                <Button variant="outline" className="flex h-auto w-full flex-col gap-3 rounded-xl py-6">
                  <Plus className="h-6 w-6 text-indigo-600" />
                  <span className="font-medium">เริ่มตรวจสอบใหม่</span>
                </Button>
              </Link>
              <Link href="/mra?status=pending">
                <Button variant="outline" className="flex h-auto w-full flex-col gap-3 rounded-xl py-6">
                  <Clock className="h-6 w-6 text-amber-600" />
                  <span className="font-medium">รายการรอตรวจสอบ</span>
                </Button>
              </Link>
              <Link href="/mra/reports">
                <Button variant="outline" className="flex h-auto w-full flex-col gap-3 rounded-xl py-6">
                  <BarChart3 className="h-6 w-6 text-emerald-600" />
                  <span className="font-medium">รายงานสรุป</span>
                </Button>
              </Link>
              <Link href="/mra/settings">
                <Button variant="outline" className="flex h-auto w-full flex-col gap-3 rounded-xl py-6">
                  <Target className="h-6 w-6 text-violet-600" />
                  <span className="font-medium">ตั้งค่าเป้าหมาย</span>
                </Button>
              </Link>
            </div>
        </Panel>
    </QualityPage>
  );
}
