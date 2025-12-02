import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  Clock,
  ArrowRight,
  Download,
  RefreshCcw,
  Plus,
  Sparkles,
  LayoutDashboard,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '/quality' },
    { title: 'MRA', href: '/mra' },
    { title: 'Dashboard', href: '/mra/dashboard' },
  ];

  const accuracyTrend = stats?.this_month_accuracy - stats?.last_month_accuracy;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">รอตรวจสอบ</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">กำลังตรวจ</Badge>;
      case 'audited':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">เสร็จสิ้น</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="MRA Dashboard" />

      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <LayoutDashboard className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  MRA Dashboard
                  <Sparkles className="h-6 w-6 text-yellow-300" />
                </h1>
                <p className="text-purple-100 mt-1 max-w-xl">
                  ระบบติดตามคุณภาพเวชระเบียน ตามเกณฑ์ สรพ. 2563
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                <Download className="mr-2 h-4 w-4" />
                ส่งออกรายงาน
              </Button>
              <Link href="/mra/create">
                <Button className="bg-white text-purple-700 hover:bg-purple-50 shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  เริ่มการตรวจสอบใหม่
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 px-6">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ตรวจสอบทั้งหมด</CardTitle>
              <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_audits || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                เดือนนี้ +{stats?.this_month_audits || 0} รายการ
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">รอการตรวจสอบ</CardTitle>
              <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">{stats?.pending_audits || 0}</div>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
                กำลังดำเนินการ {stats?.in_progress_audits || 0} รายการ
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">ตรวจสอบแล้ว</CardTitle>
              <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats?.completed_audits || 0}</div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                {stats?.total_audits > 0 ? ((stats?.completed_audits / stats?.total_audits) * 100).toFixed(0) : 0}% ของทั้งหมด
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "hover:shadow-lg transition-all",
            Number(stats?.avg_accuracy || 0) >= 90 
              ? "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800"
              : Number(stats?.avg_accuracy || 0) >= 70
              ? "bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-200 dark:border-yellow-800"
              : "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border-red-200 dark:border-red-800"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ความถูกต้องเฉลี่ย</CardTitle>
              <div className={cn(
                "p-2 rounded-lg",
                Number(stats?.avg_accuracy || 0) >= 90 ? "bg-green-200 dark:bg-green-800" :
                Number(stats?.avg_accuracy || 0) >= 70 ? "bg-yellow-200 dark:bg-yellow-800" : "bg-red-200 dark:bg-red-800"
              )}>
                <Activity className={cn(
                  "h-4 w-4",
                  Number(stats?.avg_accuracy || 0) >= 90 ? "text-green-600 dark:text-green-300" :
                  Number(stats?.avg_accuracy || 0) >= 70 ? "text-yellow-600 dark:text-yellow-300" : "text-red-600 dark:text-red-300"
                )} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-bold",
                Number(stats?.avg_accuracy || 0) >= 90 ? "text-green-700 dark:text-green-400" :
                Number(stats?.avg_accuracy || 0) >= 70 ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400"
              )}>
                {Number(stats?.avg_accuracy || 0).toFixed(1)}%
              </div>
              <div className="flex items-center text-xs mt-1">
                {Number(accuracyTrend || 0) >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-600">+{Number(accuracyTrend || 0).toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-600">{Number(accuracyTrend || 0).toFixed(1)}%</span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">จากเดือนก่อน</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400">เป้าหมาย</CardTitle>
              <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">{stats?.target_accuracy || 90}%</div>
              <Progress
                value={Math.min((stats?.avg_accuracy / stats?.target_accuracy) * 100, 100)}
                className="h-2 mt-2 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-indigo-500"
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-6">
          {/* Category Performance */}
          <Card className="lg:col-span-2 border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                ผลตามหมวดหมู่
              </CardTitle>
              <CardDescription>
                อัตราความถูกต้องแยกตามหมวดหมู่การตรวจสอบ 9 หมวด
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {categoryStats.length > 0 ? (
                  categoryStats.map((cat) => (
                    <div key={cat.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-slate-700">
                            {cat.code}
                          </Badge>
                          <span className="truncate max-w-[200px] font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold text-lg",
                            Number(cat.accuracy || 0) >= 90 ? "text-green-600 dark:text-green-400" :
                            Number(cat.accuracy || 0) >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {Number(cat.accuracy || 0).toFixed(1)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({cat.pass_count}/{cat.pass_count + cat.fail_count})
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={Number(cat.accuracy || 0)}
                        className={cn(
                          "h-2.5 rounded-full",
                          Number(cat.accuracy || 0) >= 90 ? "[&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-emerald-500" :
                          Number(cat.accuracy || 0) >= 70 ? "[&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-amber-500" : "[&>div]:bg-gradient-to-r [&>div]:from-red-400 [&>div]:to-rose-500"
                        )}
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                      <BarChart3 className="h-12 w-12 opacity-50" />
                    </div>
                    <p className="font-medium">ยังไม่มีข้อมูลเพียงพอ</p>
                    <Link href="/mra/create">
                      <Button variant="link" className="mt-2">
                        เริ่มการตรวจสอบ <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Errors */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-red-200 dark:bg-red-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
                ข้อผิดพลาดที่พบบ่อย
              </CardTitle>
              <CardDescription>
                รายการที่มักพบปัญหาจากการตรวจสอบ
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {topErrors.length > 0 ? (
                  topErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-100 dark:border-red-800">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{error.criteria_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {error.category_name} • ไม่ผ่าน <span className="font-semibold text-red-600">{error.fail_count}</span> ครั้ง ({Number(error.percentage || 0).toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full inline-block mb-4">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                    <p className="text-sm font-medium">ไม่พบข้อผิดพลาดที่พบบ่อย</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 px-6">
          {/* Monthly Trend */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-cyan-200 dark:bg-cyan-800 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                </div>
                แนวโน้มรายเดือน
              </CardTitle>
              <CardDescription>
                สถิติการตรวจสอบและความถูกต้อง 6 เดือนย้อนหลัง
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {monthlyTrends.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-3 text-center">
                    {monthlyTrends.map((trend, index) => (
                      <div key={index} className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">{trend.month}</div>
                        <div className="relative h-28 flex items-end justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg p-1">
                          <div
                            className={cn(
                              "w-full rounded-t-lg transition-all",
                              Number(trend.accuracy || 0) >= 90 ? "bg-gradient-to-t from-green-500 to-emerald-400" :
                              Number(trend.accuracy || 0) >= 70 ? "bg-gradient-to-t from-yellow-500 to-amber-400" : "bg-gradient-to-t from-red-500 to-rose-400"
                            )}
                            style={{ height: `${Number(trend.accuracy || 0)}%` }}
                          />
                        </div>
                        <div className={cn(
                          "text-sm font-bold",
                          Number(trend.accuracy || 0) >= 90 ? "text-green-600 dark:text-green-400" :
                          Number(trend.accuracy || 0) >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {Number(trend.accuracy || 0).toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">{trend.total} รายการ</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <Calendar className="h-12 w-12 opacity-50" />
                  </div>
                  <p className="font-medium">ยังไม่มีข้อมูลรายเดือน</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Audits */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-200 dark:bg-violet-800 rounded-lg">
                    <RefreshCcw className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div>
                    <CardTitle>การตรวจสอบล่าสุด</CardTitle>
                    <CardDescription>
                      รายการที่เพิ่งตรวจสอบ
                    </CardDescription>
                  </div>
                </div>
                <Link href="/mra">
                  <Button variant="outline" size="sm" className="border-violet-200 text-violet-700 hover:bg-violet-50">
                    ดูทั้งหมด <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {recentAudits.length > 0 ? (
                  recentAudits.slice(0, 5).map((audit) => (
                    <Link key={audit.id} href={`/mra/${audit.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{audit.hn}</span>
                            {getStatusBadge(audit.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {audit.patient_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(audit.visit_date).toLocaleDateString('th-TH')}
                            {audit.auditor_name && ` • ${audit.auditor_name}`}
                          </p>
                        </div>
                        {audit.status !== 'pending' && (
                          <div className={cn(
                            "text-xl font-bold px-3 py-1 rounded-lg",
                            Number(audit.accuracy_percentage || 0) >= 90 ? "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400" :
                            Number(audit.accuracy_percentage || 0) >= 70 ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400" : "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {Number(audit.accuracy_percentage || 0).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full inline-block mb-4">
                      <FileText className="h-12 w-12 opacity-50" />
                    </div>
                    <p className="text-sm font-medium">ยังไม่มีการตรวจสอบ</p>
                    <Link href="/mra/create">
                      <Button variant="link" className="mt-2">
                        เริ่มการตรวจสอบใหม่ <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="mx-6 border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <Zap className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              การดำเนินการด่วน
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/mra/create">
                <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:shadow-lg transition-all group">
                  <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-xl group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <span className="font-medium">เริ่มตรวจสอบใหม่</span>
                </Button>
              </Link>
              <Link href="/mra?status=pending">
                <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400 hover:shadow-lg transition-all group">
                  <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-xl group-hover:scale-110 transition-transform">
                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <span className="font-medium">รายการรอตรวจสอบ</span>
                </Button>
              </Link>
              <Link href="/mra/reports">
                <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:border-green-400 hover:shadow-lg transition-all group">
                  <div className="p-3 bg-green-100 dark:bg-green-800 rounded-xl group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <span className="font-medium">รายงานสรุป</span>
                </Button>
              </Link>
              <Link href="/mra/settings">
                <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-3 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400 hover:shadow-lg transition-all group">
                  <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-xl group-hover:scale-110 transition-transform">
                    <Target className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <span className="font-medium">ตั้งค่าเป้าหมาย</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Bottom spacing */}
        <div className="h-6" />
      </div>
    </AppLayout>
  );
}
