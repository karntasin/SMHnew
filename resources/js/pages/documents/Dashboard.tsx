import React from 'react';
import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Archive,
    CheckCircle2,
    Clock,
    FilePlus2,
    FileText,
    Inbox,
    ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import DocumentShell from './DocumentShell';
import { DOCUMENT_STATUS_BADGE, DOCUMENT_STATUS_LABELS, documentBreadcrumbs } from './DocumentSubNav';

interface DashboardProps {
    stats: {
        total: number;
        pending: number;
        in_progress: number;
        completed: number;
        archived: number;
        inbox: number;
    };
    deptStats: { name: string; received_count: number }[];
    recent: any[];
    pendingInbox: any[];
}

export default function Dashboard({ stats, deptStats = [], recent = [], pendingInbox = [] }: DashboardProps) {
    const safe = {
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        in_progress: stats?.in_progress ?? 0,
        completed: stats?.completed ?? 0,
        archived: stats?.archived ?? 0,
        inbox: stats?.inbox ?? 0,
    };

    return (
        <DocumentShell
            active="documents.dashboard"
            title="ภาพรวม"
            headTitle="ภาพรวมรับส่งหนังสือ"
            breadcrumbs={documentBreadcrumbs()}
        >
            <section className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-900/20 md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100 backdrop-blur">
                            <FileText className="h-3.5 w-3.5" />
                            รับเข้า · นำเรียน · ส่งแผนก · ติดตามผล
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">ระบบรับส่งหนังสือ</h1>
                        <p className="text-sm text-indigo-100/90 md:text-base">
                            ลงทะเบียนรับหนังสือ นำเรียนผู้อำนวยการ ส่งต่อแผนก รับทราบ และติดตามการปฏิบัติ — ทำงานเหมือนระบบเอกสารโรงพยาบาล หน้าตาใช้งานแบบจองห้องประชุม
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button asChild className="rounded-xl bg-white text-indigo-900 hover:bg-indigo-50">
                                <Link href={route('documents.create')}>
                                    <FilePlus2 className="mr-2 h-4 w-4" />
                                    รับหนังสือเข้า
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
                                <Link href={route('documents.inbox')}>
                                    <Inbox className="mr-2 h-4 w-4" />
                                    กล่องรับ {safe.inbox > 0 ? `(${safe.inbox})` : ''}
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[28rem]">
                        {[
                            { label: 'ทั้งหมด', value: safe.total, href: route('documents.index') },
                            { label: 'รอรับ', value: safe.inbox, href: route('documents.inbox') },
                            { label: 'รอดำเนินการ', value: safe.pending, href: route('documents.index', { status: 'pending_director' }) },
                            { label: 'กำลังติดตาม', value: safe.in_progress, href: route('documents.index', { status: 'in_progress' }) },
                            { label: 'เสร็จสิ้น', value: safe.completed, href: route('documents.index', { status: 'completed' }) },
                            { label: 'เข้าคลัง', value: safe.archived, href: route('documents.index', { status: 'archived' }) },
                        ].map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur transition hover:bg-white/15"
                            >
                                <div className="text-[11px] text-indigo-100/80">{item.label}</div>
                                <div className="mt-1 text-2xl font-bold tabular-nums">{item.value}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {pendingInbox.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold">
                            <Clock className="h-4 w-4" />
                            มีหนังสือรอรับ {pendingInbox.length} รายการในกล่องรับ
                        </div>
                        <Button asChild size="sm" variant="outline" className="rounded-xl border-amber-300 bg-white">
                            <Link href={route('documents.inbox')}>ไปกล่องรับ</Link>
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-indigo-100/80 bg-white/90 p-5 shadow-xl shadow-indigo-900/5 backdrop-blur">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">สถิติรับหนังสือตามแผนก</h2>
                    </div>
                    <div className="h-72">
                        {deptStats.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm text-slate-400">ยังไม่มีข้อมูล</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptStats}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="received_count" fill="#6366f1" name="จำนวนที่รับ" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="rounded-3xl border border-indigo-100/80 bg-white/90 p-5 shadow-xl shadow-indigo-900/5 backdrop-blur">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">หนังสือล่าสุด</h2>
                        <Button asChild variant="ghost" size="sm" className="rounded-xl text-indigo-700">
                            <Link href={route('documents.index')}>
                                ดูทั้งหมด <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {recent.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีหนังสือ</p>
                        ) : (
                            recent.map((doc) => (
                                <Link
                                    key={doc.id}
                                    href={route('documents.show', doc.id)}
                                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate font-medium text-slate-900">{doc.title}</div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {doc.document_number || '-'} · {new Date(doc.created_at).toLocaleDateString('th-TH')}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={cn('shrink-0', DOCUMENT_STATUS_BADGE[doc.status])}>
                                        {DOCUMENT_STATUS_LABELS[doc.status] || doc.status}
                                    </Badge>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { icon: Inbox, title: 'กล่องรับ', desc: 'รับหนังสือที่ส่งมาแผนก', href: route('documents.inbox'), tone: 'from-amber-500 to-orange-500' },
                    { icon: FilePlus2, title: 'รับหนังสือเข้า', desc: 'ลงทะเบียนและอัปโหลดไฟล์', href: route('documents.create'), tone: 'from-indigo-500 to-violet-500' },
                    { icon: CheckCircle2, title: 'ระหว่างนำเรียน', desc: 'ติดตามคิวรอ ผอ.', href: route('documents.pendingReview'), tone: 'from-sky-500 to-cyan-500' },
                    { icon: Archive, title: 'รายการหนังสือ', desc: 'ค้นหา กรอง สถานะ', href: route('documents.index'), tone: 'from-teal-500 to-emerald-500' },
                ].map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="group rounded-3xl border border-indigo-100/80 bg-white/90 p-5 shadow-lg shadow-indigo-900/5 transition hover:-translate-y-0.5 hover:shadow-xl"
                    >
                        <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white', card.tone)}>
                            <card.icon className="h-5 w-5" />
                        </div>
                        <div className="font-semibold text-slate-900">{card.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{card.desc}</div>
                    </Link>
                ))}
            </div>
        </DocumentShell>
    );
}
