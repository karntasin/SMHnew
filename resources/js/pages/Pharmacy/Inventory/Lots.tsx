import { FormEvent, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    CheckCircle2,
    Clock,
    Eye,
    Filter,
    Layers,
    Package,
    Pencil,
    Printer,
    QrCode,
    Search,
    ShieldAlert,
    Trash2,
    X,
} from 'lucide-react';

type Lot = {
    id: number;
    item_id: number;
    location_id: number;
    received_unit_id?: number | null;
    lot_no: string;
    qr_token: string;
    qr_payload: string;
    received_at?: string | null;
    expires_at?: string | null;
    qty_received: number;
    qty_remaining: number;
    status: string;
    supplier?: string | null;
    invoice_no?: string | null;
    invoice_date?: string | null;
    invoice_unit_price?: number | null;
    invoice_total_price?: number | null;
    received_package_qty?: number | null;
    received_unit?: string | null;
    unit_factor: number;
    notes?: string | null;
    item: {
        id?: number;
        icode?: string;
        name?: string;
        strength?: string;
        unit?: string;
        item_type?: 'drug' | 'nondrug' | string;
        item_type_label?: string;
    };
    location: {
        id?: number;
        name?: string;
        type?: string;
    };
};

type Location = {
    id: number;
    name: string;
    code?: string;
    type: string;
};

type Props = {
    lots: Lot[];
    locations: Location[];
    filters: {
        q?: string;
        location_id?: number | null;
        status?: string;
    };
};

