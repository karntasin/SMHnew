import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WelcomeModal from '@/components/WelcomeModal';
import { 
  Activity, 
  Users, 
  HeartPulse, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Stethoscope,
  Bed,
  Ambulance,
  PieChart,
  BarChart3,
  Calendar,
  Filter,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import { useTranslation } from '@/hooks/use-translation';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
];

interface DashboardProps {
  filter?: {
    start_date: string;
    end_date: string;
    start_date_label?: string;
    end_date_label?: string;
  };
  hosxp_error?: string | null;
  stats?: {
    summary?: {
      opd: number;
      ipd: number;
      er: number;
      cost_total: number;
      dm: number;
      ht: number;
      today?: {
        date: string;
        date_label: string;
        opd?: number;
        ipd_admit?: number;
        ipd_census?: number;
        er?: number;
        refer_out: number;
        opd_cost: number;
        payment: {
          self_pay: number;
          debt: number;
          unpaid: number;
          total: number;
        };
        beds: {
          total: number;
          occupied: number;
          free: number;
          occupancy_rate: number | null;
          adjrw_month: number;
        };
      };
      appointments?: {
        available?: boolean;
        note?: string | null;
        today: {
          date: string;
          date_label: string;
          scheduled: number;
          came: number;
          not_came: number;
          pending: number;
          came_rate: number | null;
        };
        period: {
          scheduled: number;
          came: number;
          not_came: number;
          pending: number;
          came_rate: number | null;
        };
        monthly: Array<{
          y: number;
          m: number;
          label: string;
          scheduled: number;
          came: number;
          not_came: number;
          pending: number;
          came_rate: number | null;
        }>;
        source: string;
      };
    };
    charts?: {
      visits_monthly?: Array<{
        y: number;
        m: number;
        label: string;
        opd: number;
        ipd: number;
        er: number;
      }>;
      costs_yearly_last5?: Array<{
        y: number;
        total: number;
      }>;
      department_visits_this_month?: Array<{
        department: string;
        total: number;
      }>;
      department_visits_this_year?: Array<{
        department: string;
        total: number;
      }>;
      visits_year_trend?: Array<{
        y: number;
        m: number;
        label: string;
        opd: number;
        ipd: number;
        er: number;
        total: number;
      }>;
      top10_opd?: Array<{
        icd10: string;
        total: number;
      }>;
      disease_monthly?: {
        dm?: Array<any>;
        ht?: Array<any>;
      };
      cv_risk_high_monthly?: Array<any>;
      cv_risk_scores_monthly?: Array<{
        y: number;
        m: number;
        label?: string;
        s0_9: number;
        s10_19: number;
        s20_29: number;
        s30_39: number;
        s40p: number;
      }>;
      cv_risk_summary?: {
        total_assessed: number;
        high_risk: number;
        very_high_risk: number;
        low_risk: number;
        moderate_risk: number;
        average_risk: number;
        max_risk: number;
        high_risk_rate: number;
        method_counts: {
          lipid: number;
          waist_height: number;
          waist: number;
        };
        skipped: number;
        note?: string;
      } | null;
    };
  };
}

