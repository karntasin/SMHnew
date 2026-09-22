import { FormEvent, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Filter,
    RefreshCw,
    RotateCcw,
    Search,
    TriangleAlert,
    XCircle,
} from 'lucide-react';

type SyncRecord = {
    id: number;
    hosxp_key: string;
    hn: string;
    vn: string;
    icode: string;
    vstdate: string;
    qty: number;
    status: 'deducted' | 'insufficient' | 'failed' | 'skipped';
    movement_id?: number | null;
    message?: string | null;
    created_at: string;
    item?: {
        name: string;
        strength?: string;
        unit?: string;
        item_type?: 'drug' | 'nondrug' | string;
        item_type_label?: string;
    } | null;
};

type Pagination = {
    data: SyncRecord[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url?: string | null;
    next_page_url?: string | null;
};

export default function DispenseSync({
    syncs,
    stats,
    filters,
}: {
    syncs: Pagination;
    stats: { total: number; synced: number; insufficient: number; failed: number };
    filters: { start_date: string; end_date: string; status: string };
}) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            route('pharmacy.inventory.sync-dispense.history'),
            {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                status: status !== 'all' ? status : undefined,
            },
            { preserveState: true },
        );
    };

    const handleSyncToday = () => {
        setIsSyncing(true);
        router.post(
            route('pharmacy.inventory.sync-dispense'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsSyncing(false),
            },
        );
    };

    const handleRetryAll = () => {
        setIsRetrying(true);
        router.post(
            route('pharmacy.inventory.sync-dispense.retry'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsRetrying(false),
            },
        );
    };

    const handleRetrySingle = (id: number) => {
        router.post(
            route('pharmacy.inventory.sync-dispense.retry'),
            { id },
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
                { title: 'ติดตามการซิงก์ตัดจ่าย HOSxP' },
            ])}
        >
            <Head title="ติดตามการซิงก์ตัดจ่ายยา HOSxP" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Clock className="h-4 w-4 text-violet-600" />
                            รายการสั่งยาในงวด
                        </div>
                        <div className="mt-2 text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">ใบสั่งยาทั้งหมด</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ตัดจ่ายสต็อกสำเร็จ
                        </div>
                        <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.synced.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">ตัดสต็อกห้องยาแล้ว</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <TriangleAlert className="h-4 w-4 text-rose-500" />
                            สต็อกไม่พอตัด
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {stats.insufficient.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">รอยกยอด / เติมยา</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <XCircle className="h-4 w-4 text-amber-500" />
                            ข้อผิดพลาด / อื่นๆ
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.failed.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">ไม่สามารถตัดได้</div>
                    </div>
                </div>

                {/* Filter and Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
                    <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-end gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">ตั้งแต่วันที่</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-38"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">ถึงวันที่</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-38"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">สถานะการซิงก์</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="deducted">ตัดสต็อกสำเร็จ (Deducted)</option>
                                <option value="insufficient">สต็อกไม่พอ (Insufficient)</option>
                                <option value="failed">ล้มเหลว (Failed)</option>
                            </select>
                        </div>

                        <Button type="submit" variant="secondary" className="rounded-xl">
                            <Filter className="mr-1.5 h-4 w-4" />
                            กรอง
                        </Button>
                    </form>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleRetryAll}
                            disabled={isRetrying || stats.insufficient === 0}
                            className="rounded-xl hover:bg-rose-50 hover:text-rose-700"
                        >
                            <RotateCcw className={`mr-1.5 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                            ลองตัดใหม่ทั้งหมด (Retry)
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSyncToday}
                            disabled={isSyncing}
                            className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white"
                        >
                            <RefreshCw className={`mr-1.5 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'กำลังซิงก์...' : 'ซิงก์จ่ายยาวันนี้'}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-semibold">วันบริการ (vstdate)</th>
                                <th className="px-4 py-3 font-semibold">ผู้ป่วย (HN / VN)</th>
                                <th className="px-4 py-3 font-semibold">รายการยา (icode)</th>
                                <th className="px-4 py-3 font-semibold text-right">จำนวนจ่าย</th>
                                <th className="px-4 py-3 font-semibold text-center">สถานะ</th>
                                <th className="px-4 py-3 font-semibold">ข้อความ / หมายเหตุ</th>
                                <th className="px-4 py-3 font-semibold text-center">ดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {syncs.data.map((row) => (
                                <tr key={row.id} className="transition-colors hover:bg-muted/30">
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {row.vstdate}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <div className="font-mono font-bold text-foreground">HN {row.hn || '—'}</div>
                                        <div className="text-muted-foreground">VN {row.vn || '—'}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                                            <span>{row.item?.name || `รหัส ${row.icode}`}</span>
                                            {row.item?.item_type === 'nondrug' && (
                                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                                    📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono">
                                            {row.icode} {row.item?.strength ? `· ${row.item.strength}` : ''}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-foreground">
                                        {row.qty} {row.item?.unit || 'หน่วย'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {row.status === 'deducted' ? (
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                ตัดจ่ายสำเร็จ
                                            </span>
                                        ) : row.status === 'insufficient' ? (
                                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                                สต็อกไม่พอ
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                {row.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                                        {row.message || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {row.status !== 'deducted' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg text-xs hover:bg-violet-50 hover:text-violet-700"
                                                onClick={() => handleRetrySingle(row.id)}
                                            >
                                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                                ลองใหม่
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {syncs.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        ไม่พบประวัติการซิงก์ตัดจ่ายในช่วงวันที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {syncs.last_page > 1 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                            หน้า {syncs.current_page} จาก {syncs.last_page} (รวม {syncs.total} รายการ)
                        </div>
                        <div className="flex gap-1">
                            {syncs.prev_page_url && (
                                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                    <a href={syncs.prev_page_url}>ก่อนหน้า</a>
                                </Button>
                            )}
                            {syncs.next_page_url && (
                                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                    <a href={syncs.next_page_url}>ถัดไป</a>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