const LOT_STATUS_CONFIG: Record<string, { label: string; color: string; badgeClass: string }> = {
    active: {
        label: 'ใช้งานปกติ',
        color: 'emerald',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    },
    depleted: {
        label: 'ยาหมดแล้ว',
        color: 'slate',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
    expired: {
        label: 'หมดอายุ',
        color: 'rose',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    },
    quarantine: {
        label: 'กักกัน/พักตรวจ',
        color: 'amber',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    },
    damaged: {
        label: 'ชำรุด/เสียหาย',
        color: 'orange',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    },
    returned: {
        label: 'ส่งคืนบริษัท',
        color: 'purple',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    },
};

export default function Lots({ lots, locations, filters }: Props) {
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;

    // Filter states
    const [q, setQ] = useState(filters.q || '');
    const [locationId, setLocationId] = useState(filters.location_id ? String(filters.location_id) : '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Dialog states
    const [editingLot, setEditingLot] = useState<Lot | null>(null);
    const [deletingLot, setDeletingLot] = useState<Lot | null>(null);

    // Edit form fields
    const [editForm, setEditForm] = useState({
        lot_no: '',
        location_id: '',
        status: 'active',
        received_at: '',
        expires_at: '',
        qty_remaining: '0',
        qty_received: '0',
        received_package_qty: '',
        unit_factor: '1',
        supplier: '',
        invoice_no: '',
        invoice_date: '',
        invoice_unit_price: '',
        invoice_total_price: '',
        notes: '',
        regenerate_qr: false,
        sync_stock: true,
    });

    // Delete options
    const [deleteAdjustBalance, setDeleteAdjustBalance] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Summary statistics
    const stats = useMemo(() => {
        const now = new Date();
        const ninetyDays = new Date();
        ninetyDays.setDate(now.getDate() + 90);

        let activeCount = 0;
        let expiringCount = 0;
        let expiredCount = 0;
        let depletedCount = 0;

        lots.forEach((lot) => {
            if (lot.status === 'active' && lot.qty_remaining > 0) {
                activeCount++;
            }
            if (lot.status === 'depleted' || lot.qty_remaining <= 0) {
                depletedCount++;
            }
            if (lot.expires_at) {
                const exp = new Date(lot.expires_at);
                if (exp < now) {
                    expiredCount++;
                } else if (exp <= ninetyDays && lot.qty_remaining > 0) {
                    expiringCount++;
                }
            }
        });

        return {
            total: lots.length,
            active: activeCount,
            expiring: expiringCount,
            expired: expiredCount,
            depleted: depletedCount,
        };
    }, [lots]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            route('pharmacy.inventory.lots'),
            {
                q: q || undefined,
                location_id: locationId || undefined,
                status: statusFilter || undefined,
            },
            { preserveState: true }
        );
    };

    const handleResetFilter = () => {
        setQ('');
        setLocationId('');
        setStatusFilter('');
        router.get(route('pharmacy.inventory.lots'));
    };

    const openEditModal = (lot: Lot) => {
        setEditingLot(lot);
        setEditForm({
            lot_no: lot.lot_no,
            location_id: String(lot.location_id),
            status: lot.status,
            received_at: lot.received_at || '',
            expires_at: lot.expires_at || '',
            qty_remaining: String(lot.qty_remaining),
            qty_received: String(lot.qty_received),
            received_package_qty: lot.received_package_qty !== null && lot.received_package_qty !== undefined ? String(lot.received_package_qty) : '',
            unit_factor: String(lot.unit_factor || 1),
            supplier: lot.supplier || '',
            invoice_no: lot.invoice_no || '',
            invoice_date: lot.invoice_date || '',
            invoice_unit_price: lot.invoice_unit_price !== null && lot.invoice_unit_price !== undefined ? String(lot.invoice_unit_price) : '',
            invoice_total_price: lot.invoice_total_price !== null && lot.invoice_total_price !== undefined ? String(lot.invoice_total_price) : '',
            notes: lot.notes || '',
            regenerate_qr: false,
            sync_stock: true,
        });
    };

    const handleUpdateSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingLot) return;
        setIsSaving(true);

        router.put(
            route('pharmacy.inventory.lots.update', editingLot.id),
            {
                lot_no: editForm.lot_no,
                location_id: Number(editForm.location_id),
                status: editForm.status,
                received_at: editForm.received_at || null,
                expires_at: editForm.expires_at || null,
                qty_remaining: Number(editForm.qty_remaining),
                qty_received: Number(editForm.qty_received),
                received_package_qty: editForm.received_package_qty ? Number(editForm.received_package_qty) : null,
                unit_factor: Number(editForm.unit_factor || 1),
                supplier: editForm.supplier || null,
                invoice_no: editForm.invoice_no || null,
                invoice_date: editForm.invoice_date || null,
                invoice_unit_price: editForm.invoice_unit_price ? Number(editForm.invoice_unit_price) : null,
                invoice_total_price: editForm.invoice_total_price ? Number(editForm.invoice_total_price) : null,
                notes: editForm.notes || null,
                regenerate_qr: editForm.regenerate_qr,
                sync_stock: editForm.sync_stock,
            },
            {
                onSuccess: () => {
                    setEditingLot(null);
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const handleDeleteSubmit = () => {
        if (!deletingLot) return;
        setIsDeleting(true);

        router.delete(route('pharmacy.inventory.lots.destroy', deletingLot.id), {
            data: {
                adjust_balance: deleteAdjustBalance,
            },
            onSuccess: () => {
                setDeletingLot(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
                { title: 'Lot / QR ยา' },
            ])}
        >
            <Head title="ระบบจัดการ LOT / QR ยา" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />

                {/* FLASH ALERT */}
                {(flash?.success || flash?.error) && (
                    <div
                        className={`rounded-2xl p-4 text-sm font-medium transition-all animate-in fade-in-50 ${
                            flash.error
                                ? 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                        }`}
                    >
                        {flash.error || flash.success}
                    </div>
                )}

                {/* HERO HEADER */}
                <div className="flex flex-col gap-4 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-purple-50/40 p-6 shadow-xs dark:border-violet-950 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                            <QrCode className="h-4 w-4" />
                            Drug Lot & QR Code Management
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            ระบบจัดการ LOT / QR ยา
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            ตรวจสอบ แก้ไขข้อมูล Lot, ลบ Lot ยา, สุ่ม QR Code ใหม่ และสั่งพิมพ์ฉลากยาประจำ Lot
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" className="rounded-xl border-violet-200 hover:bg-violet-50 dark:border-violet-800">
                            <Link href={route('pharmacy.inventory.labels')}>
                                <Printer className="mr-1.5 h-4 w-4 text-violet-600" />
                                พิมพ์ฉลากหลายดวง (Batch Labels)
                            </Link>
                        </Button>
                        <Button asChild className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white shadow-sm">
                            <Link href={route('pharmacy.inventory.scan')}>
                                <QrCode className="mr-1.5 h-4 w-4" />
                                สแกนบาร์โค้ดยา
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* SUMMARY STATS */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border bg-card p-4 shadow-2xs">
                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-slate-500" /> Lot ทั้งหมด
                        </div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-2xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
                        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> พร้อมใช้งาน (Active)
                        </div>
                        <div className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.active}</div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/20">
                        <div className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> ใกล้หมดอายุ (&le; 90 วัน)
                        </div>
                        <div className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.expiring}</div>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-2xs dark:border-rose-900/50 dark:bg-rose-950/20">
                        <div className="text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" /> หมดอายุแล้ว
                        </div>
                        <div className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">{stats.expired}</div>
                    </div>
                </div>

                {/* FILTER TOOLBAR */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-2xs md:flex-row md:items-center"
                >
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="ค้นหาชื่อยา, icode, หมายเลข Lot, หรือรหัส QR..."
                            className="pl-9 rounded-xl"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value)}
                            className="rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">ทุกคลัง / ทุกห้องยา</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name} {loc.type === 'main' ? '(คลังหลัก)' : '(ห้องยา)'}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">ทุกสถานะ</option>
                            <option value="active">ใช้งานปกติ (Active)</option>
                            <option value="expiring">ใกล้หมดอายุ (&le; 90 วัน)</option>
                            <option value="expired">หมดอายุแล้ว</option>
                            <option value="depleted">ยาหมดสต็อก</option>
                            <option value="quarantine">กักกัน / รอตรวจ</option>
                            <option value="damaged">ชำรุด / เสียหาย</option>
                            <option value="returned">ส่งคืนบริษัท</option>
                        </select>

                        <Button type="submit" className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white">
                            <Filter className="mr-1.5 h-4 w-4" />
                            กรอง
                        </Button>

                        {(q || locationId || statusFilter) && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleResetFilter}
                                className="rounded-xl text-muted-foreground hover:text-foreground"
                            >
                                <X className="mr-1 h-3.5 w-3.5" />
                                ล้างตัวกรอง
                            </Button>
                        )}
                    </div>
                </form>

                {/* LOTS GRID / LIST */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {lots.map((lot) => {
                        const isExpired = lot.expires_at ? new Date(lot.expires_at) < new Date() : false;
                        const statusConf = LOT_STATUS_CONFIG[lot.status] || {
                            label: lot.status,
                            badgeClass: 'bg-slate-100 text-slate-700',
                        };

                        return (
                            <div
                                key={lot.id}
                                className="group relative flex flex-col justify-between rounded-3xl border bg-card p-5 shadow-2xs transition-all hover:border-violet-300 hover:shadow-md dark:hover:border-violet-800"
                            >
                                <div>
                                    {/* Top badges: Location & Status */}
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                        <span className="font-semibold text-violet-700 dark:text-violet-400">
                                            {lot.location.name || 'ไม่ระบุคลัง'}
                                        </span>
                                        <span
                                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConf.badgeClass}`}
                                        >
                                            {statusConf.label}
                                        </span>
                                    </div>

                                    {/* Drug Name & icode */}
                                    <div className="mt-2.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h2 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-violet-700 dark:group-hover:text-violet-300">
                                                {lot.item.name}
                                            </h2>
                                            {lot.item.item_type === 'nondrug' && (
                                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                                    📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span className="font-mono">{lot.item.icode}</span>
                                            {lot.item.strength && <span>· {lot.item.strength}</span>}
                                        </div>
                                    </div>

                                    {/* Lot Details Grid */}
                                    <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-3 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">หมายเลข Lot:</span>
                                            <div className="font-mono font-bold text-foreground text-sm tracking-wide">
                                                {lot.lot_no}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">วันหมดอายุ:</span>
                                            <div
                                                className={`font-semibold flex items-center gap-1 ${
                                                    isExpired
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-foreground'
                                                }`}
                                            >
                                                {isExpired && <AlertTriangle className="h-3 w-3" />}
                                                {lot.expires_at || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">คงเหลือ:</span>
                                            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                                                {lot.qty_remaining.toLocaleString()} {lot.item.unit || 'หน่วย'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">รับเข้าเมื่อ:</span>
                                            <div className="text-foreground">{lot.received_at || '—'}</div>
                                        </div>
                                    </div>

                                    {/* Additional info (Supplier / Invoice) */}
                                    {(lot.supplier || lot.invoice_no) && (
                                        <div className="mt-2 text-[11px] text-muted-foreground line-clamp-1">
                                            {lot.supplier && <span>บ. {lot.supplier}</span>}
                                            {lot.invoice_no && <span> · เลขที่ {lot.invoice_no}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* ACTION BUTTONS */}
                                <div className="mt-4 pt-3 border-t flex items-center justify-between gap-1.5">
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl border-violet-200 hover:bg-violet-50 text-violet-700 dark:border-violet-900 dark:text-violet-300"
                                    >
                                        <Link href={route('pharmacy.inventory.lots.show', lot.id)}>
                                            <Eye className="mr-1 h-3.5 w-3.5" />
                                            ฉลาก QR
                                        </Link>
                                    </Button>

                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openEditModal(lot)}
                                            className="rounded-xl text-slate-700 hover:text-slate-900 dark:text-slate-200"
                                        >
                                            <Pencil className="mr-1 h-3.5 w-3.5 text-violet-600" />
                                            แก้ไข
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeletingLot(lot)}
                                            className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {lots.length === 0 && (
                        <div className="col-span-full rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
                            <Package className="mx-auto h-12 w-12 opacity-30" />
                            <p className="mt-2 font-medium">ไม่พบรายการ Lot ที่ค้นหา</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                ลองปรับเปลี่ยนคำค้นหา หรือเลือกตัวกรองคลัง/สถานะใหม่อีกครั้ง
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: EDIT LOT */}
            <Dialog open={Boolean(editingLot)} onOpenChange={(open) => !open && setEditingLot(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Pencil className="h-5 w-5 text-violet-600" />
                            แก้ไขข้อมูล Lot ยา
                        </DialogTitle>
                        <DialogDescription>
                            ปรับปรุงรายละเอียด Lot ยา, วันหมดอายุ, คลังจัดเก็บ และยอดคงเหลือ (ระบบจะซิงก์สต็อกให้อัตโนมัติ)
                        </DialogDescription>
                    </DialogHeader>

                    {editingLot && (
                        <form onSubmit={handleUpdateSubmit} className="space-y-4">
                            {/* Drug info banner */}
                            <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 text-xs text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                                <div className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                                    <span>{editingLot.item.name}</span>
                                    {editingLot.item.item_type === 'nondrug' && (
                                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                            📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                                    <span>icode: <b className="text-foreground">{editingLot.item.icode}</b></span>
                                    <span>หน่วยฐาน: <b className="text-violet-700 dark:text-violet-300">{editingLot.item.unit || 'หน่วย'}</b></span>
                                    <span>QR Token: <code className="font-mono text-[11px]">{editingLot.qr_token}</code></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Lot Number */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-lot-no">หมายเลข Lot No. *</Label>
                                    <Input
                                        id="edit-lot-no"
                                        value={editForm.lot_no}
                                        onChange={(e) => setEditForm({ ...editForm, lot_no: e.target.value })}
                                        required
                                        className="rounded-xl font-mono font-semibold"
                                    />
                                </div>

                                {/* Location */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-location">คลัง / ห้องยาจัดเก็บ *</Label>
                                    <select
                                        id="edit-location"
                                        value={editForm.location_id}
                                        onChange={(e) => setEditForm({ ...editForm, location_id: e.target.value })}
                                        required
                                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name} {loc.type === 'main' ? '(คลังหลัก)' : '(ห้องยา)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Expiry Date */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-expires-at">วันหมดอายุ (Expiry Date)</Label>
                                    <Input
                                        id="edit-expires-at"
                                        type="date"
                                        value={editForm.expires_at}
                                        onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Received Date */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-received-at">วันที่รับเข้า (Received Date)</Label>
                                    <Input
                                        id="edit-received-at"
                                        type="date"
                                        value={editForm.received_at}
                                        onChange={(e) => setEditForm({ ...editForm, received_at: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Qty Remaining */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-qty-remaining">
                                        จำนวนคงเหลือจริง ({editingLot.item.unit || 'หน่วยฐาน'}) *
                                    </Label>
                                    <Input
                                        id="edit-qty-remaining"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editForm.qty_remaining}
                                        onChange={(e) => setEditForm({ ...editForm, qty_remaining: e.target.value })}
                                        required
                                        className="rounded-xl font-bold text-emerald-700 dark:text-emerald-300"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        ยอดเดิม: {editingLot.qty_remaining} {editingLot.item.unit}
                                    </p>
                                </div>

                                {/* Qty Received */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-qty-received">
                                        จำนวนรับเข้ารวม ({editingLot.item.unit || 'หน่วยฐาน'})
                                    </Label>
                                    <Input
                                        id="edit-qty-received"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editForm.qty_received}
                                        onChange={(e) => setEditForm({ ...editForm, qty_received: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Status */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-status">สถานะ Lot</Label>
                                    <select
                                        id="edit-status"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="active">ใช้งานปกติ (Active)</option>
                                        <option value="depleted">ยาหมดสต็อก (Depleted)</option>
                                        <option value="expired">หมดอายุ (Expired)</option>
                                        <option value="quarantine">กักกัน / พักตรวจ (Quarantine)</option>
                                        <option value="damaged">ชำรุด / เสียหาย (Damaged)</option>
                                        <option value="returned">ส่งคืนบริษัท (Returned)</option>
                                    </select>
                                </div>

                                {/* Supplier */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-supplier">ผู้จัดจำหน่าย / บริษัท</Label>
                                    <Input
                                        id="edit-supplier"
                                        value={editForm.supplier}
                                        onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                                        placeholder="เช่น บ. ซิลลิค ฟาร์มา จำกัด"
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Invoice No */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-invoice-no">เลขที่ใบส่งของ / ใบกำกับภาษี</Label>
                                    <Input
                                        id="edit-invoice-no"
                                        value={editForm.invoice_no}
                                        onChange={(e) => setEditForm({ ...editForm, invoice_no: e.target.value })}
                                        placeholder="เช่น INV-6809001"
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Invoice Date */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-invoice-date">วันที่ใบส่งของ</Label>
                                    <Input
                                        id="edit-invoice-date"
                                        type="date"
                                        value={editForm.invoice_date}
                                        onChange={(e) => setEditForm({ ...editForm, invoice_date: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Unit Price */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-unit-price">ราคาต่อหน่วยรับเข้า (บาท)</Label>
                                    <Input
                                        id="edit-unit-price"
                                        type="number"
                                        step="0.0001"
                                        min="0"
                                        value={editForm.invoice_unit_price}
                                        onChange={(e) => setEditForm({ ...editForm, invoice_unit_price: e.target.value })}
                                        placeholder="0.0000"
                                        className="rounded-xl"
                                    />
                                </div>

                                {/* Total Price */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-total-price">ราคารวม (บาท)</Label>
                                    <Input
                                        id="edit-total-price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editForm.invoice_total_price}
                                        onChange={(e) => setEditForm({ ...editForm, invoice_total_price: e.target.value })}
                                        placeholder="0.00"
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-notes">หมายเหตุเพิ่มเติม</Label>
                                <Input
                                    id="edit-notes"
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    placeholder="ระบุหมายเหตุ เช่น ปรับปรุงข้อมูลตามใบตรวจรับ, แก้ไขปี พ.ศ. ผิด"
                                    className="rounded-xl"
                                />
                            </div>

                            {/* Options Checkboxes */}
                            <div className="rounded-2xl border bg-muted/40 p-3.5 space-y-2.5">
                                <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.sync_stock}
                                        onChange={(e) => setEditForm({ ...editForm, sync_stock: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <span>
                                        <b>ปรับปรุงยอดสต็อกคงคลังด้วย (Sync Stock Balance):</b> คำนวณผลต่างยอดคงเหลือเพื่อปรับยอดในคลังให้ตรงกันอัตโนมัติ
                                    </span>
                                </label>

                                <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.regenerate_qr}
                                        onChange={(e) => setEditForm({ ...editForm, regenerate_qr: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <span>
                                        <b>สุ่มสร้างรหัส QR Token ใหม่:</b> เปลี่ยนรหัส Token ประจำ Lot (สติกเกอร์ฉลากเดิมที่พิมพ์ไปแล้วจะใช้งานไม่ได้)
                                    </span>
                                </label>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingLot(null)}
                                    disabled={isSaving}
                                    className="rounded-xl"
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white"
                                >
                                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* MODAL: DELETE CONFIRMATION */}
            <Dialog open={Boolean(deletingLot)} onOpenChange={(open) => !open && setDeletingLot(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            ยืนยันการลบ Lot ยา
                        </DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบรายการ Lot และ QR Code นี้ออกจากระบบ?
                        </DialogDescription>
                    </DialogHeader>

                    {deletingLot && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100 space-y-1">
                                <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                                    <span>{deletingLot.item.name}</span>
                                    {deletingLot.item.item_type === 'nondrug' && (
                                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                            📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                        </span>
                                    )}
                                </div>
                                <div>หมายเลข Lot: <b className="font-mono">{deletingLot.lot_no}</b></div>
                                <div>สถานที่จัดเก็บ: <b>{deletingLot.location.name}</b></div>
                                <div>ยอดคงเหลือใน Lot: <b className="text-rose-700 dark:text-rose-300">{deletingLot.qty_remaining} {deletingLot.item.unit || 'หน่วย'}</b></div>
                            </div>

                            <div className="rounded-xl bg-muted/40 p-3">
                                <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={deleteAdjustBalance}
                                        onChange={(e) => setDeleteAdjustBalance(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <span>
                                        <b>ตัดลดยอดคงเหลือในคลังออกด้วย:</b> ปรับลดยอดคงคลัง ({deletingLot.qty_remaining} {deletingLot.item.unit || 'หน่วย'}) ตาม Lot นี้ เพื่อไม่ให้ยอดสต็อกรวมเกินจริง
                                    </span>
                                </label>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDeletingLot(null)}
                                    disabled={isDeleting}
                                    className="rounded-xl"
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDeleteSubmit}
                                    disabled={isDeleting}
                                    className="rounded-xl"
                                >
                                    {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ Lot'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
