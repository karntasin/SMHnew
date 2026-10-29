import { Head, Link, router } from '@inertiajs/react';
import { Download, FilePlus2, Pencil, Search, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import { downloadDocx } from './downloadDocx';
import MemoSubNav from './MemoSubNav';
import type { MemoKind } from './types';

interface MemoRow {
    id: number;
    kind: MemoKind;
    subject: string | null;
    document_no: string | null;
    document_date: string | null;
    updated_at: string | null;
}

interface Paginated {
    data: MemoRow[];
    prev_page_url: string | null;
    next_page_url: string | null;
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    memos: Paginated;
    kinds: Record<MemoKind, { label: string }>;
    filters: { kind: string; search: string };
}

const kindTone: Record<string, string> = {
    internal: 'bg-emerald-50 text-emerald-800',
    external: 'bg-sky-50 text-sky-800',
    order: 'bg-amber-50 text-amber-800',
};

function toneFor(kind: string): string {
    return kindTone[kind] ?? 'bg-slate-50 text-slate-700';
}

const breadcrumbs = [
    { title: 'งานธุรการ', href: '/admin-hub' },
    { title: 'จัดการงานเอกสาร', href: route('admin-docs.memos.index') },
];

export default function Index({ memos, kinds, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const visit = (next: { kind?: string; search?: string }) => {
        router.get(
            route('admin-docs.memos.index'),
            { kind: next.kind ?? filters.kind, search: next.search ?? search },
            { preserveState: true, replace: true },
        );
    };

    const download = async (memo: MemoRow) => {
        setDownloadingId(memo.id);
        try {
            await downloadDocx(route('admin-docs.memos.docx', memo.id));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ดาวน์โหลดไฟล์ไม่สำเร็จ');
        } finally {
            setDownloadingId(null);
        }
    };

    const remove = (memo: MemoRow) => {
        if (!window.confirm('ลบหนังสือฉบับนี้จากรายการของคุณ?')) return;
        router.delete(route('admin-docs.memos.destroy', memo.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs} title="พิมพ์หนังสือราชการ">
            <Head title="พิมพ์หนังสือราชการ" />
            <div className="space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">จัดการงานเอกสาร</p>
                        <h1 className="text-2xl font-semibold text-slate-900">หนังสือราชการของฉัน</h1>
                        <p className="mt-1 text-sm text-slate-500">เปิดกลับมาแก้ แล้วดาวน์โหลดเป็นไฟล์ Word ได้</p>
                    </div>
                    <MemoSubNav />
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                    <div className="flex flex-wrap gap-2">
                        <FilterChip active={filters.kind === ''} onClick={() => visit({ kind: '' })}>
                            ทั้งหมด
                        </FilterChip>
                        {(Object.keys(kinds) as MemoKind[]).map((kind) => (
                            <FilterChip key={kind} active={filters.kind === kind} onClick={() => visit({ kind })}>
                                {kinds[kind].label}
                            </FilterChip>
                        ))}
                    </div>
                    <form
                        className="flex flex-1 gap-2 md:justify-end"
                        onSubmit={(event) => {
                            event.preventDefault();
                            visit({ search });
                        }}
                    >
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นเรื่องหรือเลขที่" className="max-w-xs" />
                        <Button type="submit" variant="outline">
                            <Search className="size-4" />
                        </Button>
                    </form>
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href={route('admin-docs.memos.create')}>
                            <FilePlus2 className="mr-2 size-4" />
                            เขียนหนังสือใหม่
                        </Link>
                    </Button>
                </div>

                {memos.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                        <p className="text-lg font-medium text-slate-800">ยังไม่มีหนังสือในรายการ</p>
                        <p className="mt-1 text-sm text-slate-500">เริ่มจากบันทึกข้อความภายใน หนังสือภายนอก หรือคำสั่ง</p>
                        <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                            <Link href={route('admin-docs.memos.create')}>เขียนหนังสือใหม่</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="divide-y divide-slate-100">
                            {memos.data.map((memo) => {
                                const updated = memo.updated_at?.split(' ') ?? [];
                                return (
                                    <article key={memo.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', toneFor(memo.kind))}>
                                                    {kinds[memo.kind]?.label ?? memo.kind}
                                                </span>
                                                {memo.document_no && <span className="text-xs text-slate-500">ที่ {memo.document_no}</span>}
                                                {memo.document_date && (
                                                    <span className="text-xs text-slate-500">{formatThaiDateFromIso(memo.document_date)}</span>
                                                )}
                                            </div>
                                            <h2 className="truncate text-base font-medium text-slate-900">{memo.subject || 'ยังไม่ระบุเรื่อง'}</h2>
                                            {updated[0] && (
                                                <p className="mt-1 text-xs text-slate-400">
                                                    แก้ล่าสุด {formatThaiDateFromIso(updated[0])} {updated[1] ?? ''}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={route('admin-docs.memos.edit', memo.id)}>
                                                    <Pencil className="mr-1 size-4" />
                                                    แก้ไข
                                                </Link>
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => download(memo)} disabled={downloadingId === memo.id}>
                                                <Download className="mr-1 size-4" />
                                                Word
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => remove(memo)}>
                                                <Trash2 className="size-4 text-rose-600" />
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                            <span>
                                {memos.from ?? 0}–{memos.to ?? 0} จาก {memos.total}
                            </span>
                            <div className="flex gap-2">
                                {memos.prev_page_url && (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={memos.prev_page_url}>ก่อนหน้า</Link>
                                    </Button>
                                )}
                                {memos.next_page_url && (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={memos.next_page_url}>ถัดไป</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200',
            )}
        >
            {children}
        </button>
    );
}
