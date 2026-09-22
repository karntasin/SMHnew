import { FormEvent, useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import QRCode from 'qrcode';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Pencil,
    Printer,
    QrCode,
    RefreshCw,
    Tag,
    Trash2,
} from 'lucide-react';

type Lot = {
    id: number;
    item_id?: number;
    location_id?: number;
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
        code?: string;
        type?: string;
    };
    received_by?: string | null;
};

type Location = {
    id: number;
    name: string;
    code?: string;
    type: string;
};

type Props = {
    lot: Lot;
    locations?: Location[];
    hospitalName?: string;
};

export default function LotShow({
    lot,
    locations = [],
    hospitalName = 'โรงพยาบาลค่ายสุรสิงหนาท',
}: Props) {
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;
    const [qrUrl, setQrUrl] = useState<string>('');

    // Modal states
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteAdjustBalance, setDeleteAdjustBalance] = useState(true);

    // Edit form fields
    const [editForm, setEditForm] = useState({
        lot_no: lot.lot_no,
        location_id: String(lot.location_id || lot.location?.id || ''),
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

    useEffect(() => {
        QRCode.toDataURL(lot.qr_payload, {
            width: 180,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
        }).then(setQrUrl).catch(console.error);

        // Keep form in sync when lot prop updates
        setEditForm({
            lot_no: lot.lot_no,
            location_id: String(lot.location_id || lot.location?.id || ''),
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
    }, [lot]);

    const printLabel = () => window.print();

    const handleUpdateSubmit = (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.put(
            route('pharmacy.inventory.lots.update', lot.id),
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
                    setIsEditOpen(false);
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const handleDeleteSubmit = () => {
        setIsDeleting(true);
        router.delete(route('pharmacy.inventory.lots.destroy', lot.id), {
            data: {
                adjust_balance: deleteAdjustBalance,
            },
            onSuccess: () => {
                setIsDeleteOpen(false);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    const handleRegenerateQr = () => {
        router.post(
            route('pharmacy.inventory.lots.regenerate-qr', lot.id),
            {},
            {
                onSuccess: () => {
                    setIsRegenerateOpen(false);
                },
            }
        );
    };

    const isExpired = lot.expires_at ? new Date(lot.expires_at) < new Date() : false;

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
                { title: 'Lot / QR ยา', href: route('pharmacy.inventory.lots') },
                { title: `Lot ${lot.lot_no}` },
            ])}
        >
            <Head title={`Lot ${lot.lot_no} - ${lot.item.name}`} />

            {/* PRINT ONLY: แสดงเฉพาะสติ๊กเกอร์ QR ยาตามรูปแบบที่กำหนด */}
            <div
                className="hidden print:flex items-center justify-between rounded-lg border border-black p-3 bg-white text-slate-900 mx-auto"
                style={{ width: '300px', minHeight: '100px', pageBreakInside: 'avoid' }}
            >
                <div className="flex-1 pr-2 space-y-1">
                    <div className="text-[10px] font-bold text-slate-600">
                        {hospitalName || 'โรงพยาบาลค่ายสุรสิงหนาท'}
                    </div>
                    <div className="text-xs font-black line-clamp-2 text-slate-900 leading-tight">
                        {lot.item.name}
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium">
                        ขนาด: <span className="font-bold text-slate-900">{lot.item.strength || lot.item.unit || '—'}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800">
                        วันหมดอายุ: <span className="font-mono">{lot.expires_at || '—'}</span>
                    </div>
                </div>
                <div className="text-center shrink-0">
                    {qrUrl ? (
                        <img src={qrUrl} alt="QR Code" className="h-16 w-16 border border-slate-300 rounded" />
                    ) : (
                        <div className="h-16 w-16 bg-slate-100 rounded" />
                    )}
                </div>
            </div>

            {/* SCREEN VIEW */}
            <div className="container mx-auto space-y-6 px-4 py-6 print:hidden">
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

                {/* TOP BACK LINK & ACTIONS */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button asChild variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-foreground">
                        <Link href={route('pharmacy.inventory.lots')}>
                            <ArrowLeft className="mr-1.5 h-4 w-4" />
                            กลับไปยังรายการ LOT / QR ทั้งหมด
                        </Link>
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditOpen(true)}
                            className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300"
                        >
                            <Pencil className="mr-1.5 h-4 w-4 text-violet-600" />
                            แก้ไขข้อมูล Lot
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRegenerateOpen(true)}
                            className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                        >
                            <RefreshCw className="mr-1.5 h-4 w-4 text-amber-600" />
                            สร้าง QR Token ใหม่
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDeleteOpen(true)}
                            className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/40"
                        >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            ลบ Lot นี้
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
                    {/* LEFT: QR STICKER CARD & PRINT */}
                    <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <Tag className="h-4 w-4 text-violet-600" />
                            ตัวอย่างสติ๊กเกอร์ QR ฉลากยา
                        </div>

                        {/* STICKER CARD PREVIEW */}
                        <div className="rounded-2xl border border-slate-900 bg-white p-3.5 shadow-xs text-slate-900 flex items-center justify-between">
                            <div className="flex-1 pr-2 space-y-1">
                                <div className="text-[10px] font-bold text-slate-600">
                                    {hospitalName || 'โรงพยาบาลค่ายสุรสิงหนาท'}
                                </div>
                                <div className="text-xs font-black line-clamp-2 text-slate-900 leading-tight">
                                    {lot.item.name}
                                </div>
                                <div className="text-[11px] text-slate-700 font-medium">
                                    ขนาด: <span className="font-bold text-slate-900">{lot.item.strength || lot.item.unit || '—'}</span>
                                </div>
                                <div className="text-[11px] font-bold text-slate-800">
                                    วันหมดอายุ: <span className="font-mono">{lot.expires_at || '—'}</span>
                                </div>
                            </div>
                            <div className="text-center shrink-0">
                                {qrUrl ? (
                                    <img src={qrUrl} alt="QR Code" className="h-16 w-16 border border-slate-300 rounded" />
                                ) : (
                                    <div className="h-16 w-16 bg-slate-100 animate-pulse rounded" />
                                )}
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={printLabel}
                            className="w-full rounded-xl bg-violet-700 hover:bg-violet-800 text-white shadow-sm"
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            พิมพ์ฉลาก QR ดวงนี้
                        </Button>

                        <div className="rounded-2xl bg-muted/40 p-3 text-xs space-y-1">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <QrCode className="h-3.5 w-3.5 text-violet-600" /> ข้อมูล Payload QR
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground break-all">
                                {lot.qr_payload}
                            </div>
                        </div>

                        <div className="pt-1 text-center">
                            <Link href={route('pharmacy.inventory.labels')} className="text-xs text-violet-600 hover:underline">
                                ไปที่หน้าพิมพ์ฉลากยาหลายดวง (Batch Labels) →
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT: LOT INFORMATION DETAIL */}
                    <div className="rounded-3xl border bg-card p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-bold text-foreground">{lot.item.name}</h1>
                                    {lot.item.item_type === 'nondrug' && (
                                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                            📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium">{lot.item.icode}</span>
                                    {lot.item.strength && <span>· {lot.item.strength}</span>}
                                    <span>· หน่วยฐาน: {lot.item.unit}</span>
                                </div>
                            </div>

                            <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                    lot.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                        : lot.status === 'expired'
                                        ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                            >
                                {lot.status === 'active' ? 'พร้อมใช้งาน (Active)' : lot.status}
                            </span>
                        </div>

                        <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">หมายเลข Lot No.</dt>
                                <dd className="font-mono text-base font-bold text-foreground mt-0.5">{lot.lot_no}</dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">สถานที่จัดเก็บ</dt>
                                <dd className="font-semibold text-foreground mt-0.5">{lot.location.name}</dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">วันที่รับเข้า</dt>
                                <dd className="font-semibold text-foreground mt-0.5">{lot.received_at || '—'}</dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">วันหมดอายุ</dt>
                                <dd
                                    className={`font-semibold mt-0.5 flex items-center gap-1.5 ${
                                        isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                                    }`}
                                >
                                    {isExpired && <AlertTriangle className="h-4 w-4" />}
                                    {lot.expires_at || '—'}
                                    {isExpired && <span className="text-xs font-normal">(หมดอายุแล้ว)</span>}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">รับเข้าตามใบส่งของ</dt>
                                <dd className="font-semibold text-foreground mt-0.5">
                                    {lot.received_package_qty ?? lot.qty_received} {lot.received_unit || lot.item.unit}{' '}
                                    {lot.unit_factor > 1 ? `(× ${lot.unit_factor})` : ''}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-3">
                                <dt className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">คงเหลือหน่วยฐาน</dt>
                                <dd className="text-base font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
                                    {lot.qty_remaining.toLocaleString()} {lot.item.unit}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">ผู้จัดจำหน่าย / บริษัท</dt>
                                <dd className="font-semibold text-foreground mt-0.5">{lot.supplier || '—'}</dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">เลขที่ใบส่งของ / ใบกำกับ</dt>
                                <dd className="font-semibold text-foreground mt-0.5">{lot.invoice_no || '—'}</dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">วันที่ใบส่งของ</dt>
                                <dd className="font-semibold text-foreground mt-0.5">{lot.invoice_date || '—'}</dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">ราคาต่อหน่วยรับเข้า</dt>
                                <dd className="font-semibold text-foreground mt-0.5">
                                    {lot.invoice_unit_price !== null && lot.invoice_unit_price !== undefined
                                        ? `${lot.invoice_unit_price.toLocaleString()} บาท`
                                        : '—'}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">ราคารวม</dt>
                                <dd className="font-semibold text-foreground mt-0.5">
                                    {lot.invoice_total_price !== null && lot.invoice_total_price !== undefined
                                        ? `${lot.invoice_total_price.toLocaleString()} บาท`
                                        : '—'}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-muted/20 p-3">
                                <dt className="text-xs text-muted-foreground">ผู้บันทึกรับเข้า</dt>
                                <dd className="font-semibold text-foreground mt-0.5">{lot.received_by || '—'}</dd>
                            </div>
                        </dl>

                        {lot.notes && (
                            <div className="mt-5 rounded-2xl bg-muted/30 p-4 text-xs text-foreground">
                                <div className="font-semibold text-muted-foreground mb-1">หมายเหตุ:</div>
                                {lot.notes}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL: EDIT LOT */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Pencil className="h-5 w-5 text-violet-600" />
                            แก้ไขข้อมูล Lot ยา
                        </DialogTitle>
                        <DialogDescription>
                            ปรับปรุงข้อมูลประจำ Lot {lot.lot_no} และจัดการยอดคงเหลือ (ระบบจะซิงก์สต็อกให้อัตโนมัติ)
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateSubmit} className="space-y-4">
                        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 text-xs text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                            <div className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                                <span>{lot.item.name}</span>
                                {lot.item.item_type === 'nondrug' && (
                                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                        📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                    </span>
                                )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                                <span>icode: <b className="text-foreground">{lot.item.icode}</b></span>
                                <span>หน่วยฐาน: <b className="text-violet-700 dark:text-violet-300">{lot.item.unit || 'หน่วย'}</b></span>
                                <span>QR Token: <code className="font-mono text-[11px]">{lot.qr_token}</code></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-lot-no">หมายเลข Lot No. *</Label>
                                <Input
                                    id="edit-show-lot-no"
                                    value={editForm.lot_no}
                                    onChange={(e) => setEditForm({ ...editForm, lot_no: e.target.value })}
                                    required
                                    className="rounded-xl font-mono font-semibold"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-location">คลัง / ห้องยาจัดเก็บ *</Label>
                                <select
                                    id="edit-show-location"
                                    value={editForm.location_id}
                                    onChange={(e) => setEditForm({ ...editForm, location_id: e.target.value })}
                                    required
                                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {locations.length > 0 ? (
                                        locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name} {loc.type === 'main' ? '(คลังหลัก)' : '(ห้องยา)'}
                                            </option>
                                        ))
                                    ) : (
                                        <option value={lot.location_id || ''}>{lot.location.name}</option>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-expires-at">วันหมดอายุ (Expiry Date)</Label>
                                <Input
                                    id="edit-show-expires-at"
                                    type="date"
                                    value={editForm.expires_at}
                                    onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-received-at">วันที่รับเข้า (Received Date)</Label>
                                <Input
                                    id="edit-show-received-at"
                                    type="date"
                                    value={editForm.received_at}
                                    onChange={(e) => setEditForm({ ...editForm, received_at: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-qty-remaining">
                                    จำนวนคงเหลือจริง ({lot.item.unit || 'หน่วยฐาน'}) *
                                </Label>
                                <Input
                                    id="edit-show-qty-remaining"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editForm.qty_remaining}
                                    onChange={(e) => setEditForm({ ...editForm, qty_remaining: e.target.value })}
                                    required
                                    className="rounded-xl font-bold text-emerald-700 dark:text-emerald-300"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    ยอดเดิม: {lot.qty_remaining} {lot.item.unit}
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-qty-received">
                                    จำนวนรับเข้ารวม ({lot.item.unit || 'หน่วยฐาน'})
                                </Label>
                                <Input
                                    id="edit-show-qty-received"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editForm.qty_received}
                                    onChange={(e) => setEditForm({ ...editForm, qty_received: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-status">สถานะ Lot</Label>
                                <select
                                    id="edit-show-status"
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

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-supplier">ผู้จัดจำหน่าย / บริษัท</Label>
                                <Input
                                    id="edit-show-supplier"
                                    value={editForm.supplier}
                                    onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                                    placeholder="เช่น บ. ซิลลิค ฟาร์มา จำกัด"
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-invoice-no">เลขที่ใบส่งของ / ใบกำกับภาษี</Label>
                                <Input
                                    id="edit-show-invoice-no"
                                    value={editForm.invoice_no}
                                    onChange={(e) => setEditForm({ ...editForm, invoice_no: e.target.value })}
                                    placeholder="เช่น INV-6809001"
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-invoice-date">วันที่ใบส่งของ</Label>
                                <Input
                                    id="edit-show-invoice-date"
                                    type="date"
                                    value={editForm.invoice_date}
                                    onChange={(e) => setEditForm({ ...editForm, invoice_date: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-unit-price">ราคาต่อหน่วยรับเข้า (บาท)</Label>
                                <Input
                                    id="edit-show-unit-price"
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={editForm.invoice_unit_price}
                                    onChange={(e) => setEditForm({ ...editForm, invoice_unit_price: e.target.value })}
                                    placeholder="0.0000"
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-show-total-price">ราคารวม (บาท)</Label>
                                <Input
                                    id="edit-show-total-price"
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

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-show-notes">หมายเหตุเพิ่มเติม</Label>
                            <Input
                                id="edit-show-notes"
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="ระบุหมายเหตุ เช่น ปรับปรุงข้อมูลตามใบตรวจรับ, แก้ไขปี พ.ศ. ผิด"
                                className="rounded-xl"
                            />
                        </div>

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
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
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
                </DialogContent>
            </Dialog>

            {/* MODAL: REGENERATE QR TOKEN */}
            <Dialog open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <RefreshCw className="h-5 w-5" />
                            สร้างรหัส QR Token ใหม่
                        </DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการสุ่มสร้างรหัส QR Token ใหม่สำหรับ Lot <b>{lot.lot_no}</b>?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 space-y-1.5">
                        <div className="font-semibold">⚠️ ข้อควรระวัง:</div>
                        <div>
                            เมื่อสร้างรหัสใหม่ รหัสเดิมจะถูกยกเลิกทันที สติกเกอร์ QR Code เดิมที่เคยพิมพ์และติดข้างกล่อง/ขวดไปแล้ว จะไม่สามารถใช้สแกนได้อีกต่อไป และต้องสั่งพิมพ์ฉลากใหม่
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRegenerateOpen(false)}
                            className="rounded-xl"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            onClick={handleRegenerateQr}
                            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            ยืนยันสร้างรหัสใหม่
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: DELETE LOT CONFIRMATION */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
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

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100 space-y-1">
                            <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                                <span>{lot.item.name}</span>
                                {lot.item.item_type === 'nondrug' && (
                                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                        📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                    </span>
                                )}
                            </div>
                            <div>หมายเลข Lot: <b className="font-mono">{lot.lot_no}</b></div>
                            <div>สถานที่จัดเก็บ: <b>{lot.location.name}</b></div>
                            <div>ยอดคงเหลือใน Lot: <b className="text-rose-700 dark:text-rose-300">{lot.qty_remaining} {lot.item.unit || 'หน่วย'}</b></div>
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
                                    <b>ตัดลดยอดคงเหลือในคลังออกด้วย:</b> ปรับลดยอดคงคลัง ({lot.qty_remaining} {lot.item.unit || 'หน่วย'}) ตาม Lot นี้ เพื่อไม่ให้ยอดสต็อกรวมเกินจริง
                                </span>
                            </label>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDeleteOpen(false)}
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
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
