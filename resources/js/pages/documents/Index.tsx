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
import { Plus, Search, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import DocumentShell from './DocumentShell';
import { DOCUMENT_STATUS_BADGE, DOCUMENT_STATUS_LABELS, documentBreadcrumbs } from './DocumentSubNav';

interface Document {
    id: number;
    document_number: string;
    title: string;
    status: string;
    created_at: string;
    document_date: string;
    origin_type: string;
    type: string;
    creator?: { name: string };
}

interface Props {
    documents: {
        data: Document[];
        links: any[];
        current_page?: number;
        last_page?: number;
    };
    filters: {
        status: string;
        search: string;
    };
    statusCounts: Record<string, number>;
    inboxCount?: number;
}

const FILTERS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'registered', label: 'รับเข้าแล้ว' },
    { key: 'pending_director', label: 'รอ ผอ.' },
    { key: 'approved', label: 'อนุมัติแล้ว' },
    { key: 'in_progress', label: 'กำลังติดตาม' },
    { key: 'completed', label: 'เสร็จสิ้น' },
    { key: 'archived', label: 'เข้าคลัง' },
];

export default function Index({ documents, filters, statusCounts = {} }: Props) {
    const [search, setSearch] = useState(filters?.search || '');
    const currentStatus = filters?.status || 'all';

    const apply = (status = currentStatus, page?: number) => {
        router.get(
            route('documents.index'),
            {
                status: status !== 'all' ? status : undefined,
                search: search || undefined,
                page,
            },
            { preserveState: true },
        );
    };

    return (
        <DocumentShell
            active="documents.index"
            title="รายการหนังสือ"
            breadcrumbs={documentBreadcrumbs([{ title: 'รายการหนังสือ', href: route('documents.index') }])}
        >
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">รายการหนังสือ</h1>
                    <p className="mt-1 text-sm text-slate-500">ค้นหา กรองสถานะ และเปิดดูรายละเอียดการดำเนินงาน</p>
                </div>
                <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                    <Link href={route('documents.create')}>
                        <Plus className="mr-2 h-4 w-4" />
                        รับหนังสือเข้า
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                {FILTERS.map((f) => {
                    const count = statusCounts[f.key] ?? 0;
                    const active = currentStatus === f.key;
                    return (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => apply(f.key)}
                            className={cn(
                                'rounded-2xl border p-3 text-left transition',
                                active
                                    ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-200'
                                    : 'border-slate-200 bg-white hover:border-indigo-200',
                            )}
                        >
                            <div className="text-xs text-slate-500">{f.label}</div>
                            <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{count}</div>
                        </button>
                    );
                })}
            </div>

            <div className="rounded-3xl border border-indigo-100/80 bg-white/90 p-4 shadow-xl shadow-indigo-900/5 backdrop-blur">
                <div className="mb-4 flex flex-wrap gap-3">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            className="rounded-xl border-slate-200 pl-10"
                            placeholder="ค้นหาเลขที่ / เรื่อง / ผู้ส่ง..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && apply()}
                        />
                    </div>
                    <Button onClick={() => apply()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                        ค้นหา
                    </Button>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>เลขที่</TableHead>
                            <TableHead>เรื่อง</TableHead>
                            <TableHead>ประเภท</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead>ผู้สร้าง</TableHead>
                            <TableHead>ลงวันที่</TableHead>
                            <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                                    ไม่พบหนังสือตามเงื่อนไข
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.data.map((doc) => (
                                <TableRow key={doc.id} className="hover:bg-indigo-50/40">
                                    <TableCell className="font-mono text-xs text-indigo-700">{doc.document_number || '-'}</TableCell>
                                    <TableCell className="max-w-[280px] truncate font-medium">{doc.title}</TableCell>
                                    <TableCell>
                                        {doc.type === 'circular' ? (
                                            <Badge variant="outline" className="border-violet-300 text-violet-700">เวียน</Badge>
                                        ) : (
                                            <Badge variant="outline">ปกติ</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(DOCUMENT_STATUS_BADGE[doc.status])}>
                                            {DOCUMENT_STATUS_LABELS[doc.status] || doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500">{doc.creator?.name || '-'}</TableCell>
                                    <TableCell className="text-slate-500">
                                        {doc.document_date ? new Date(doc.document_date).toLocaleDateString('th-TH') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild size="sm" variant="outline" className="rounded-xl">
                                            <Link href={route('documents.show', doc.id)}>
                                                <Eye className="mr-1 h-3.5 w-3.5" /> เปิด
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {(documents.last_page ?? 1) > 1 && (
                    <div className="mt-4 flex justify-end gap-2">
                        {documents.links?.map((link: any, i: number) => (
                            <Button
                                key={i}
                                size="sm"
                                variant={link.active ? 'default' : 'outline'}
                                className="rounded-lg"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </DocumentShell>
    );
}
