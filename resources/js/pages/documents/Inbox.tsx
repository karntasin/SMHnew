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
import { AlertTriangle, CheckCircle2, Clock, Eye, Inbox as InboxIcon, Search } from 'lucide-react';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';

interface Transfer {
    id: number;
    created_at: string;
    comment?: string | null;
    document: {
        id: number;
        title: string;
        document_number?: string | null;
        document_date?: string | null;
    };
    sender?: { name: string } | null;
    receiver_department?: { name: string } | null;
}

interface Props {
    transfers: {
        data: Transfer[];
        links: any[];
        last_page?: number;
    };
    filters: { search: string };
    stats: { pending: number; overdue: number };
}

export default function Inbox({ transfers, filters, stats }: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const rows = transfers?.data ?? [];
    const safeStats = {
        pending: stats?.pending ?? 0,
        overdue: stats?.overdue ?? 0,
    };

    const apply = () => {
        router.get(route('documents.inbox'), { search: search || undefined }, { preserveState: true });
    };

    const receive = (actionId: number) => {
        router.post(route('documents.acknowledgeDocument', actionId), {}, { preserveScroll: true });
    };

    return (
        <DocumentShell
            active="documents.inbox"
            title="กล่องรับ"
            breadcrumbs={documentBreadcrumbs([{ title: 'กล่องรับ', href: route('documents.inbox') }])}
        >
            <section className="overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-slate-900 via-amber-950 to-orange-900 p-6 text-white shadow-2xl md:p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-amber-100">
                            <InboxIcon className="h-3.5 w-3.5" />
                            หนังสือรอรับของแผนก/ของฉัน
                        </div>
                        <h1 className="text-3xl font-bold">กล่องรับหนังสือ</h1>
                        <p className="mt-2 text-sm text-amber-100/90">รับหนังสือที่ส่งมา → จากนั้นอัปเดตสถานะการปฏิบัติในหน้ารายละเอียด</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <div className="text-xs text-amber-100/80">รอรับ</div>
                            <div className="text-2xl font-bold tabular-nums">{safeStats.pending}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <div className="text-xs text-amber-100/80">เกิน 3 ชม.</div>
                            <div className="text-2xl font-bold tabular-nums">{safeStats.overdue}</div>
                        </div>
                    </div>
                </div>
            </section>

            {safeStats.overdue > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <AlertTriangle className="h-4 w-4" />
                    มีหนังสือค้างรับเกิน 3 ชั่วโมง {safeStats.overdue} รายการ — กรุณารับโดยเร็ว
                </div>
            )}

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
                    <Button onClick={apply} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">ค้นหา</Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>เลขที่</TableHead>
                            <TableHead>เรื่อง</TableHead>
                            <TableHead>จาก</TableHead>
                            <TableHead>ส่งเมื่อ</TableHead>
                            <TableHead className="text-right">ดำเนินการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-12 text-center text-slate-400">
                                    <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                    ไม่มีหนังสือรอรับในขณะนี้
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-amber-50/40">
                                    <TableCell className="font-mono text-xs text-indigo-700">
                                        {row.document?.document_number || '-'}
                                    </TableCell>
                                    <TableCell className="max-w-[280px]">
                                        <div className="truncate font-medium">{row.document?.title}</div>
                                        {row.comment && <div className="mt-0.5 truncate text-xs text-slate-400">{row.comment}</div>}
                                    </TableCell>
                                    <TableCell className="text-slate-500">{row.sender?.name || '-'}</TableCell>
                                    <TableCell className="text-slate-500">
                                        {new Date(row.created_at).toLocaleString('th-TH')}
                                    </TableCell>
                                    <TableCell className="space-x-2 text-right">
                                        {row.document?.id && (
                                            <Button asChild size="sm" variant="outline" className="rounded-xl">
                                                <Link href={route('documents.show', row.document.id)}>
                                                    <Eye className="mr-1 h-3.5 w-3.5" /> ดู
                                                </Link>
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => receive(row.id)}
                                        >
                                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> รับหนังสือ
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
