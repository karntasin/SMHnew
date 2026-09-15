import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Eye, FileOutput, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';

interface Transfer {
    id: number;
    created_at: string;
    acknowledged_at?: string | null;
    implementation_status?: string | null;
    comment?: string | null;
    document: {
        id: number;
        title: string;
        document_number?: string | null;
    };
    receiver_department?: { name: string } | null;
    receiver_user?: { name: string } | null;
    acknowledged_by_user?: { name: string } | null;
}

interface Props {
    transfers: {
        data: Transfer[];
        links: any[];
        last_page?: number;
    };
    filters: { status: string; search: string };
    stats: { total: number; pending: number; received: number };
}

const IMP_LABELS: Record<string, string> = {
    received: 'รับแล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    not_relevant: 'ไม่เกี่ยวข้อง',
};

export default function Outbox({ transfers, filters, stats }: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const currentStatus = filters?.status || 'all';
    const rows = transfers?.data ?? [];
    const safeStats = {
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        received: stats?.received ?? 0,
    };

    const apply = (status = currentStatus) => {
        router.get(
            route('documents.outbox'),
            {
                status: status !== 'all' ? status : undefined,
                search: search || undefined,
            },
            { preserveState: true },
        );
    };

    const transferBadge = (row: Transfer) => {
        if (row.implementation_status && ['completed', 'not_relevant'].includes(row.implementation_status)) {
            return <Badge className="bg-teal-500">{IMP_LABELS[row.implementation_status]}</Badge>;
        }
        if (row.acknowledged_at) {
            return <Badge className="bg-sky-500">รับแล้ว · {IMP_LABELS[row.implementation_status || 'received']}</Badge>;
        }
        return <Badge className="bg-amber-400 text-slate-900">รอรับ</Badge>;
    };

    return (
        <DocumentShell
            active="documents.outbox"
            title="กล่องส่ง"
            breadcrumbs={documentBreadcrumbs([{ title: 'กล่องส่ง', href: route('documents.outbox') }])}
        >
            <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-900 p-6 text-white shadow-2xl md:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-sky-100">
                            <FileOutput className="h-3.5 w-3.5" />
                            ติดตามหนังสือที่ส่งออก
                        </div>
                        <h1 className="text-3xl font-bold">กล่องส่งหนังสือ</h1>
                        <p className="mt-2 text-sm text-sky-100/90">ดูว่าแผนกปลายทางรับแล้วหรือยัง และสถานะการปฏิบัติ</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'ทั้งหมด', value: safeStats.total, key: 'all' },
                            { label: 'รอรับ', value: safeStats.pending, key: 'pending' },
                            { label: 'รับแล้ว', value: safeStats.received, key: 'received' },
                        ].map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => apply(s.key)}
                                className={cn(
                                    'rounded-2xl border px-4 py-3 text-left transition',
                                    currentStatus === s.key ? 'border-white/40 bg-white/20' : 'border-white/10 bg-white/10 hover:bg-white/15',
                                )}
                            >
                                <div className="text-xs text-sky-100/80">{s.label}</div>
                                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <div className="rounded-3xl border border-indigo-100/80 bg-white/90 p-4 shadow-xl shadow-indigo-900/5">
                <div className="mb-4 flex flex-wrap gap-3">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            className="rounded-xl pl-10"
                            placeholder="ค้นหาเลขที่ / เรื่อง..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && apply()}
                        />
                    </div>
                    <Button onClick={() => apply()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">ค้นหา</Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>เลขที่</TableHead>
                            <TableHead>เรื่อง</TableHead>
                            <TableHead>ส่งถึง</TableHead>
                            <TableHead>สถานะปลายทาง</TableHead>
                            <TableHead>ส่งเมื่อ</TableHead>
                            <TableHead className="text-right">ดู</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                                    ยังไม่มีรายการส่งออก
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-sky-50/40">
                                    <TableCell className="font-mono text-xs text-indigo-700">
                                        {row.document?.document_number || '-'}
                                    </TableCell>
                                    <TableCell className="max-w-[260px] truncate font-medium">{row.document?.title}</TableCell>
                                    <TableCell className="text-slate-500">
                                        {row.receiver_department?.name || row.receiver_user?.name || '-'}
                                    </TableCell>
                                    <TableCell>{transferBadge(row)}</TableCell>
                                    <TableCell className="text-slate-500">
                                        {new Date(row.created_at).toLocaleString('th-TH')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild size="sm" variant="outline" className="rounded-xl">
                                            <Link href={route('documents.show', row.document.id)}>
                                                <Eye className="mr-1 h-3.5 w-3.5" /> เปิด
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </DocumentShell>
    );
}
