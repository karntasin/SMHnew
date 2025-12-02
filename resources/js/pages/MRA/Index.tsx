import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCcw,
  ClipboardList,
  TrendingUp,
  Activity,
  Sparkles,
  ListFilter,
  CalendarRange,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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

  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '/quality' },
    { title: 'MRA', href: '/mra' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            รอตรวจสอบ
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
            <RefreshCcw className="h-3 w-3 mr-1" />
            กำลังตรวจสอบ
          </Badge>
        );
      case 'audited':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            ตรวจสอบแล้ว
          </Badge>
        );
      case 'corrected':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            แก้ไขแล้ว
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreBadge = (percentage: number) => {
    const pct = Number(percentage || 0);
    if (pct >= 90) {
      return <Badge className="bg-green-500 hover:bg-green-600">{pct.toFixed(1)}%</Badge>;
    } else if (pct >= 70) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">{pct.toFixed(1)}%</Badge>;
    } else {
      return <Badge className="bg-red-500 hover:bg-red-600">{pct.toFixed(1)}%</Badge>;
    }
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
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="รายการตรวจสอบเวชระเบียน" />

      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <ClipboardList className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  รายการตรวจสอบเวชระเบียน
                  <Sparkles className="h-6 w-6 text-yellow-300" />
                </h1>
                <p className="text-blue-100 mt-1 max-w-xl">
                  รายการผู้ป่วยที่ถูกสุ่มเพื่อตรวจสอบความถูกต้องของเวชระเบียน ตามมาตรฐาน สรพ. 2563
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href="/mra/reports">
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                  <Download className="mr-2 h-4 w-4" />
                  รายงาน
                </Button>
              </Link>
              <Link href="/mra/dashboard">
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/mra/create">
                <Button className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  สร้างใหม่
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ทั้งหมด</p>
                  <p className="text-3xl font-bold">{stats?.total || 0}</p>
                </div>
                <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl">
                  <FileText className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">รอตรวจสอบ</p>
                  <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats?.pending || 0}</p>
                </div>
                <div className="p-3 bg-yellow-200 dark:bg-yellow-800 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">กำลังตรวจ</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats?.in_progress || 0}</p>
                </div>
                <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-xl">
                  <RefreshCcw className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400">ตรวจแล้ว</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">{stats?.audited || 0}</p>
                </div>
                <div className="p-3 bg-green-200 dark:bg-green-800 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
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
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ความถูกต้องเฉลี่ย</p>
                  <p className={cn(
                    "text-3xl font-bold",
                    Number(stats?.avg_accuracy || 0) >= 90 ? "text-green-600 dark:text-green-400" :
                    Number(stats?.avg_accuracy || 0) >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {Number(stats?.avg_accuracy || 0).toFixed(1)}%
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl",
                  Number(stats?.avg_accuracy || 0) >= 90 ? "bg-green-200 dark:bg-green-800" :
                  Number(stats?.avg_accuracy || 0) >= 70 ? "bg-yellow-200 dark:bg-yellow-800" : "bg-red-200 dark:bg-red-800"
                )}>
                  <TrendingUp className={cn(
                    "h-6 w-6",
                    Number(stats?.avg_accuracy || 0) >= 90 ? "text-green-600 dark:text-green-300" :
                    Number(stats?.avg_accuracy || 0) >= 70 ? "text-yellow-600 dark:text-yellow-300" : "text-red-600 dark:text-red-300"
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mx-6 border-0 shadow-md">
          <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 rounded-t-xl border-b">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                  <ListFilter className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                กรองข้อมูล
                {hasActiveFilters && (
                  <Badge className="ml-2 bg-blue-500 hover:bg-blue-600">
                    <Activity className="h-3 w-3 mr-1" />
                    กำลังกรอง
                  </Badge>
                )}
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-red-600 border-red-200 hover:bg-red-50">
                  <RefreshCcw className="h-4 w-4 mr-1" />
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Row 1: Search and Basic Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหา HN, VN หรือ ชื่อ..."
                  className="pl-10 w-72 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleFilterChange('status', v); }}>
                <SelectTrigger className="w-44 h-10">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                  <SelectItem value="in_progress">กำลังตรวจสอบ</SelectItem>
                  <SelectItem value="audited">ตรวจสอบแล้ว</SelectItem>
                  <SelectItem value="corrected">แก้ไขแล้ว</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); handleFilterChange('audit_type', v); }}>
                <SelectTrigger className="w-36 h-10">
                  <SelectValue placeholder="ประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  <SelectItem value="opd">OPD</SelectItem>
                  <SelectItem value="ipd">IPD</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scoreFilter} onValueChange={(v) => { setScoreFilter(v); handleFilterChange('score_range', v); }}>
                <SelectTrigger className="w-44 h-10">
                  <SelectValue placeholder="ช่วงคะแนน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกคะแนน</SelectItem>
                  <SelectItem value="high">สูง (≥90%)</SelectItem>
                  <SelectItem value="medium">ปานกลาง (70-89%)</SelectItem>
                  <SelectItem value="low">ต่ำ (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Row 2: Date Range */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarRange className="h-4 w-4" />
                ช่วงวันที่:
              </div>
              <Input
                type="date"
                className="w-44 h-10"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">ถึง</span>
              <Input
                type="date"
                className="w-44 h-10"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <Button variant="default" onClick={handleSearch} className="h-10 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Search className="h-4 w-4 mr-2" />
                ค้นหา
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Data Table */}
        <Card className="mx-6 border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 hover:from-slate-100 hover:to-gray-100">
                  <TableHead className="w-12 font-semibold">#</TableHead>
                  <TableHead className="font-semibold">วันที่</TableHead>
                  <TableHead className="font-semibold">HN / VN</TableHead>
                  <TableHead className="font-semibold">ผู้ป่วย</TableHead>
                  <TableHead className="font-semibold">ประเภท</TableHead>
                  <TableHead className="font-semibold">ผู้ตรวจ</TableHead>
                  <TableHead className="font-semibold">ผลตรวจ</TableHead>
                  <TableHead className="font-semibold">สถานะ</TableHead>
                  <TableHead className="text-right font-semibold">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                          <AlertCircle className="h-12 w-12 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">ไม่พบข้อมูลการตรวจสอบ</p>
                          <p className="text-sm text-muted-foreground mt-1">เริ่มต้นสร้างรายการตรวจสอบใหม่เพื่อเริ่มใช้งาน</p>
                        </div>
                        <Link href="/mra/create">
                          <Button className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                            <Plus className="mr-2 h-4 w-4" />
                            สร้างรายการใหม่
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.data.map((audit, index) => (
                    <TableRow key={audit.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                      <TableCell className="text-muted-foreground font-mono">
                        {(audits.current_page - 1) * audits.per_page + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">{new Date(audit.visit_date).toLocaleDateString('th-TH')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-semibold text-blue-700 dark:text-blue-400">{audit.hn}</div>
                        <div className="text-xs text-muted-foreground">VN: {audit.vn || '-'}</div>
                        {audit.an && <div className="text-xs text-purple-600 dark:text-purple-400">AN: {audit.an}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{audit.patient_name}</div>
                        {audit.doctor_name && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="text-green-600">●</span> แพทย์: {audit.doctor_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "font-semibold",
                          audit.audit_type === 'opd' 
                            ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400"
                        )}>
                          {audit.audit_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {audit.auditor?.name || <span className="text-muted-foreground">-</span>}
                        {audit.audited_at && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(audit.audited_at).toLocaleDateString('th-TH')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {audit.status !== 'pending' ? (
                          <div className="space-y-1.5">
                            {getScoreBadge(audit.accuracy_percentage)}
                            <div className="text-xs text-muted-foreground">
                              {audit.correct_items}/{audit.total_items} รายการ
                            </div>
                            <Progress
                              value={Number(audit.accuracy_percentage || 0)}
                              className={cn(
                                "h-1.5 w-24",
                                Number(audit.accuracy_percentage || 0) >= 90 ? "[&>div]:bg-green-500" :
                                Number(audit.accuracy_percentage || 0) >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                              )}
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">รอตรวจ</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(audit.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-slate-200 dark:hover:bg-slate-700">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/mra/${audit.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2 text-blue-600" />
                                ดูรายละเอียด
                              </Link>
                            </DropdownMenuItem>
                            {(audit.status === 'pending' || audit.status === 'in_progress') && (
                              <DropdownMenuItem asChild>
                                <Link href={`/mra/${audit.id}/audit`} className="flex items-center">
                                  <Edit className="h-4 w-4 mr-2 text-green-600" />
                                  ตรวจสอบ
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => handleDelete(audit.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              ลบ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {audits.last_page > 1 && (
              <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900">
                <div className="text-sm text-muted-foreground">
                  แสดง <span className="font-medium">{(audits.current_page - 1) * audits.per_page + 1}</span> - <span className="font-medium">{Math.min(audits.current_page * audits.per_page, audits.total)}</span> จาก <span className="font-medium">{audits.total}</span> รายการ
                </div>
                <div className="flex gap-1">
                  {audits.links.map((link: any, index: number) => (
                    <Button
                      key={index}
                      variant={link.active ? 'default' : 'outline'}
                      size="sm"
                      disabled={!link.url}
                      onClick={() => link.url && router.get(link.url)}
                      className={cn(
                        link.active && "bg-gradient-to-r from-blue-600 to-indigo-600"
                      )}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Bottom spacing */}
        <div className="h-6" />
      </div>
    </AppLayout>
  );
}
