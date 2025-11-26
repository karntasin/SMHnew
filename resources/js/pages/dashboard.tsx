import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
];

interface DashboardProps {
  filter?: {
    start_date: string;
    end_date: string;
  };
  stats?: {
    summary?: {
      opd: number;
      ipd: number;
      er: number;
      cost_total: number;
      dm: number;
      ht: number;
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
    };
  };
}

export default function Dashboard({ filter, stats }: DashboardProps) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(filter?.start_date || '');
  const [endDate, setEndDate] = useState(filter?.end_date || '');

  useEffect(() => {
    setStartDate(filter?.start_date || '');
    setEndDate(filter?.end_date || '');
  }, [filter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/dashboard', { start_date: startDate, end_date: endDate }, { preserveScroll: true });
  };

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

  // Calculate max value for chart scaling
  const maxOpdVisits = stats?.charts?.visits_monthly 
    ? Math.max(...stats.charts.visits_monthly.map(v => v.opd))
    : 100;
  
  const maxIpdVisits = stats?.charts?.visits_monthly 
    ? Math.max(...stats.charts.visits_monthly.map(v => v.ipd))
    : 100;

  const maxErVisits = stats?.charts?.visits_monthly 
    ? Math.max(...stats.charts.visits_monthly.map(v => v.er))
    : 100;

  // Debug Thai ASCVD data
  console.log('Dashboard stats:', stats);
  console.log('CV Risk High Monthly:', stats?.charts?.cv_risk_high_monthly);
  console.log('CV Risk High Monthly LENGTH:', stats?.charts?.cv_risk_high_monthly?.length);
  console.log('CV Risk Scores Monthly:', stats?.charts?.cv_risk_scores_monthly);
  console.log('CV Risk Scores Monthly LENGTH:', stats?.charts?.cv_risk_scores_monthly?.length);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dashboard" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="p-6 space-y-6">
          {/* Header with gradient */}
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-8 w-8" />
                <h1 className="text-3xl font-bold">{t('Dashboard Overview')}</h1>
              </div>
              <p className="text-blue-100">{t('HOSxP System Info')}</p>
            </div>
          </div>

          {/* Date Filter Card */}
          <Card className="shadow-lg border-l-4 border-l-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                <CardTitle>{t('Data Filter')}</CardTitle>
              </div>
              <CardDescription>{t('Select Date Range')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="start_date" className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {t('Start Date')}
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="end_date" className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    {t('End Date')}
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {t('Show Data')}
                </Button>
              </form>
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
                    <p className="text-xs text-muted-foreground mt-1">การวินิจฉัย (E10-E14)</p>
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
                    <p className="text-xs text-muted-foreground mt-1">การวินิจฉัย (I10-I15)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Visits Line Charts */}
              {stats.charts?.visits_monthly && stats.charts.visits_monthly.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* OPD + IPD Chart */}
                  <Card className="shadow-lg border-t-4 border-t-blue-500">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <CardTitle>OPD + IPD รายเดือน</CardTitle>
                      </div>
                      <CardDescription>สถิติผู้ป่วยนอกและผู้ป่วยใน</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-xs text-blue-600 font-medium mb-1">OPD เฉลี่ย/เดือน</div>
                          <div className="text-xl font-bold text-blue-700">
                            {formatNumber(Math.round(
                              stats.charts.visits_monthly.slice(-6).reduce((sum, v) => sum + v.opd, 0) / 
                              Math.min(6, stats.charts.visits_monthly.slice(-6).length)
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="text-xs text-purple-600 font-medium mb-1">IPD เฉลี่ย/เดือน</div>
                          <div className="text-xl font-bold text-purple-700">
                            {formatNumber(Math.round(
                              stats.charts.visits_monthly.slice(-6).reduce((sum, v) => sum + v.ipd, 0) / 
                              Math.min(6, stats.charts.visits_monthly.slice(-6).length)
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Line Chart */}
                      <div className="relative h-64 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-xl p-4">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
                            </linearGradient>
                            <filter id="glowBlue">
                              <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                            <filter id="glowPurple">
                              <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Grid lines */}
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

                          {/* OPD Line */}
                          {(() => {
                            const data = stats.charts.visits_monthly.slice(-6);
                            const maxValue = Math.max(...data.map(v => v.opd));
                            const dataLength = data.length;
                            
                            if (dataLength === 0) return null;

                            const pathPoints = data.map((v, i) => {
                              const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                              const y = 100 - ((v.opd / maxValue) * 100);
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ');

                            const fillPath = `${pathPoints} L ${dataLength > 1 ? 100 : 50} 100 L 0 100 Z`;

                            return (
                              <g>
                                <path d={fillPath} fill="url(#blueGradient)" />
                                <path
                                  d={pathPoints}
                                  fill="none"
                                  stroke="rgb(59, 130, 246)"
                                  strokeWidth="0.5"
                                  vectorEffect="non-scaling-stroke"
                                  filter="url(#glowBlue)"
                                />
                                {data.map((v, i) => {
                                  const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                                  const y = 100 - ((v.opd / maxValue) * 100);
                                  return (
                                    <circle
                                      key={i}
                                      cx={x}
                                      cy={y}
                                      r="1"
                                      fill="white"
                                      stroke="rgb(59, 130, 246)"
                                      strokeWidth="0.5"
                                      vectorEffect="non-scaling-stroke"
                                      className="animate-ping"
                                      style={{
                                        animationDelay: `${i * 100}ms`,
                                        animationDuration: '2s',
                                        animationIterationCount: 'infinite',
                                      }}
                                    />
                                  );
                                })}
                              </g>
                            );
                          })()}

                          {/* IPD Line */}
                          {(() => {
                            const data = stats.charts.visits_monthly.slice(-6);
                            const maxValue = Math.max(...data.map(v => v.ipd));
                            const dataLength = data.length;
                            
                            if (dataLength === 0) return null;

                            const pathPoints = data.map((v, i) => {
                              const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                              const y = 100 - ((v.ipd / maxValue) * 100);
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ');

                            const fillPath = `${pathPoints} L ${dataLength > 1 ? 100 : 50} 100 L 0 100 Z`;

                            return (
                              <g>
                                <path d={fillPath} fill="url(#purpleGradient)" />
                                <path
                                  d={pathPoints}
                                  fill="none"
                                  stroke="rgb(168, 85, 247)"
                                  strokeWidth="0.5"
                                  vectorEffect="non-scaling-stroke"
                                  filter="url(#glowPurple)"
                                  strokeDasharray="2,2"
                                />
                                {data.map((v, i) => {
                                  const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                                  const y = 100 - ((v.ipd / maxValue) * 100);
                                  return (
                                    <circle
                                      key={i}
                                      cx={x}
                                      cy={y}
                                      r="1"
                                      fill="white"
                                      stroke="rgb(168, 85, 247)"
                                      strokeWidth="0.5"
                                      vectorEffect="non-scaling-stroke"
                                      className="animate-ping"
                                      style={{
                                        animationDelay: `${i * 100 + 50}ms`,
                                        animationDuration: '2s',
                                        animationIterationCount: 'infinite',
                                      }}
                                    />
                                  );
                                })}
                              </g>
                            );
                          })()}
                        </svg>

                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                          {(() => {
                            const data = stats.charts.visits_monthly.slice(-6);
                            const maxValueOpd = Math.max(...data.map(v => v.opd));
                            const maxValueIpd = Math.max(...data.map(v => v.ipd));
                            const maxValue = Math.max(maxValueOpd, maxValueIpd);
                            const step = Math.ceil(maxValue / 4);
                            
                            return [4, 3, 2, 1, 0].map((i) => (
                              <div key={i} className="text-right">{formatNumber(step * i)}</div>
                            ));
                          })()}
                        </div>

                        {/* X-axis labels */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 pt-2">
                          {stats.charts.visits_monthly.slice(-6).map((v, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <div className="font-medium">{String(v.label)}</div>
                              <div className="text-[10px] text-blue-600">OPD: {formatNumber(Number(v.opd))}</div>
                              <div className="text-[10px] text-purple-600">IPD: {formatNumber(Number(v.ipd))}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-0.5 bg-blue-500"></div>
                          <span className="text-sm text-gray-600">OPD</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-0.5 bg-purple-500 border-dashed"></div>
                          <span className="text-sm text-gray-600">IPD</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ER Chart */}
                  <Card className="shadow-lg border-t-4 border-t-red-500">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
                      <div className="flex items-center gap-2">
                        <Ambulance className="h-5 w-5 text-red-600" />
                        <CardTitle>ฉุกเฉิน (ER) รายเดือน</CardTitle>
                      </div>
                      <CardDescription>สถิติการรับบริการฉุกเฉิน</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="p-3 bg-red-50 rounded-lg">
                          <div className="text-xs text-red-600 font-medium mb-1">เฉลี่ย/เดือน</div>
                          <div className="text-xl font-bold text-red-700">
                            {formatNumber(Math.round(
                              stats.charts.visits_monthly.slice(-6).reduce((sum, v) => sum + v.er, 0) / 
                              Math.min(6, stats.charts.visits_monthly.slice(-6).length)
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="text-xs text-orange-600 font-medium mb-1">สูงสุด</div>
                          <div className="text-xl font-bold text-orange-700">
                            {formatNumber(Math.max(...stats.charts.visits_monthly.slice(-6).map(v => v.er)))}
                          </div>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-lg">
                          <div className="text-xs text-amber-600 font-medium mb-1">แนวโน้ม</div>
                          <div className="text-xl font-bold text-amber-700">
                            {(() => {
                              const data = stats.charts.visits_monthly.slice(-6);
                              if (data.length < 2) return '-';
                              const first = data[0].er;
                              const last = data[data.length - 1].er;
                              const change = last - first;
                              return change > 0 ? `+${formatNumber(change)}` : formatNumber(change);
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Line Chart */}
                      <div className="relative h-64 bg-gradient-to-br from-red-50/50 to-orange-50/50 rounded-xl p-4">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
                            </linearGradient>
                            <filter id="glowRed">
                              <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Grid lines */}
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

                          {/* ER Line */}
                          {(() => {
                            const data = stats.charts.visits_monthly.slice(-6);
                            const maxValue = Math.max(...data.map(v => v.er));
                            const dataLength = data.length;
                            
                            if (dataLength === 0) return null;

                            const pathPoints = data.map((v, i) => {
                              const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                              const y = 100 - ((v.er / maxValue) * 100);
                              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ');

                            const fillPath = `${pathPoints} L ${dataLength > 1 ? 100 : 50} 100 L 0 100 Z`;

                            return (
                              <g>
                                <path d={fillPath} fill="url(#redGradient)" />
                                <path
                                  d={pathPoints}
                                  fill="none"
                                  stroke="rgb(239, 68, 68)"
                                  strokeWidth="0.5"
                                  vectorEffect="non-scaling-stroke"
                                  filter="url(#glowRed)"
                                />
                                {data.map((v, i) => {
                                  const x = dataLength > 1 ? (i / (dataLength - 1)) * 100 : 50;
                                  const y = 100 - ((v.er / maxValue) * 100);
                                  return (
                                    <circle
                                      key={i}
                                      cx={x}
                                      cy={y}
                                      r="1"
                                      fill="white"
                                      stroke="rgb(239, 68, 68)"
                                      strokeWidth="0.5"
                                      vectorEffect="non-scaling-stroke"
                                      className="animate-ping"
                                      style={{
                                        animationDelay: `${i * 100}ms`,
                                        animationDuration: '2s',
                                        animationIterationCount: 'infinite',
                                      }}
                                    />
                                  );
                                })}
                              </g>
                            );
                          })()}
                        </svg>

                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                          {(() => {
                            const data = stats.charts.visits_monthly.slice(-6);
                            const maxValue = Math.max(...data.map(v => v.er));
                            const step = Math.ceil(maxValue / 4);
                            
                            return [4, 3, 2, 1, 0].map((i) => (
                              <div key={i} className="text-right">{formatNumber(step * i)}</div>
                            ));
                          })()}
                        </div>

                        {/* X-axis labels */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600 pt-2">
                          {stats.charts.visits_monthly.slice(-6).map((v, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <div className="font-medium">{String(v.label)}</div>
                              <div className="text-[10px] text-red-600">{formatNumber(Number(v.er))} ครั้ง</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
                              <span className="font-medium flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold">
                                  {index + 1}
                                </span>
                                {String(disease.icd10)}
                              </span>
                              <span className="text-muted-foreground font-semibold">{formatNumber(disease.total)}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
                              <span className="font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-emerald-600" />
                                ปี {Number(cost.y) + 543}
                              </span>
                              <span className="text-emerald-700 font-bold">{formatCurrency(cost.total)}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
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
                    <h2 className="text-2xl font-bold text-gray-900">Thai ASCVD Risk Assessment</h2>
                    <p className="text-sm text-gray-600 mt-1">การประเมินความเสี่ยงโรคหัวใจและหลอดเลือด</p>
                  </div>
                  <a
                    href={route('dashboard.cv-risk-report', { format: 'excel' })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <FileDown className="h-4 w-4" />
                    <span>ดาวน์โหลดรายงาน Excel</span>
                  </a>
                </div>

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
                        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
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
                              <div key={i} className="border-b border-gray-200"></div>
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
                        <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between items-start text-xs text-gray-500">
                          {stats.charts.cv_risk_high_monthly.map((risk: any, index: number) => (
                            <div key={index} className="flex flex-col items-center">
                              <div className="font-medium text-rose-600">{formatNumber(Number(risk.total))}</div>
                              <div className="text-[10px]">{String(risk.label || '').split(' ')[0] || `${risk.m}/${risk.y}`}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary stats */}
                      <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
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
                                <div className="text-xs text-gray-500">เฉลี่ย/เดือน</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{formatNumber(max)}</div>
                                <div className="text-xs text-gray-500">สูงสุด</div>
                              </div>
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${trend >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {trend >= 0 ? '+' : ''}{formatNumber(trend)}
                                </div>
                                <div className="text-xs text-gray-500">แนวโน้ม</div>
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
                              <div className="font-medium text-sm text-gray-700">
                                {String(dist.label || `${dist.m}/${dist.y}`)} (รวม {total} คน)
                              </div>
                              
                              {/* 0-9% - Low Risk (Green) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-green-600">0-9% (เสี่ยงต่ำ)</span>
                                  <span className="font-semibold">{Number(dist.s0_9 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s0_9 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 10-19% - Moderate Risk (Yellow) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-yellow-600">10-19% (เสี่ยงปานกลาง)</span>
                                  <span className="font-semibold">{Number(dist.s10_19 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s10_19 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 20-29% - High Risk (Orange) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-orange-600">20-29% (เสี่ยงสูง)</span>
                                  <span className="font-semibold">{Number(dist.s20_29 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s20_29 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 30-39% - Very High Risk (Red) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-red-600">30-39% (เสี่ยงสูงมาก)</span>
                                  <span className="font-semibold">{Number(dist.s30_39 || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                                    style={{ width: total > 0 ? `${((dist.s30_39 || 0) / total) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>

                              {/* 40%+ - Critical Risk (Dark Red) */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-rose-700">40%+ (วิกฤต)</span>
                                  <span className="font-semibold">{Number(dist.s40p || 0)} คน</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
        {!stats?.summary && (
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

