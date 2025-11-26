import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, AlertTriangle, FileText, ShieldAlert, BookOpen, GraduationCap } from 'lucide-react';

interface Props {
  stats: {
    total_infections: number;
    active_infections: number;
    incidents_this_month: number;
    infection_by_ward: { ward_name: string; total: number }[];
  };
}

export default function IcIndex({ stats }: Props) {
  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '#' },
    { title: 'IC (ควบคุมการติดเชื้อ)', href: '/ic' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="IC Dashboard" />

      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Infection Control Dashboard</h1>
          <p className="text-muted-foreground">ระบบควบคุมและป้องกันการติดเชื้อในโรงพยาบาล</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">การติดเชื้อสะสม</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_infections}</div>
              <p className="text-xs text-muted-foreground">เคสทั้งหมดในระบบ</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">กำลังรักษา/เฝ้าระวัง</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.active_infections}</div>
              <p className="text-xs text-muted-foreground">เคส Active ปัจจุบัน</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">อุบัติการณ์เดือนนี้</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.incidents_this_month}</div>
              <p className="text-xs text-muted-foreground">Needle stick / Breach</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/ic/surveillance">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  ระบบเฝ้าระวัง (Surveillance)
                </CardTitle>
                <CardDescription>
                  ค้นหาผู้ป่วยกลุ่มเสี่ยง บันทึกข้อมูลการติดเชื้อ (HAI) และติดตามผล
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/ic/incidents">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  รายงานอุบัติการณ์ (Incidents)
                </CardTitle>
                <CardDescription>
                  แจ้งเหตุเข็มตำ สัมผัสสารคัดหลั่ง หรือการละเมิดแนวปฏิบัติ IC
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/quality-docs">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  แนวปฏิบัติ IC (Guidelines)
                </CardTitle>
                <CardDescription>
                  เข้าถึงคู่มือ WI และระเบียบปฏิบัติเรื่องการควบคุมการติดเชื้อ
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/km/learn">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  ประเมินความรู้ (Assessment)
                </CardTitle>
                <CardDescription>
                  ทำแบบทดสอบความรู้เรื่อง IC ผ่านระบบ HRD
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>สถิติแยกตามหอผู้ป่วย</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {stats.infection_by_ward.length === 0 ? (
                        <p className="text-muted-foreground text-sm">ยังไม่มีข้อมูล</p>
                    ) : (
                        stats.infection_by_ward.map((item, index) => (
                            <div key={index} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <span>{item.ward_name || 'ไม่ระบุ'}</span>
                                <span className="font-bold">{item.total} เคส</span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
