import { FormEvent, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    History,
    Layers,
    Package,
    PlusCircle,
    RefreshCw,
    Search,
    Trash2,
    XCircle,
} from 'lucide-react';

type LotInfo = {
    id: number;
    lot_no: string;
    qty_remaining: number;
    expires_at: string | null;
    days_until_expiry: number | null;
};

type Row = {
    id: number;
    location_id: number;
    item_id: number;
    qty_on_hand: number;
    reorder_level: number;
    min_level: number;
    available: number;
    is_low: boolean;
    is_empty: boolean;
    nearest_expiry?: string | null;
    days_until_expiry?: number | null;
    expiry_status?: 'normal' | 'notice' | 'warning' | 'critical' | 'expired';
    active_lots_count?: number;
    lots?: LotInfo[];
    item: {
        id?: number;
        icode?: string;
        name?: string;
        item_type?: string;
        item_type_label?: string;
        income_code?: string;
        strength?: string;
        unit?: string;
        is_had?: boolean;
        is_cold_chain?: boolean;
        is_narcotic?: boolean;
        storage_temp?: string | null;
        had_alert_text?: string | null;
    };
    location: { id?: number; name?: string; type?: string };
};

type ServerStats = {
    total_items: number;
    total_active_lots: number;
    expiring_90d: number;
    critical_30d: number;
    expired: number;
    out_of_stock: number;
    drug_items?: number;
    nondrug_items?: number;
};

