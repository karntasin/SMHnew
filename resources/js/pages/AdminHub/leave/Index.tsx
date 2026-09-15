import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BreadcrumbItem } from '@/types';
import {
  Plus, Search, ClipboardList, Calendar, Clock, CheckCircle2, XCircle, Eye,
  TrendingUp, FileText, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'งานธุรการ', href: '/admin-hub' },
  { title: 'ระบบบันทึกการลา', href: route('leave.index') },
];

interface LeaveType { id: number; name: string; code: string }
interface User { id: number; name: string; position?: string }
interface Approval { id: number; step: number; role_label: string; approver?: User | null; action: string; comment?: string; acted_at?: string }
interface LeaveRequestData {
  id: number;
  request_number: string;
  user?: User;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
  approvals: Approval[];
}

interface BalanceData {
  id: number;
  leave_type: LeaveType;
  entitled_days: number;
  used_days: number;
  carry_over_days: number;
}

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
  links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
  myRequests: Paginated<LeaveRequestData>;
  pendingApprovals: Paginated<LeaveRequestData>;
  allRequests?: Paginated<LeaveRequestData> | null;
  balances: BalanceData[];
  leaveTypes: LeaveType[];
  tab: string;
  filters: { search?: string; status?: string };
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  isAdmin: boolean;
  isHr?: boolean;
}

const colorMap: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

function StatusBadge({ status, labels, colors }: { status: string; labels: Record<string, string>; colors: Record<string, string> }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', colorMap[colors[status] || 'gray'])}>
      {labels[status] || status}
    </Badge>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function LeaveTable({ data, showUser, labels, colors }: {
  data: Paginated<LeaveRequestData>; showUser?: boolean;
  labels: Record<string, string>; colors: Record<string, string>;
}) {
  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-32">เลขที่</TableHead>
              {showUser && <TableHead>ผู้ขอลา</TableHead>}
              <TableHead>ประเภท</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead className="text-center">จำนวนวัน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showUser ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  ไม่พบข้อมูลใบลา
                </TableCell>
              </TableRow>
            ) : data.data.map((r) => (
              <TableRow key={r.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                {showUser && <TableCell className="font-medium">{r.user?.name}</TableCell>}
                <TableCell>{r.leave_type.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(r.start_date)} - {formatDate(r.end_date)}
                </TableCell>
                <TableCell className="text-center font-semibold">{r.total_days}</TableCell>
                <TableCell><StatusBadge status={r.status} labels={labels} colors={colors} /></TableCell>
                <TableCell className="text-right">
                  <Link href={route('leave.show', r.id)}>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.links.length > 3 && (
        <div className="flex justify-end gap-1 mt-3">
          {data.links.map((link, i) => (
            <Button key={i} variant={link.active ? 'default' : 'outline'} size="sm" asChild disabled={!link.url}
              className={!link.url ? 'opacity-50 pointer-events-none' : ''}>
              <Link href={link.url || '#'}><span dangerouslySetInnerHTML={{ __html: link.label }} /></Link>
            </Button>
          ))}
        </div>
      )}
    </>
  );
}

export default function LeaveIndex({
  myRequests, pendingApprovals, allRequests, balances, leaveTypes,
  tab: initialTab, filters, statusLabels, statusColors, isAdmin, isHr,
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab || 'my');

  const tabs = [
    { id: 'my', label: 'ใบลาของฉัน', count: myRequests.total, icon: FileText },
    { id: 'pending', label: isHr ? 'รออนุมัติ / ตรวจสอบ' : 'รออนุมัติ', count: pendingApprovals.total, icon: Clock },
    ...(isAdmin ? [{ id: 'all', label: 'ทั้งหมด', count: allRequests?.total || 0, icon: ClipboardList }] : []),
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="ระบบบันทึกการลา" />
      <div className="min-h-screen bg-slate-50/50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/admin-hub" className="text-muted-foreground hover:text-primary">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <h1 className="text-2xl font-bold tracking-tight">ระบบบันทึกการลา</h1>
                </div>
                <p className="text-muted-foreground text-sm">ตามระเบียบกองทัพบก ว่าด้วยการลา พ.ศ. ๒๕๕๖</p>
              </div>
              <Link href={route('leave.create')}>
                <Button className="bg-rose-600 hover:bg-rose-700">
                  <Plus className="mr-2 h-4 w-4" /> ยื่นใบลา
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Balance Cards */}
          {balances.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {balances.map((b) => {
                const remaining = parseFloat(String(b.entitled_days)) + parseFloat(String(b.carry_over_days)) - parseFloat(String(b.used_days));
                return (
                  <Card key={b.id} className="border-l-4 border-l-rose-400">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{b.leave_type.name}</p>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-2xl font-bold text-slate-900">{remaining}</span>
                          <span className="text-sm text-muted-foreground ml-1">วัน</span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>สิทธิ์ {b.entitled_days} วัน</p>
                          <p>ใช้แล้ว {b.used_days} วัน</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white p-1 rounded-xl border">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === t.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                )}>
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.count > 0 && (
                  <span className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold',
                    activeTab === t.id ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'
                  )}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'my' && (
            <LeaveTable data={myRequests} labels={statusLabels} colors={statusColors} />
          )}

          {activeTab === 'pending' && (
            <LeaveTable data={pendingApprovals} showUser labels={statusLabels} colors={statusColors} />
          )}

          {activeTab === 'all' && allRequests && (
            <LeaveTable data={allRequests} showUser labels={statusLabels} colors={statusColors} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
