import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import {
    ClipboardList,
    FileInput,
    FileOutput,
    FilePlus2,
    FileSignature,
    FileText,
    Inbox,
    LayoutDashboard,
} from 'lucide-react';

export type DocumentTabKey =
    | 'documents.dashboard'
    | 'documents.inbox'
    | 'documents.outbox'
    | 'documents.index'
    | 'documents.create'
    | 'documents.pendingReview'
    | 'documents.director.index';

const tabs: { key: DocumentTabKey; label: string; hint: string; icon: typeof LayoutDashboard }[] = [
    { key: 'documents.dashboard', label: 'ภาพรวม', hint: 'สถิติและติดตาม', icon: LayoutDashboard },
    { key: 'documents.inbox', label: 'กล่องรับ', hint: 'รอรับหนังสือ', icon: Inbox },
    { key: 'documents.outbox', label: 'กล่องส่ง', hint: 'หนังสือที่ส่งออก', icon: FileOutput },
    { key: 'documents.index', label: 'รายการหนังสือ', hint: 'ค้นหา/กรองสถานะ', icon: ClipboardList },
    { key: 'documents.create', label: 'รับหนังสือเข้า', hint: 'ลงทะเบียนรับเข้า', icon: FilePlus2 },
    { key: 'documents.pendingReview', label: 'ระหว่างนำเรียน', hint: 'รอ ผอ. พิจารณา', icon: FileText },
    { key: 'documents.director.index', label: 'กล่องงาน ผอ.', hint: 'ลงนาม/อนุมัติ', icon: FileSignature },
];

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
    registered: 'รับเข้าแล้ว',
    pending: 'รอดำเนินการ',
    pending_director: 'รอ ผอ. พิจารณา',
    approved: 'อนุมัติแล้ว',
    rejected: 'ส่งกลับต้นทาง',
    in_progress: 'กำลังติดตาม',
    distributed: 'เวียนทราบ',
    completed: 'เสร็จสิ้น',
    archived: 'เก็บเข้าคลัง',
};

export const DOCUMENT_STATUS_BADGE: Record<string, string> = {
    registered: 'bg-slate-100 text-slate-800 border-slate-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    pending_director: 'bg-violet-100 text-violet-800 border-violet-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    in_progress: 'bg-sky-100 text-sky-800 border-sky-200',
    distributed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    completed: 'bg-teal-100 text-teal-800 border-teal-200',
    archived: 'bg-stone-100 text-stone-700 border-stone-200',
};

export function documentBreadcrumbs(extra?: { title: string; href: string }[]) {
    return [
        { title: 'งานธุรการ', href: '/administration' },
        { title: 'ระบบรับส่งหนังสือ', href: route('documents.dashboard') },
        ...(extra ?? []),
    ];
}

export default function DocumentSubNav({ active }: { active: DocumentTabKey }) {
    return (
        <nav className="rounded-3xl border border-indigo-100/80 bg-white/90 p-2 shadow-xl shadow-indigo-900/5 backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                    <FileInput className="h-3.5 w-3.5" />
                    Document Workspace
                </div>
                <div className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
                    งานธุรการ · รับส่งหนังสือ
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = active === tab.key;

                    return (
                        <Link
                            key={tab.key}
                            href={route(tab.key)}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-300',
                                'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/10',
                                isActive
                                    ? 'border-indigo-400 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-900/20'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-slate-900',
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition',
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-indigo-700 group-hover:bg-white',
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold">{tab.label}</span>
                                    <span className={cn('block truncate text-[11px]', isActive ? 'text-indigo-50' : 'text-slate-400')}>
                                        {tab.hint}
                                    </span>
                                </span>
                            </div>
                            {isActive && <span className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/15" />}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
