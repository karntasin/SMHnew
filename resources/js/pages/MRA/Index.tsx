import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Audit {
  id: number;
  vn: string;
  an: string;
  hn: string;
  patient_name: string;
  visit_date: string;
  doctor_name: string;
  status: 'pending' | 'audited' | 'corrected';
  total_score: number;
  auditor: {
    name: string;
  };
}

interface Props {
  audits: {
    data: Audit[];
    links: any[];
  };
}

export default function MraIndex({ audits }: Props) {
  const breadcrumbs = [
    { title: 'งานคุณภาพ', href: '#' },
    { title: 'MRA', href: '/mra' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">รอตรวจสอบ</Badge>;
      case 'audited':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ตรวจสอบแล้ว</Badge>;
      case 'corrected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">แก้ไขแล้ว</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="รายการตรวจสอบเวชระเบียน" />

      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">รายการตรวจสอบ (Audit List)</h1>
            <p className="text-muted-foreground">รายการผู้ป่วยที่ถูกสุ่มเพื่อตรวจสอบความถูกต้องของเวชระเบียน</p>
          </div>
          <div className="flex gap-2">
             <Link href="/mra/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Link href="/mra/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> สุ่มตรวจใหม่
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>รายการผู้ป่วย</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ค้นหา HN, VN หรือ ชื่อ..." className="pl-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่รับบริการ</TableHead>
                  <TableHead>HN / VN / AN</TableHead>
                  <TableHead>ผู้ป่วย</TableHead>
                  <TableHead>แพทย์ผู้รักษา</TableHead>
                  <TableHead>ผู้ตรวจสอบ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลการตรวจสอบ
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.data.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>{new Date(audit.visit_date).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{audit.hn}</div>
                        <div className="text-xs text-muted-foreground">VN: {audit.vn || '-'}</div>
                        {audit.an && <div className="text-xs text-muted-foreground">AN: {audit.an}</div>}
                      </TableCell>
                      <TableCell>{audit.patient_name}</TableCell>
                      <TableCell>{audit.doctor_name || '-'}</TableCell>
                      <TableCell>{audit.auditor?.name}</TableCell>
                      <TableCell>{getStatusBadge(audit.status)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/mra/${audit.id}`}>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-1" /> ตรวจสอบ
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