export default function Dashboard({ filter, stats, hosxp_error }: DashboardProps) {
  const { t } = useTranslation();
  const { auth } = usePage<SharedData>().props;
  const [startDate, setStartDate] = useState(filter?.start_date || '');
  const [endDate, setEndDate] = useState(filter?.end_date || '');
  const [dateError, setDateError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if should show welcome modal (only once per session)
  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      // Small delay to make the animation smoother
      const timer = setTimeout(() => {
        setShowWelcome(true);
        sessionStorage.setItem('hasSeenWelcome', 'true');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    setStartDate(filter?.start_date || '');
    setEndDate(filter?.end_date || '');
  }, [filter]);

  const refreshPdfDownloadUrl = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const url = new URL(e.currentTarget.href);
    url.searchParams.set('_t', Date.now().toString());
    e.currentTarget.href = url.toString();
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');

    if (!startDate || !endDate) {
      setDateError('กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด');
      return;
    }

    if (startDate > endDate) {
      setDateError('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
      return;
    }

    router.get(
      route('dashboard'),
      { start_date: startDate, end_date: endDate },
      { preserveScroll: true, only: ['filter', 'stats', 'hosxp_error'] },
    );
  };

  const filterLabel = filter?.start_date_label && filter?.end_date_label
    ? `${filter.start_date_label} — ${filter.end_date_label}`
    : startDate && endDate
      ? `${formatThaiDateFromIso(startDate)} — ${formatThaiDateFromIso(endDate)}`
      : '';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('th-TH').format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `${new Intl.NumberFormat('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
  };

  const donutColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#84cc16', '#64748b'];
  const departmentDonut = stats?.charts?.department_visits_this_month || [];
  const departmentTotal = departmentDonut.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const departmentYearDonut = stats?.charts?.department_visits_this_year || [];
  const departmentYearTotal = departmentYearDonut.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const yearTrend = stats?.charts?.visits_year_trend || [];
  const maxYearOpd = Math.max(...yearTrend.map((row) => Number(row.opd || 0)), 1);
  const maxYearIpd = Math.max(...yearTrend.map((row) => Number(row.ipd || 0)), 1);
  const maxYearEr = Math.max(...yearTrend.map((row) => Number(row.er || 0)), 1);
  const appointments = stats?.summary?.appointments;
  const appointmentToday = appointments?.today;
  const appointmentPeriod = appointments?.period;
  const appointmentMonthly = appointments?.monthly || [];
  const maxAppointmentMonthly = Math.max(...appointmentMonthly.map((row) => Number(row.scheduled || 0)), 1);

  const renderYearSeriesChart = (
    key: 'opd' | 'ipd' | 'er',
    maxValue: number,
    colorRgb: string,
    gradientId: string,
    glowId: string,
  ) => (
    <div className="relative h-56 rounded-xl p-4" style={{ background: `linear-gradient(to bottom right, ${colorRgb}12, ${colorRgb}08)` }}>
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorRgb} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colorRgb} stopOpacity="0" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="0"
            y1={i * 25}
            x2="100"
            y2={i * 25}
            stroke="rgb(203, 213, 225)"
            strokeWidth="0.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {(() => {
          if (yearTrend.length === 0) return null;
          const pathPoints = yearTrend
            .map((row, index) => {
              const x = yearTrend.length > 1 ? (index / (yearTrend.length - 1)) * 100 : 50;
              const y = 100 - ((Number(row[key] || 0) / maxValue) * 92);
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
          const fillPath = `${pathPoints} L ${yearTrend.length > 1 ? 100 : 50} 100 L 0 100 Z`;
          return (
            <g>
              <path d={fillPath} fill={`url(#${gradientId})`} />
              <path
                d={pathPoints}
                fill="none"
                stroke={colorRgb}
                strokeWidth="0.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                filter={`url(#${glowId})`}
              />
              {yearTrend.map((row, index) => {
                const x = yearTrend.length > 1 ? (index / (yearTrend.length - 1)) * 100 : 50;
                const y = 100 - ((Number(row[key] || 0) / maxValue) * 92);
                return (
                  <circle
                    key={`${key}-${row.label}`}
                    cx={x}
                    cy={y}
                    r="1.1"
                    fill="white"
                    stroke={colorRgb}
                    strokeWidth="0.45"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
          );
        })()}
      </svg>
      <div className="absolute left-0 top-0 flex h-full flex-col justify-between pr-2 text-xs text-gray-500">
        {[4, 3, 2, 1, 0].map((i) => (
          <div key={i} className="text-right">
            {formatNumber(Math.ceil(maxValue / 4) * i)}
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between pt-2 text-xs text-gray-600">
        {yearTrend.map((row) => (
          <div key={`${key}-label-${row.label}`} className="flex flex-col items-center">
            <div className="font-medium">{String(row.label).split(' ')[0]}</div>
            <div className="text-[10px]" style={{ color: colorRgb }}>
              {formatNumber(Number(row[key] || 0))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dashboard" />
      
      {/* Welcome Modal */}
      <WelcomeModal 
        userName={auth.user.name} 
        isOpen={showWelcome} 
        onClose={() => setShowWelcome(false)} 
      />
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900">
        <div className="p-6 space-y-6">
          {/* Header with gradient */}
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-violet-700 via-purple-700 to-violet-800 p-6 text-white shadow-xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-8 w-8" />
                <h1 className="text-3xl font-bold">{t('Dashboard Overview')}</h1>
              </div>
              <p className="text-purple-100">{t('HOSxP System Info')}</p>
            </div>
          </div>

          {/* Date Filter Card */}
          <Card className="shadow-lg border-l-4 border-l-purple-400">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-500" />
                <CardTitle>{t('Data Filter')}</CardTitle>
              </div>
              <CardDescription>{t('Select Date Range')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {t('Start Date')}
                  </Label>
                  <ThaiDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="เลือกวันที่เริ่มต้น"
                    className="w-full max-w-none"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    {t('End Date')}
                  </Label>
                  <ThaiDatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="เลือกวันที่สิ้นสุด"
                    className="w-full max-w-none"
                  />
                </div>
                <Button type="submit" className="bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-800 hover:to-purple-800">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {t('Show Data')}
                </Button>
                {stats?.summary && (
                  <a
                    href={route('dashboard.pdf', { start_date: startDate, end_date: endDate })}
                    onClick={refreshPdfDownloadUrl}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-rose-600 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:from-rose-700 hover:to-orange-700"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    สรุป Dashboard PDF
                  </a>
                )}
              </form>
              {filterLabel && (
                <p className="mt-3 text-sm text-muted-foreground">
                  ช่วงข้อมูล: <span className="font-medium text-foreground">{filterLabel}</span>
                </p>
              )}
              {dateError && (
                <p className="mt-2 text-sm text-red-600">{dateError}</p>
              )}
              {hosxp_error && (
                <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {hosxp_error}
                </p>
              )}
            </CardContent>
          </Card>

          {stats?.summary && (
            <>
              {/* Summary Statistics with gradient cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardTitle className="text-sm font-medium text-blue-900">{t('Outpatients (OPD)')}</CardTitle>
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Stethoscope className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-blue-600">{formatNumber(Number(stats.summary.opd))}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {t('Visits in selected period')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-purple-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardTitle className="text-sm font-medium text-purple-900">{t('Inpatients (IPD)')}</CardTitle>
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Bed className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-purple-600">{formatNumber(Number(stats.summary.ipd))}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {t('Admissions')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-red-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-red-50 to-red-100">
                    <CardTitle className="text-sm font-medium text-red-900">{t('Emergency (ER)')}</CardTitle>
                    <div className="p-2 bg-red-500 rounded-lg">
                      <Ambulance className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-red-600">{formatNumber(Number(stats.summary.er))}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t('Visits')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-green-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-green-50 to-green-100">
                    <CardTitle className="text-sm font-medium text-green-900">{t('Total Cost')}</CardTitle>
                    <div className="p-2 bg-green-500 rounded-lg">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-green-600">{formatCurrency(Number(stats.summary.cost_total))}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {t('In selected period')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-orange-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardTitle className="text-sm font-medium text-orange-900">เบาหวาน (DM)</CardTitle>
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <HeartPulse className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-orange-600">{formatNumber(Number(stats.summary.dm))}</div>
                    <p className="text-xs text-muted-foreground mt-1">ผู้ป่วยไม่ซ้ำ (E10-E19)</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-pink-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-pink-50 to-pink-100">
                    <CardTitle className="text-sm font-medium text-pink-900">ความดันโลหิตสูง (HT)</CardTitle>
                    <div className="p-2 bg-pink-500 rounded-lg">
                      <HeartPulse className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-pink-600">{formatNumber(Number(stats.summary.ht))}</div>
                    <p className="text-xs text-muted-foreground mt-1">ผู้ป่วยไม่ซ้ำ (I10-I19)</p>
                  </CardContent>
                </Card>
              </div>

              {stats.summary.today && (
                <>
                  <div>
                    <div className="mb-3">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">ภาพรวมวันนี้และเดือนนี้</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300">ข้อมูลประจำวันที่ {stats.summary.today.date_label}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-blue-50 to-sky-100">
                          <CardTitle className="text-sm font-medium text-blue-900">ผู้ป่วยนอกวันนี้</CardTitle>
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <Stethoscope className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-3xl font-bold text-blue-600">{formatNumber(Number(stats.summary.today.opd || 0))}</div>
                          <p className="text-xs text-muted-foreground mt-1">Visit จาก ovst วันนี้ (คนละยอดกับการ์ดช่วงวันที่เลือก)</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-purple-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-purple-50 to-violet-100">
                          <CardTitle className="text-sm font-medium text-purple-900">รับใหม่ IPD วันนี้</CardTitle>
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <Bed className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-3xl font-bold text-purple-600">{formatNumber(Number(stats.summary.today.ipd_admit || 0))}</div>
                          <p className="text-xs text-muted-foreground mt-1">จาก ipt.regdate วันนี้</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-red-50 to-rose-100">
                          <CardTitle className="text-sm font-medium text-red-900">ER วันนี้</CardTitle>
                          <div className="p-2 bg-red-500 rounded-lg">
                            <Ambulance className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-3xl font-bold text-red-600">{formatNumber(Number(stats.summary.today.er || 0))}</div>
                          <p className="text-xs text-muted-foreground mt-1">er_regist + main_dep 003</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-teal-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-teal-50 to-cyan-100">
                          <CardTitle className="text-sm font-medium text-teal-900">นัดหมายวันนี้</CardTitle>
                          <div className="p-2 bg-teal-500 rounded-lg">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-3xl font-bold text-teal-600">{formatNumber(Number(appointmentToday?.scheduled || 0))}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            มาตามนัด {formatNumber(Number(appointmentToday?.came || 0))} ราย
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-cyan-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-cyan-50 to-sky-100">
                          <CardTitle className="text-sm font-medium text-cyan-900">ผู้ป่วยส่งต่อวันนี้</CardTitle>
                          <div className="p-2 bg-cyan-500 rounded-lg">
                            <Ambulance className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-3xl font-bold text-cyan-600">{formatNumber(Number(stats.summary.today.refer_out))}</div>
                          <p className="text-xs text-muted-foreground mt-1">จากตาราง referout</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-emerald-50 to-green-100">
                          <CardTitle className="text-sm font-medium text-emerald-900">ค่ารักษาพยาบาล OPD วันนี้</CardTitle>
                          <div className="p-2 bg-emerald-500 rounded-lg">
                            <DollarSign className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(Number(stats.summary.today.opd_cost))}</div>
                          <p className="text-xs text-muted-foreground mt-1">เฉพาะ visit ที่ไม่ใช่ IPD</p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-amber-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-amber-50 to-orange-100">
                          <CardTitle className="text-sm font-medium text-amber-900">ยอดค่าบริการวันนี้</CardTitle>
                          <div className="p-2 bg-amber-500 rounded-lg">
                            <DollarSign className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">ชำระเงินเอง</span>
                            <span className="font-bold text-amber-700">{formatCurrency(Number(stats.summary.today.payment.self_pay))}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">ลูกหนี้/ค้างชำระ</span>
                            <span className="font-bold text-orange-700">
                              {formatCurrency(Number(stats.summary.today.payment.debt) + Number(stats.summary.today.payment.unpaid))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-violet-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-violet-50 to-purple-100">
                          <CardTitle className="text-sm font-medium text-violet-900">เตียงว่างวันนี้</CardTitle>
                          <div className="p-2 bg-violet-500 rounded-lg">
                            <Bed className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-3xl font-bold text-violet-600">{formatNumber(Number(stats.summary.today.beds.free))}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ครอง {formatNumber(Number(stats.summary.today.beds.occupied))} / ทั้งหมด {formatNumber(Number(stats.summary.today.beds.total))} (ไม่รวม Coward)
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-rose-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-rose-50 to-pink-100">
                          <CardTitle className="text-sm font-medium text-rose-900">ครองเตียง / AdjRW เดือนนี้</CardTitle>
                          <div className="p-2 bg-rose-500 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-3xl font-bold text-rose-600">{formatPercent(stats.summary.today.beds.occupancy_rate)}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            AdjRW {formatNumber(Number(stats.summary.today.beds.adjrw_month))}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {appointments && (
                    <Card className="shadow-lg border-t-4 border-t-teal-500">
                      <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-teal-600" />
                              <CardTitle>ข้อมูลผู้ป่วยนัดหมายจาก HOSxP</CardTitle>
                            </div>
                            <CardDescription>
                              จากตาราง oapp โดยใช้วันนัด nextdate และตรวจการมา visit จาก patient_visit / visit_vn / ovst
                              {appointments.note ? ` — ${appointments.note}` : ''}
                            </CardDescription>
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-700 shadow-sm dark:bg-gray-900">
                            อัตรามาตามนัดวันนี้ {formatPercent(appointmentToday?.came_rate ?? null)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-muted-foreground">นัดทั้งหมดวันนี้</p>
                            <div className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
                              {formatNumber(Number(appointmentToday?.scheduled || 0))}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{appointmentToday?.date_label}</p>
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">ผู้ป่วยมาตามนัดวันนี้</p>
                            <div className="mt-2 text-3xl font-bold text-emerald-600">
                              {formatNumber(Number(appointmentToday?.came || 0))}
                            </div>
                            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                              {formatPercent(appointmentToday?.came_rate ?? null)} ของนัดวันนี้
                            </p>
                          </div>
                          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
                            <p className="text-sm text-rose-700 dark:text-rose-300">ผู้ป่วยไม่มาตามนัดวันนี้</p>
                            <div className="mt-2 text-3xl font-bold text-rose-600">
                              {formatNumber(Number(appointmentToday?.not_came || 0))}
                            </div>
                            <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
                              ยังไม่มา/เลยวันนัดแล้ว
                            </p>
                          </div>
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                            <p className="text-sm text-blue-700 dark:text-blue-300">สรุปช่วงวันที่ที่เลือก</p>
                            <div className="mt-2 text-2xl font-bold text-blue-600">
                              {formatNumber(Number(appointmentPeriod?.came || 0))} / {formatNumber(Number(appointmentPeriod?.scheduled || 0))}
                            </div>
                            <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300/80">
                              ไม่มาตามนัด {formatNumber(Number(appointmentPeriod?.not_came || 0))} ราย
                            </p>
                          </div>
                        </div>

                        {appointmentMonthly.length > 0 && (
                          <div>
                            <div className="mb-3 flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">แนวโน้มนัดหมายรายเดือน</h3>
                              <span className="text-xs text-muted-foreground">เขียว = มาตามนัด, แดง = ไม่มาตามนัด</span>
                            </div>
                            <div className="space-y-3">
                              {appointmentMonthly.slice(-6).map((row) => {
                                const scheduled = Number(row.scheduled || 0);
                                const came = Number(row.came || 0);
                                const notCame = Number(row.not_came || 0);
                                const width = Math.max(6, (scheduled / maxAppointmentMonthly) * 100);
                                const cameWidth = scheduled > 0 ? (came / scheduled) * 100 : 0;
                                const notCameWidth = scheduled > 0 ? (notCame / scheduled) * 100 : 0;

                                return (
                                  <div key={`${row.y}-${row.m}`} className="grid gap-2 md:grid-cols-[110px_1fr_170px] md:items-center">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{row.label}</div>
                                    <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                      <div className="flex h-full rounded-full" style={{ width: `${width}%` }}>
                                        <div className="bg-emerald-500" style={{ width: `${cameWidth}%` }} />
                                        <div className="bg-rose-500" style={{ width: `${notCameWidth}%` }} />
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground md:text-right">
                                      มา {formatNumber(came)} / ไม่มา {formatNumber(notCame)} / นัด {formatNumber(scheduled)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4 xl:grid-cols-2">
                    {departmentDonut.length > 0 && (
                      <Card className="shadow-lg border-t-4 border-t-indigo-500">
                        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                          <div className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-indigo-600" />
                            <CardTitle>การเข้ารับบริการเดือนนี้แยกตามแผนก</CardTitle>
                          </div>
                          <CardDescription>สัดส่วน OPD visit ตาม main department (เดือนปัจจุบัน)</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
                            <div className="relative mx-auto h-56 w-56">
                              <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
                                {(() => {
                                  let offset = 25;
                                  return departmentDonut.map((row, index) => {
                                    const value = departmentTotal > 0 ? (Number(row.total) / departmentTotal) * 100 : 0;
                                    const segment = (
                                      <circle
                                        key={row.department}
                                        cx="21"
                                        cy="21"
                                        r="15.915"
                                        fill="transparent"
                                        stroke={donutColors[index % donutColors.length]}
                                        strokeWidth="6"
                                        strokeDasharray={`${value} ${100 - value}`}
                                        strokeDashoffset={offset}
                                      />
                                    );
                                    offset -= value;
                                    return segment;
                                  });
                                })()}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-muted-foreground">รวมเดือนนี้</span>
                                <span className="text-2xl font-bold text-indigo-700">{formatNumber(departmentTotal)}</span>
                                <span className="text-xs text-muted-foreground">visits</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {departmentDonut.map((row, index) => {
                                const pct = departmentTotal > 0 ? (Number(row.total) / departmentTotal) * 100 : 0;
                                return (
                                  <div key={row.department} className="space-y-1">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                                        <span className="truncate font-medium">{row.department}</span>
                                      </div>
                                      <span className="whitespace-nowrap font-semibold text-indigo-700">
                                        {formatNumber(Number(row.total))} ({pct.toFixed(1)}%)
                                      </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="h-full rounded-full"
                                        style={{ width: `${pct}%`, backgroundColor: donutColors[index % donutColors.length] }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {departmentYearDonut.length > 0 && (
                      <Card className="shadow-lg border-t-4 border-t-teal-500">
                        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
                          <div className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-teal-600" />
                            <CardTitle>การเข้ารับบริการปีนี้แยกตามแผนก</CardTitle>
                          </div>
                          <CardDescription>สัดส่วน OPD visit ตาม main department (ตั้งแต่ต้นปีถึงวันนี้)</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
                            <div className="relative mx-auto h-56 w-56">
                              <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
                                {(() => {
                                  let offset = 25;
                                  return departmentYearDonut.map((row, index) => {
                                    const value = departmentYearTotal > 0 ? (Number(row.total) / departmentYearTotal) * 100 : 0;
                                    const segment = (
                                      <circle
                                        key={`year-${row.department}`}
                                        cx="21"
                                        cy="21"
                                        r="15.915"
                                        fill="transparent"
                                        stroke={donutColors[index % donutColors.length]}
                                        strokeWidth="6"
                                        strokeDasharray={`${value} ${100 - value}`}
                                        strokeDashoffset={offset}
                                      />
                                    );
                                    offset -= value;
                                    return segment;
                                  });
                                })()}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-xs text-muted-foreground">รวมปีนี้</span>
                                <span className="text-2xl font-bold text-teal-700">{formatNumber(departmentYearTotal)}</span>
                                <span className="text-xs text-muted-foreground">visits</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {departmentYearDonut.map((row, index) => {
                                const pct = departmentYearTotal > 0 ? (Number(row.total) / departmentYearTotal) * 100 : 0;
                                return (
                                  <div key={`year-list-${row.department}`} className="space-y-1">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                                        <span className="truncate font-medium">{row.department}</span>
                                      </div>
                                      <span className="whitespace-nowrap font-semibold text-teal-700">
                                        {formatNumber(Number(row.total))} ({pct.toFixed(1)}%)
                                      </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className="h-full rounded-full"
                                        style={{ width: `${pct}%`, backgroundColor: donutColors[index % donutColors.length] }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                    {yearTrend.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-800">แนวโน้มการเข้ารับบริการทั้งหมดในปีนี้</h3>
                          <p className="text-sm text-muted-foreground">แยกกราฟ OPD / IPD / ER ตามแหล่งข้อมูลของแต่ละประเภท</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <Card className="shadow-lg border-t-4 border-t-blue-500">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 pb-3">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-base">OPD ปีนี้</CardTitle>
                              </div>
                              <CardDescription>ผู้ป่วยนอก (ไม่รวม ER)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-blue-50 p-3">
                                  <div className="text-xs font-medium text-blue-600">เฉลี่ย/เดือน</div>
                                  <div className="text-lg font-bold text-blue-700">
                                    {formatNumber(Math.round(yearTrend.reduce((sum, row) => sum + Number(row.opd), 0) / yearTrend.length))}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-blue-50 p-3">
                                  <div className="text-xs font-medium text-blue-600">รวมปีนี้</div>
                                  <div className="text-lg font-bold text-blue-700">
                                    {formatNumber(yearTrend.reduce((sum, row) => sum + Number(row.opd), 0))}
                                  </div>
                                </div>
                              </div>
                              {renderYearSeriesChart('opd', maxYearOpd, 'rgb(59, 130, 246)', 'yearOpdGradient', 'glowYearOpd')}
                            </CardContent>
                          </Card>

                          <Card className="shadow-lg border-t-4 border-t-purple-500">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 pb-3">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-purple-600" />
                                <CardTitle className="text-base">IPD ปีนี้</CardTitle>
                              </div>
                              <CardDescription>ผู้ป่วยใน (admission)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-purple-50 p-3">
                                  <div className="text-xs font-medium text-purple-600">เฉลี่ย/เดือน</div>
                                  <div className="text-lg font-bold text-purple-700">
                                    {formatNumber(Math.round(yearTrend.reduce((sum, row) => sum + Number(row.ipd), 0) / yearTrend.length))}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-purple-50 p-3">
                                  <div className="text-xs font-medium text-purple-600">รวมปีนี้</div>
                                  <div className="text-lg font-bold text-purple-700">
                                    {formatNumber(yearTrend.reduce((sum, row) => sum + Number(row.ipd), 0))}
                                  </div>
                                </div>
                              </div>
                              {renderYearSeriesChart('ipd', maxYearIpd, 'rgb(168, 85, 247)', 'yearIpdGradient', 'glowYearIpd')}
                            </CardContent>
                          </Card>

                          <Card className="shadow-lg border-t-4 border-t-red-500">
                            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 pb-3">
                              <div className="flex items-center gap-2">
                                <Ambulance className="h-5 w-5 text-red-600" />
                                <CardTitle className="text-base">ER ปีนี้</CardTitle>
                              </div>
                              <CardDescription>ฉุกเฉิน (er_regist)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-red-50 p-3">
                                  <div className="text-xs font-medium text-red-600">เฉลี่ย/เดือน</div>
                                  <div className="text-lg font-bold text-red-700">
                                    {formatNumber(Math.round(yearTrend.reduce((sum, row) => sum + Number(row.er), 0) / yearTrend.length))}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-red-50 p-3">
                                  <div className="text-xs font-medium text-red-600">รวมปีนี้</div>
                                  <div className="text-lg font-bold text-red-700">
                                    {formatNumber(yearTrend.reduce((sum, row) => sum + Number(row.er), 0))}
                                  </div>
                                </div>
                              </div>
                              {renderYearSeriesChart('er', maxYearEr, 'rgb(239, 68, 68)', 'yearErGradient', 'glowYearEr')}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                </>
              )}

              {/* Top 10 Diagnoses with Progress Bars */}
              <div className="grid gap-4 md:grid-cols-2">
              {stats.charts?.top10_opd && stats.charts.top10_opd.length > 0 && (
                <Card className="shadow-lg border-t-4 border-t-amber-500">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-amber-600" />
                      <CardTitle>10 อันดับโรคที่พบบ่อย (OPD)</CardTitle>
                    </div>
                    <CardDescription>รหัส ICD-10 และจำนวนครั้ง</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {stats.charts.top10_opd.map((disease, index) => {
                        const maxCount = stats.charts?.top10_opd?.[0]?.total || 1;
                        const percentage = (disease.total / maxCount) * 100;
                        const colors = [
                          'from-red-400 to-red-600',
                          'from-orange-400 to-orange-600',
                          'from-amber-400 to-amber-600',
                          'from-yellow-400 to-yellow-600',
                          'from-lime-400 to-lime-600',
                          'from-green-400 to-green-600',
                          'from-emerald-400 to-emerald-600',
                          'from-teal-400 to-teal-600',
                          'from-cyan-400 to-cyan-600',
                          'from-sky-400 to-sky-600',
                        ];
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium flex items-center gap-2 dark:text-gray-200">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold dark:text-gray-200">
                                  {index + 1}
                                </span>
                                {String(disease.icd10)}
                              </span>
                              <span className="text-muted-foreground font-semibold">{formatNumber(disease.total)}</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${colors[index]} rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.charts?.costs_yearly_last5 && stats.charts.costs_yearly_last5.length > 0 && (
                <Card className="shadow-lg border-t-4 border-t-emerald-500">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      <CardTitle>ค่าใช้จ่ายรายปี (5 ปีล่าสุด)</CardTitle>
                    </div>
                    <CardDescription>ยอดรวมต่อปี พร้อมแนวโน้ม</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {stats.charts.costs_yearly_last5.map((cost, index) => {
                        const maxCost = Math.max(...(stats.charts?.costs_yearly_last5?.map(c => c.total) || [1]));
                        const percentage = (cost.total / maxCost) * 100;
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium flex items-center gap-2 dark:text-gray-200">
                                <Calendar className="h-4 w-4 text-emerald-600" />
                                ปี {Number(cost.y) + 543}
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(cost.total)}</span>
                            </div>
                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>

              {/* Thai ASCVD Risk Charts */}
              {(stats.charts?.cv_risk_high_monthly || stats.charts?.cv_risk_scores_monthly) && (
              <div className="space-y-4">
                {/* Section Header with Download Button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Thai ASCVD Risk Assessment</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">การประเมินความเสี่ยงโรคหัวใจและหลอดเลือด</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={route('dashboard.pdf', { start_date: startDate, end_date: endDate })}
                      onClick={refreshPdfDownloadUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-lg hover:from-rose-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <FileDown className="h-4 w-4" />
                      <span>สรุป Dashboard PDF</span>
                    </a>
                    <a
                      href={route('dashboard.cv-risk-report', { format: 'excel', start_date: startDate, end_date: endDate })}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                      <FileDown className="h-4 w-4" />
                      <span>รายชื่อ ASCVD Excel</span>
                    </a>
                  </div>
                </div>

                {stats.charts.cv_risk_summary && (
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-l-4 border-l-blue-500 shadow-md">
                      <CardContent className="pt-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">ประเมินได้</div>
                        <div className="mt-1 text-3xl font-bold text-blue-700 dark:text-blue-300">
                          {formatNumber(stats.charts.cv_risk_summary.total_assessed)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">คนไทยอายุ 35-70 ปี</div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-rose-500 shadow-md">
                      <CardContent className="pt-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">เสี่ยงสูงขึ้นไป</div>
                        <div className="mt-1 text-3xl font-bold text-rose-700 dark:text-rose-300">
                          {formatNumber(stats.charts.cv_risk_summary.high_risk)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {stats.charts.cv_risk_summary.high_risk_rate}% ของผู้ที่ประเมินได้
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500 shadow-md">
                      <CardContent className="pt-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">เสี่ยงสูงมาก</div>
                        <div className="mt-1 text-3xl font-bold text-orange-700 dark:text-orange-300">
                          {formatNumber(stats.charts.cv_risk_summary.very_high_risk)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Thai CV Risk &gt; 30%</div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500 shadow-md">
                      <CardContent className="pt-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">เฉลี่ย / สูงสุด</div>
                        <div className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                          {stats.charts.cv_risk_summary.average_risk}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          สูงสุด {stats.charts.cv_risk_summary.max_risk}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {stats.charts.cv_risk_summary?.note && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
                    {stats.charts.cv_risk_summary.note} โดยใช้ Total Cholesterol เมื่อมีข้อมูล และ fallback เป็นรอบเอว/ส่วนสูงเมื่อไม่มีผลเลือด
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                {/* High Risk Patients Monthly - Line Chart */}
                {stats.charts.cv_risk_high_monthly && stats.charts.cv_risk_high_monthly.length > 0 && (
                  <Card className="shadow-lg border-t-4 border-t-rose-500">
                    <CardHeader className="bg-gradient-to-r from-rose-50 to-red-50">
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-rose-600" />
                        <CardTitle>ผู้ป่วยกลุ่มเสี่ยง CVD สูง</CardTitle>
                      </div>
                      <CardDescription>แนวโน้มจำนวนผู้ป่วยที่มีความเสี่ยงสูง (≥20%) รายเดือน</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="relative h-80">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
                          {(() => {
                            const maxValue = Math.max(...(stats.charts.cv_risk_high_monthly.map((r: any) => r.total) || [1]));
                            const step = Math.ceil(maxValue / 4);
                            return [4, 3, 2, 1, 0].map((i) => (
                              <div key={i} className="text-right pr-2">{step * i}</div>
                            ));
                          })()}
                        </div>

                        {/* Chart area */}
                        <div className="absolute left-12 right-0 top-0 bottom-8">
                          {/* Grid lines */}
                          <div className="absolute inset-0 flex flex-col justify-between">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div key={i} className="border-b border-gray-200 dark:border-gray-700"></div>
                            ))}
                          </div>

                          {/* Line chart with gradient fill */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="roseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgb(251, 113, 133)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="rgb(251, 113, 133)" stopOpacity="0.05" />
                              </linearGradient>
                              <filter id="glow">
                                <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            
                            {(() => {
                              const data = stats.charts.cv_risk_high_monthly;
                              if (!data || data.length === 0) return null;
                              
                              const maxValue = Math.max(...data.map((r: any) => r.total), 1);
                              const dataLength = data.length;
                              
                              // Calculate points in viewBox coordinates (0-100)
                              const pathPoints = data.map((r: any, i: number) => {
                                const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                                const y = 100 - ((r.total / maxValue) * 100);
                                return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                              }).join(' ');
                              
                              // Create closed path for fill
                              const firstX = dataLength > 1 ? 0 : 50;
                              const lastX = dataLength > 1 ? 100 : 50;
                              const fillPath = `${pathPoints} L ${lastX} 100 L ${firstX} 100 Z`;
                              
                              return (
                                <>
                                  {/* Filled area */}
                                  <path
                                    d={fillPath}
                                    fill="url(#roseGradient)"
                                    className="transition-all duration-700"
                                  />
                                  {/* Line */}
                                  <path
                                    d={pathPoints}
                                    fill="none"
                                    stroke="rgb(244, 63, 94)"
                                    strokeWidth="0.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    filter="url(#glow)"
                                    className="transition-all duration-700"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                  {/* Data points */}
                                  {data.map((r: any, i: number) => {
                                    const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                                    const y = 100 - ((r.total / maxValue) * 100);
                                    return (
                                      <g key={i}>
                                        <circle
                                          cx={x}
                                          cy={y}
                                          r="1"
                                          fill="white"
                                          stroke="rgb(244, 63, 94)"
                                          strokeWidth="0.3"
                                          className="transition-all duration-300"
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <circle
                                          cx={x}
                                          cy={y}
                                          r="2"
                                          fill="rgb(244, 63, 94)"
                                          opacity="0"
                                          className="animate-ping"
                                          style={{ animationDelay: `${i * 100}ms`, animationDuration: '2s' }}
                                        />
                                      </g>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </svg>
                        </div>

                        {/* X-axis labels */}
                        <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between items-start text-xs text-gray-500 dark:text-gray-400">
                          {stats.charts.cv_risk_high_monthly.map((risk: any, index: number) => (
                            <div key={index} className="flex flex-col items-center">
                              <div className="font-medium text-rose-600">{formatNumber(Number(risk.total))}</div>
                              <div className="text-[10px]">{String(risk.label || '').split(' ')[0] || `${risk.m}/${risk.y}`}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary stats */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4">
                        {(() => {
                          const data = stats.charts.cv_risk_high_monthly;
                          const total = data.reduce((sum: number, r: any) => sum + r.total, 0);
                          const avg = Math.round(total / data.length);
                          const max = Math.max(...data.map((r: any) => r.total));
                          const trend = data.length > 1 ? data[data.length - 1].total - data[0].total : 0;
                          
                          return (
                            <>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-rose-600">{formatNumber(avg)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">เฉลี่ย/เดือน</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatNumber(max)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">สูงสุด</div>
                              </div>
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${trend >= 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {trend >= 0 ? '+' : ''}{formatNumber(trend)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">แนวโน้ม</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CV Risk Score Distribution */}
                {stats.charts.cv_risk_scores_monthly && stats.charts.cv_risk_scores_monthly.length > 0 && (
                  <Card className="shadow-lg border-t-4 border-t-violet-500">
                    <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-violet-600" />
                        <CardTitle>การกระจายคะแนนความเสี่ยง CVD</CardTitle>
                      </div>
                      <CardDescription>แบ่งตามระดับความเสี่ยง (0-9%, 10-19%, 20-29%, 30-39%, 40%+)</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {stats.charts.cv_risk_scores_monthly.slice(-3).map((dist: any, index: number) => {
                          const total = (dist.s0_9 || 0) + (dist.s10_19 || 0) + (dist.s20_29 || 0) + (dist.s30_39 || 0) + (dist.s40p || 0);
                          
                          return (
                            <div key={index} className="space-y-3">
                              <div className="font-medium text-sm text-gray-700 dark:text-gray-200">
                                {String(dist.label || `${dist.m}/${dist.y}`)} (รวม {total} คน)
                              </div>
                              
                              {/* 0-9% - Low Risk (Green) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-green-600 dark:text-green-400">0-9% (เสี่ยงต่ำ)</span>
                                  <span className="font-semibold dark:text-gray-200">{Number(dist.s0_9 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s0_9 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 10-19% - Moderate Risk (Yellow) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-yellow-600 dark:text-yellow-400">10-19% (เสี่ยงปานกลาง)</span>
                                  <span className="font-semibold dark:text-gray-200">{Number(dist.s10_19 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s10_19 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 20-29% - High Risk (Orange) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-orange-600 dark:text-orange-400">20-29% (เสี่ยงสูง)</span>
                                  <span className="font-semibold dark:text-gray-200">{Number(dist.s20_29 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s20_29 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 30-39% - Very High Risk (Red) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-red-600 dark:text-red-400">30-39% (เสี่ยงสูงมาก)</span>
                                  <span className="font-semibold dark:text-gray-200">{Number(dist.s30_39 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s30_39 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 40%+ - Critical Risk (Dark Red) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-rose-700 dark:text-rose-400">40%+ (วิกฤต)</span>
                                  <span className="font-semibold dark:text-gray-200">{Number(dist.s40p || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-rose-500 to-rose-700 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s40p || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
                </div>
              </div>
            )}
          </>
        )}

        {/* No Data Message */}
        {!stats?.summary && !hosxp_error && (
          <Card className="shadow-lg border-l-4 border-l-gray-400">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-500" />
                <CardTitle>ไม่พบข้อมูล</CardTitle>
              </div>
              <CardDescription>
                กรุณาเลือกช่วงวันที่เพื่อแสดงสถิติ หรือตรวจสอบการเชื่อมต่อกับฐานข้อมูล HOSxP
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        </div>
      </div>
    </AppLayout>
  );
}