export default function Stock({
    rows,
    locations,
    filters,
    stats: serverStats,
}: {
    rows: Row[];
    locations: Array<{ id: number; name: string; type: string }>;
    filters: { location_id?: number | null; q?: string; special_type?: string; item_type?: string; expiry?: string };
    stats?: ServerStats;
}) {
    const [q, setQ] = useState(filters.q || '');
    const [locationId, setLocationId] = useState(filters.location_id ? String(filters.location_id) : '');
    const [specialType, setSpecialType] = useState(filters.special_type || '');
    const [itemType, setItemType] = useState(filters.item_type || 'all');
    const [expiry, setExpiry] = useState(filters.expiry || 'all');

    // State สำหรับการแก้ไข (Edit)
    const [editingRow, setEditingRow] = useState<Row | null>(null);
    const [editQty, setEditQty] = useState('');
    const [editMinLevel, setEditMinLevel] = useState('');
    const [editReorderLevel, setEditReorderLevel] = useState('');
    const [editNote, setEditNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // State สำหรับการลบ (Delete)
    const [deletingRow, setDeletingRow] = useState<Row | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // State สำหรับดูรายละเอียด Lot
    const [viewingLotsRow, setViewingLotsRow] = useState<Row | null>(null);

    // State สำหรับการซิงก์ความถูกต้อง (Reconcile)
    const [isReconciling, setIsReconciling] = useState(false);

    const stats = useMemo(() => {
        const totalItems = serverStats?.total_items ?? rows.length;
        const totalQty = rows.reduce((sum, r) => sum + (Number(r.qty_on_hand) || 0), 0);
        const lowCount = rows.filter((r) => r.is_low && !r.is_empty).length;
        const emptyCount = serverStats?.out_of_stock ?? rows.filter((r) => r.is_empty).length;
        const activeLots = serverStats?.total_active_lots ?? rows.reduce((sum, r) => sum + (r.active_lots_count || 0), 0);
        const expiring90 = serverStats?.expiring_90d ?? rows.filter((r) => r.days_until_expiry !== null && r.days_until_expiry <= 90 && r.days_until_expiry >= 0).length;
        const critical30 = serverStats?.critical_30d ?? rows.filter((r) => r.days_until_expiry !== null && r.days_until_expiry <= 30 && r.days_until_expiry >= 0).length;
        const expiredCount = serverStats?.expired ?? rows.filter((r) => r.days_until_expiry !== null && r.days_until_expiry < 0).length;

        return { totalItems, totalQty, lowCount, emptyCount, activeLots, expiring90, critical30, expiredCount };
    }, [rows, serverStats]);

    const executeSearch = (newParams?: { q?: string; location_id?: string; special_type?: string; item_type?: string; expiry?: string }) => {
        const p = {
            q: newParams?.q !== undefined ? newParams.q : q,
            location_id: newParams?.location_id !== undefined ? newParams.location_id : locationId,
            special_type: newParams?.special_type !== undefined ? newParams.special_type : specialType,
            item_type: newParams?.item_type !== undefined ? newParams.item_type : itemType,
            expiry: newParams?.expiry !== undefined ? newParams.expiry : expiry,
        };
        router.get(route('pharmacy.inventory.stock'), {
            q: p.q || undefined,
            location_id: p.location_id || undefined,
            special_type: p.special_type || undefined,
            item_type: p.item_type && p.item_type !== 'all' ? p.item_type : undefined,
            expiry: p.expiry && p.expiry !== 'all' ? p.expiry : undefined,
        }, { preserveState: true });
    };

    const search = (e: FormEvent) => {
        e.preventDefault();
        executeSearch();
    };

    const handleReconcile = () => {
        if (isReconciling) return;
        setIsReconciling(true);
        router.post(
            route('pharmacy.inventory.stock.reconcile'),
            { location_id: locationId || undefined },
            {
                preserveScroll: true,
                onFinish: () => setIsReconciling(false),
            }
        );
    };

    const openEdit = (r: Row) => {
        setEditingRow(r);
        setEditQty(String(r.qty_on_hand));
        setEditMinLevel(String(r.min_level));
        setEditReorderLevel(String(r.reorder_level));
        setEditNote('');
    };

    const handleUpdate = (e: FormEvent) => {
        e.preventDefault();
        if (!editingRow) return;
        setIsSaving(true);
        router.patch(
            route('pharmacy.inventory.balances.update', editingRow.id),
            {
                qty_on_hand: parseFloat(editQty) || 0,
                min_level: parseFloat(editMinLevel) || 0,
                reorder_level: parseFloat(editReorderLevel) || 0,
                note: editNote || 'ปรับยอดคงเหลือผ่านหน้าคงเหลือ',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingRow(null);
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            },
        );
    };

    const handleDelete = () => {
        if (!deletingRow) return;
        setIsDeleting(true);
        router.delete(
            route('pharmacy.inventory.balances.destroy', deletingRow.id),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDeletingRow(null);
                    setIsDeleting(false);
                },
                onError: () => {
                    setIsDeleting(false);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'คงเหลือ' },
        ])}>
            <Head title="คงเหลือยา & Lot" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <button
                        type="button"
                        onClick={() => {
                            setExpiry('all');
                            executeSearch({ expiry: 'all' });
                        }}
                        className={`rounded-2xl border p-4 text-left shadow-xs transition-all hover:scale-[1.01] ${
                            expiry === 'all' ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20' : 'border-border bg-card'
                        }`}
                    >
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Package className="h-4 w-4 text-violet-600" />
                            รายการยาในคลัง
                        </div>
                        <div className="mt-2 text-2xl font-bold text-foreground">{stats.totalItems.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">รวม {stats.activeLots} Lot ใช้งาน</div>
                    </button>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ยอดรวมทุกหน่วย
                        </div>
                        <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">ชิ้น/เม็ด/ขวด</div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const next = expiry === 'expiring_90' ? 'all' : 'expiring_90';
                            setExpiry(next);
                            executeSearch({ expiry: next });
                        }}
                        className={`rounded-2xl border p-4 text-left shadow-xs transition-all hover:scale-[1.01] ${
                            expiry === 'expiring_90' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20' : 'border-border bg-card'
                        }`}
                    >
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Clock className="h-4 w-4 text-orange-500" />
                            ใกล้หมดอายุ (≤90 วัน)
                        </div>
                        <div className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.expiring90}</div>
                        <div className="text-xs text-muted-foreground">
                            {stats.critical30 > 0 ? `วิกฤต ${stats.critical30} รายการ` : 'คลิกเพื่อกรอง'}
                        </div>
                    </button>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            สต็อกเหลือน้อย
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.lowCount}</div>
                        <div className="text-xs text-muted-foreground">ถึงเกณฑ์สั่งซื้อ</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <XCircle className="h-4 w-4 text-rose-500" />
                            หมดสต็อก
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.emptyCount}</div>
                        <div className="text-xs text-muted-foreground">ยอดเป็น 0</div>
                    </div>
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
                    <form onSubmit={search} className="flex flex-1 flex-wrap items-center gap-2">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="ค้นหาชื่อยา หรือ icode..."
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={itemType}
                            onChange={(e) => {
                                setItemType(e.target.value);
                                executeSearch({ item_type: e.target.value });
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring font-medium"
                        >
                            <option value="all">ประเภท: ทั้งหมด</option>
                            <option value="drug">💊 เฉพาะยา</option>
                            <option value="nondrug">📦 ค่าเวชภัณฑ์ที่มิใช่ยา</option>
                        </select>
                        <select
                            value={locationId}
                            onChange={(e) => {
                                setLocationId(e.target.value);
                                executeSearch({ location_id: e.target.value });
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">ทุกสถานที่ / คลัง</option>
                            {locations.map((l) => (
                                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                            ))}
                        </select>
                        <select
                            value={specialType}
                            onChange={(e) => {
                                setSpecialType(e.target.value);
                                executeSearch({ special_type: e.target.value });
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">กลุ่มยาความเสี่ยง HA ทั้งหมด</option>
                            <option value="had">⚠️ ยาเสี่ยงสูง (HAD)</option>
                            <option value="cold_chain">❄️ ยาแช่เย็น (Cold Chain)</option>
                            <option value="narcotic">🔒 ยาเสพติด/ออกฤทธิ์</option>
                        </select>
                        <select
                            value={expiry}
                            onChange={(e) => {
                                setExpiry(e.target.value);
                                executeSearch({ expiry: e.target.value });
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="all">สถานะวันหมดอายุทั้งหมด</option>
                            <option value="expiring_90">🟡 ใกล้หมดอายุ (≤ 90 วัน)</option>
                            <option value="critical_30">🟠 วิกฤตใกล้หมดอายุ (≤ 30 วัน)</option>
                            <option value="expired">🔴 หมดอายุแล้ว</option>
                        </select>
                        <Button type="submit" className="rounded-xl bg-violet-700 hover:bg-violet-800">
                            ค้นหา
                        </Button>
                        {(q || locationId || specialType || itemType !== 'all' || expiry !== 'all') && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setQ('');
                                    setLocationId('');
                                    setSpecialType('');
                                    setItemType('all');
                                    setExpiry('all');
                                    router.get(route('pharmacy.inventory.stock'), {}, { preserveState: true });
                                }}
                            >
                                ล้างค้นหา
                            </Button>
                        )}
                    </form>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            className="rounded-xl border-violet-200 hover:bg-violet-50 text-violet-900 dark:border-violet-800 dark:text-violet-200"
                            onClick={handleReconcile}
                            disabled={isReconciling}
                        >
                            <RefreshCw className={`mr-1.5 h-4 w-4 ${isReconciling ? 'animate-spin text-violet-600' : ''}`} />
                            {isReconciling ? 'กำลังซิงก์...' : 'ซิงก์สต็อก & Lot'}
                        </Button>
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href={route('pharmacy.inventory.movements')}>
                                <History className="mr-1.5 h-4 w-4" />
                                ประวัติเคลื่อนไหว
                            </Link>
                        </Button>
                        <Button asChild className="rounded-xl bg-violet-700 hover:bg-violet-800">
                            <Link href={route('pharmacy.inventory.receive')}>
                                <PlusCircle className="mr-1.5 h-4 w-4" />
                                รับเข้ายา/เวชภัณฑ์
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-semibold">สถานที่</th>
                                <th className="px-4 py-3 font-semibold">รายการยา / เวชภัณฑ์</th>
                                <th className="px-4 py-3 font-semibold text-right">คงเหลือ</th>
                                <th className="px-4 py-3 font-semibold">Lot & วันหมดอายุ</th>
                                <th className="px-4 py-3 font-semibold">เกณฑ์ Min/Reorder</th>
                                <th className="px-4 py-3 font-semibold text-center">สถานะ</th>
                                <th className="px-4 py-3 font-semibold text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {rows.map((r) => (
                                <tr key={r.id} className="transition-colors hover:bg-muted/40">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                            {r.location.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <div className="font-medium text-foreground">{r.item.name}</div>
                                            {r.item.item_type === 'nondrug' ? (
                                                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300">
                                                    ค่าเวชภัณฑ์ที่มิใช่ยา
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300">
                                                    ยา
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            รหัส: {r.item.icode} {r.item.strength ? `· ${r.item.strength}` : ''}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {r.item.is_had && (
                                                <span
                                                    className="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                                                    title={r.item.had_alert_text || 'High Alert Drug'}
                                                >
                                                    HAD
                                                </span>
                                            )}
                                            {r.item.is_cold_chain && (
                                                <span className="inline-flex items-center rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                                                    ❄️ {r.item.storage_temp || '2-8°C'}
                                                </span>
                                            )}
                                            {r.item.is_narcotic && (
                                                <span className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                                                    🔒 เสพติด/ออกฤทธิ์
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-semibold text-base text-foreground">
                                            {r.available.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {r.item.unit || 'หน่วย'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        {r.active_lots_count && r.active_lots_count > 0 ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    {r.expiry_status === 'expired' && (
                                                        <span className="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
                                                            🔴 หมดอายุแล้ว
                                                        </span>
                                                    )}
                                                    {r.expiry_status === 'critical' && (
                                                        <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                                            🟠 ใกล้หมดอายุ (อีก {r.days_until_expiry} วัน)
                                                        </span>
                                                    )}
                                                    {r.expiry_status === 'warning' && (
                                                        <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                            🟡 เฝ้าระวัง (อีก {r.days_until_expiry} วัน)
                                                        </span>
                                                    )}
                                                    {r.expiry_status === 'notice' && (
                                                        <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                                            🔵 {r.nearest_expiry} ({r.days_until_expiry} วัน)
                                                        </span>
                                                    )}
                                                    {r.expiry_status === 'normal' && (
                                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                            🟢 {r.nearest_expiry || 'ไม่มีวันหมดอายุ'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">
                                                        Lot: <b className="text-foreground">{r.lots?.[0]?.lot_no || '-'}</b>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingLotsRow(r)}
                                                        className="text-[11px] font-medium text-violet-700 hover:underline dark:text-violet-400"
                                                    >
                                                        (ดู {r.active_lots_count} Lot)
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground italic">
                                                — ไม่มีบันทึก Lot
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        <div>Min: <span className="font-medium text-foreground">{r.min_level}</span></div>
                                        <div>ขั้นต่ำสั่งซื้อ: <span className="font-medium text-foreground">{r.reorder_level}</span></div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {r.is_empty ? (
                                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                                หมดสต็อก
                                            </span>
                                        ) : r.is_low ? (
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                เหลือน้อย
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                ปกติ
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg px-2 text-xs font-medium hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50"
                                                title="ดูบัตรคุมยา (Stock Card)"
                                            >
                                                <Link href={route('pharmacy.inventory.stock-card', { icode: r.item.icode, location_id: r.location_id })}>
                                                    บัตรคุม
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg px-2.5 text-xs font-medium hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50"
                                                onClick={() => openEdit(r)}
                                                title="แก้ไขยอดและเกณฑ์คงเหลือ"
                                            >
                                                <Edit className="mr-1 h-3.5 w-3.5" />
                                                แก้ไข
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                                onClick={() => setDeletingRow(r)}
                                                title="ลบรายการคงเหลือและปิด Lot ในคลังนี้"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                        <Package className="mx-auto h-8 w-8 opacity-40 mb-2" />
                                        ไม่พบข้อมูลคงเหลือยาในเกณฑ์ที่ค้นหา
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: ดูรายการ Lot ทั้งหมดของยา */}
            <Dialog open={Boolean(viewingLotsRow)} onOpenChange={(open) => !open && setViewingLotsRow(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-violet-600" />
                            รายการ Lot ยาในสต็อก
                        </DialogTitle>
                        <DialogDescription>
                            {viewingLotsRow?.item.name} ({viewingLotsRow?.location.name})
                        </DialogDescription>
                    </DialogHeader>

                    {viewingLotsRow && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-sm dark:border-violet-900/50 dark:bg-violet-950/30">
                                <div className="flex items-center justify-between font-semibold text-violet-950 dark:text-violet-100">
                                    <span>{viewingLotsRow.item.name}</span>
                                    <span>คงเหลือรวม: {viewingLotsRow.qty_on_hand} {viewingLotsRow.item.unit || 'หน่วย'}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    รหัสยา: {viewingLotsRow.item.icode} · จัดเก็บที่: {viewingLotsRow.location.name}
                                </div>
                            </div>

                            <div className="max-h-72 overflow-y-auto space-y-2">
                                {viewingLotsRow.lots && viewingLotsRow.lots.length > 0 ? (
                                    viewingLotsRow.lots.map((lot) => (
                                        <div key={lot.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                                            <div>
                                                <div className="font-semibold text-foreground flex items-center gap-2">
                                                    <span>Lot: {lot.lot_no}</span>
                                                    {lot.days_until_expiry !== null && (
                                                        lot.days_until_expiry < 0 ? (
                                                            <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">หมดอายุ</span>
                                                        ) : lot.days_until_expiry <= 30 ? (
                                                            <span className="rounded-md bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">เหลือ {lot.days_until_expiry} วัน</span>
                                                        ) : lot.days_until_expiry <= 90 ? (
                                                            <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">เหลือ {lot.days_until_expiry} วัน</span>
                                                        ) : (
                                                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">ปกติ</span>
                                                        )
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3" />
                                                    วันหมดอายุ: {lot.expires_at || 'ไม่ระบุ'}
                                                </div>
                                            </div>
                                            <div className="text-right font-medium text-foreground">
                                                <div>{lot.qty_remaining} {viewingLotsRow.item.unit || 'หน่วย'}</div>
                                                <Link
                                                    href={route('pharmacy.inventory.lots.show', lot.id)}
                                                    className="text-[11px] text-violet-600 hover:underline"
                                                >
                                                    ดู QR / บาร์โค้ด →
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        ไม่พบข้อมูล Lot ยาที่บันทึก
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setViewingLotsRow(null)}>
                                    ปิด
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: แก้ไขยอดคงเหลือและเกณฑ์สต็อก */}
            <Dialog open={Boolean(editingRow)} onOpenChange={(open) => !open && setEditingRow(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>แก้ไขยอดคงเหลือ / เกณฑ์สต็อก</DialogTitle>
                        <DialogDescription>
                            ปรับปรุงยอดคงเหลือจริงและเกณฑ์เตือนสต็อกของยา (ระบบจะปรับปรุง Lot อัตโนมัติ)
                        </DialogDescription>
                    </DialogHeader>

                    {editingRow && (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                                <div className="font-semibold">{editingRow.item.name}</div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span>รหัส: <b className="text-foreground">{editingRow.item.icode}</b></span>
                                    <span>คลัง: <b className="text-foreground">{editingRow.location.name}</b></span>
                                    <span>หน่วย: <b className="text-violet-700 dark:text-violet-300">{editingRow.item.unit || 'หน่วย'}</b></span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-qty">
                                    จำนวนคงเหลือจริง ({editingRow.item.unit || 'หน่วย'}) *
                                </Label>
                                <Input
                                    id="edit-qty"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    required
                                    placeholder="ระบุจำนวนคงเหลือจริง"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    ยอดเดิมในระบบ: {editingRow.qty_on_hand} {editingRow.item.unit || 'หน่วย'} (ระบบจะบันทึก audit log และซิงก์ Lot ยา)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-min">เกณฑ์ขั้นต่ำ (Min)</Label>
                                    <Input
                                        id="edit-min"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editMinLevel}
                                        onChange={(e) => setEditMinLevel(e.target.value)}
                                        placeholder="เช่น 20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-reorder">ขั้นต่ำที่ต้องสั่งซื้อ (Reorder)</Label>
                                    <Input
                                        id="edit-reorder"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editReorderLevel}
                                        onChange={(e) => setEditReorderLevel(e.target.value)}
                                        placeholder="เช่น 50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-note">เหตุผลในการปรับยอด (หมายเหตุ)</Label>
                                <Input
                                    id="edit-note"
                                    value={editNote}
                                    onChange={(e) => setEditNote(e.target.value)}
                                    placeholder="เช่น ตรวจนับสต็อกจริง, สินค้าชำรุด, นับสต็อกประจำปี"
                                />
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingRow(null)}
                                    disabled={isSaving}
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-violet-700 hover:bg-violet-800"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: ยืนยันการลบยอดคงเหลือ */}
            <Dialog open={Boolean(deletingRow)} onOpenChange={(open) => !open && setDeletingRow(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-rose-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            ยืนยันการลบรายการคงเหลือ
                        </DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบรายการยอดคงเหลือนี้ออกจากระบบ?
                        </DialogDescription>
                    </DialogHeader>

                    {deletingRow && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                                <div className="font-semibold">{deletingRow.item.name}</div>
                                <div className="mt-1 text-xs text-rose-800 dark:text-rose-200">
                                    สถานที่: <b>{deletingRow.location.name}</b> · ยอดคงเหลือปัจจุบัน: <b>{deletingRow.qty_on_hand} {deletingRow.item.unit || 'หน่วย'}</b>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                ⚠️ <b>คำเตือน:</b> การลบรายการนี้จะปรับยอดคงเหลือให้กลายเป็น 0, <b>ปิด Lot ยาที่ค้างอยู่ในคลังนี้ทั้งหมด</b> เพื่อป้องกันการแจ้งเตือนตกค้าง, และบันทึก audit movement
                            </p>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDeletingRow(null)}
                                    disabled={isDeleting}
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบรายการ'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
