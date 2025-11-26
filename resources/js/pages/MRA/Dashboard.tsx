import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, FileText, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';

interface Props {
  stats: {
    total_audits: number;
    pending_audits: number;
    accuracy_rate: number;
    top_errors: Array<{ error_type: string; total: number }>;
  };
}

export default function MraDashboard({ stats }: Props) {
  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '#' },
    { title: 'MRA (Medical Record Accuracy)', href: '/mra' },
    { title: 'Dashboard', href: '/mra/dashboard' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="MRA Dashboard" />
      
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MRA Dashboard</h1>
            <p className="text-muted-foreground">ระบบติดตามคุณภาพเวชระเบียน (Medical Record Accuracy)</p>
          </div>
          <div className="flex gap-2">
            <Link href="/mra">
              <Button variant="outline">รายการตรวจสอบ</Button>
            </Link>
            <Link href="/mra/create">
              <Button>เริ่มการตรวจสอบใหม่</Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">การตรวจสอบทั้งหมด</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_audits}</div>
              <p className="text-xs text-muted-foreground">เคสที่ถูกสุ่มตรวจ</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รอการตรวจสอบ</CardTitle>
              <Activity className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_audits}</div>
              <p className="text-xs text-muted-foreground">เคสที่ต้องดำเนินการ</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">อัตราความถูกต้อง</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accuracy_rate}%</div>
              <p className="text-xs text-muted-foreground">ค่าเฉลี่ยโดยรวม</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ข้อผิดพลาดร้ายแรง</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">ในรอบเดือนนี้</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Top Errors Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>ข้อผิดพลาดที่พบบ่อย (Top Errors)</CardTitle>
              <CardDescription>ประเภทความคลาดเคลื่อนที่พบจากการตรวจสอบ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.top_errors.length > 0 ? (
                  stats.top_errors.map((error, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-sm font-medium">
                          <span>{error.error_type}</span>
                          <span>{error.total} ครั้ง</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(error.total / stats.total_audits) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                    ยังไม่มีข้อมูลเพียงพอ
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity / Quick Actions */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>การดำเนินการล่าสุด</CardTitle>
              <CardDescription>ประวัติการตรวจสอบล่าสุด</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 <div className="flex items-center gap-4 rounded-md border p-3">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">สรุปผลประจำเดือน</p>
                        <p className="text-xs text-muted-foreground">สร้างเมื่อ 2 ชั่วโมงที่แล้ว</p>
                    </div>
                 </div>
                 {/* Placeholder for recent items */}
                 <div className="text-center text-sm text-muted-foreground py-4">
                    ดูรายการทั้งหมดที่หน้า "รายการตรวจสอบ"
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
