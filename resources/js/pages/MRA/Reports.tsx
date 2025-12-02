import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Download,
  Printer,
  Filter,
  BarChart3,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryStat {
  id: number;
  code: string;
  name: string;
  total: number;
  passed: number;
  failed: number;
  accuracy: number;
}

interface TopError {
  criteria_code: string;
  criteria_name: string;
  category_name: string;
  fail_count: number;
}

interface Props {
  stats: {
    total_audits: number;
    completed_audits: number;
    avg_accuracy: number;
    target: number;
  };
  categoryStats: CategoryStat[];
  topErrors: TopError[];
  filters: {
    from_date: string;
    to_date: string;
  };
}

export default function MraReports({ stats, categoryStats, topErrors, filters }: Props) {
  const [fromDate, setFromDate] = useState(filters.from_date);
  const [toDate, setToDate] = useState(filters.to_date);

  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '/quality' },
    { title: 'MRA', href: '/mra' },
    { title: 'รายงาน', href: '#' },
  ];

  const handleFilter = () => {
    router.get('/mra/reports', {
      from_date: fromDate,
      to_date: toDate,
    }, { preserveState: true });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="รายงาน MRA" />

      <div className="p-6 space-y-6 print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Link href="/mra">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">รายงาน MRA</h1>
              <p className="text-muted-foreground">
                สรุปผลการตรวจสอบคุณภาพเวชระเบียน
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              พิมพ์
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-xl font-bold">รายงานสรุปผลการตรวจสอบคุณภาพเวชระเบียน</h1>
          <p className="text-sm">ตามเกณฑ์ สรพ. 2563</p>
          <p className="text-sm mt-2">
            ช่วงวันที่: {new Date(fromDate).toLocaleDateString('th-TH')} - {new Date(toDate).toLocaleDateString('th-TH')}
          </p>
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              ช่วงเวลา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label>จากวันที่</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label>ถึงวันที่</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={handleFilter}>
                <Calendar className="mr-2 h-4 w-4" />
                แสดงรายงาน
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <div className="text-2xl font-bold">{stats.total_audits}</div>
              <div className="text-xs text-muted-foreground">ตรวจสอบทั้งหมด</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-500/50 mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.completed_audits}</div>
              <div className="text-xs text-muted-foreground">ตรวจเสร็จสิ้น</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-blue-500/50 mb-2" />
              <div className={cn(
                "text-2xl font-bold",
                stats.avg_accuracy >= 90 ? "text-green-600" :
                stats.avg_accuracy >= 70 ? "text-yellow-600" : "text-red-600"
              )}>
                {stats.avg_accuracy}%
              </div>
              <div className="text-xs text-muted-foreground">ความถูกต้องเฉลี่ย</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto text-purple-500/50 mb-2" />
              <div className="text-2xl font-bold text-purple-600">{stats.target}%</div>
              <div className="text-xs text-muted-foreground">เป้าหมาย</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>ผลตามหมวดหมู่</CardTitle>
            <CardDescription>อัตราความถูกต้องแยกตามหมวดการตรวจสอบ 9 หมวด</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">รหัส</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead className="text-center">ตรวจ</TableHead>
                  <TableHead className="text-center">ผ่าน</TableHead>
                  <TableHead className="text-center">ไม่ผ่าน</TableHead>
                  <TableHead className="w-48">ความถูกต้อง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryStats.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono">{cat.code}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-center">{cat.total}</TableCell>
                    <TableCell className="text-center text-green-600">{cat.passed}</TableCell>
                    <TableCell className="text-center text-red-600">{cat.failed}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={cat.accuracy}
                          className={cn(
                            "h-2 flex-1",
                            cat.accuracy >= 90 ? "[&>div]:bg-green-500" :
                            cat.accuracy >= 70 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                          )}
                        />
                        <span className={cn(
                          "text-sm font-medium w-12 text-right",
                          cat.accuracy >= 90 ? "text-green-600" :
                          cat.accuracy >= 70 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {cat.accuracy}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              ข้อผิดพลาดที่พบบ่อย (Top 10)
            </CardTitle>
            <CardDescription>รายการที่มักพบปัญหาจากการตรวจสอบ</CardDescription>
          </CardHeader>
          <CardContent>
            {topErrors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-24">รหัส</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead>หมวด</TableHead>
                    <TableHead className="text-center">จำนวนครั้ง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topErrors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{error.criteria_code}</TableCell>
                      <TableCell className="font-medium">{error.criteria_name}</TableCell>
                      <TableCell className="text-muted-foreground">{error.category_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">{error.fail_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500/50" />
                <p>ไม่พบข้อผิดพลาดในช่วงเวลาที่เลือก</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between print:hidden">
          <Link href="/mra">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับ
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
