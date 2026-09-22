import { FormEvent, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import {
    CheckSquare,
    Flame,
    Printer,
    QrCode,
    Search,
    ShieldAlert,
    Snowflake,
    Square,
} from 'lucide-react';

type Lot = {
    id: number;
    lot_no: string;
    qr_token: string;
    qr_payload: string;
    barcode?: string | null;
    received_at?: string | null;
    expires_at?: string | null;
    qty_remaining: number;
    item: {
        id: number;
        icode: string;
        name: string;
        item_type?: 'drug' | 'nondrug' | string;
        item_type_label?: string;
        strength?: string | null;
        unit: string;
        is_had: boolean;
        is_cold_chain: boolean;
        storage_temp?: string | null;
    };
    location: {
        id: number;
        name: string;
    };
};

export default function BatchLabels({
    locations,
    lots,
    filters,
    hospitalName = 'โรงพยาบาลค่ายสุรสิงหนาท',
}: {
    locations: Array<{ id: number; name: string; type: string }>;
    lots: Lot[];
    filters: { location_id?: number | null; q?: string };
    hospitalName?: string;
}) {
    const [q, setQ] = useState(filters.q || '');
    const [locationId, setLocationId] = useState(filters.location_id ? String(filters.location_id) : '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [copiesPerLot, setCopiesPerLot] = useState<number>(1);
    const [labelFormat, setLabelFormat] = useState<'thermal' | 'a4'>('thermal');
    const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

    // Generate DataURL for QR Codes
    useEffect(() => {
        const generateQrData = async () => {
            const urls: Record<string, string> = {};
            for (const lot of lots) {
                if (!urls[lot.qr_payload]) {
                    try {
                        urls[lot.qr_payload] = await QRCode.toDataURL(lot.qr_payload, {
                            width: 140,
                            margin: 1,
                            color: { dark: '#000000', light: '#ffffff' },
                        });
                    } catch (e) {
                        console.error('QR error', e);
                    }
                }
            }
            setQrUrls(urls);
        };
        if (lots.length > 0) {
            generateQrData();
        }
    }, [lots]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            route('pharmacy.inventory.labels'),
            {
                q: q.trim() || undefined,
                location_id: locationId || undefined,
            },
            { preserveState: true },
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === lots.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(lots.map((l) => l.id));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    const selectedLots = lots.filter((l) => selectedIds.includes(l.id));

    // Expand selected lots by copies
    const printQueue: Lot[] = [];
    selectedLots.forEach((lot) => {
        for (let i = 0; i < copiesPerLot; i++) {
            printQueue.push(lot);
        }
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
                { title: 'พิมพ์สติ๊กเกอร์บาร์โค้ด / QR เป็นชุด' },
            ])}
        >
            <Head title="พิมพ์สติ๊กเกอร์ QR / Barcode เป็นชุด" />

            <div className="container mx-auto space-y-6 px-4 py-6 print:p-0 print:space-y-0">
                <div className="print:hidden">
                    <PharmacySubNav active="pharmacy.inventory.index" />
                </div>

                {/* Filter and Print Settings Bar */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs print:hidden space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-foreground">พิมพ์สติ๊กเกอร์ QR / Barcode เป็นชุด</h1>
                            <p className="text-xs text-muted-foreground">
                                เลือก Lot ยาที่ต้องการติดสติ๊กเกอร์ · รองรับเครื่องพิมพ์ความร้อนแบบม้วน (Thermal) และสติ๊กเกอร์แผ่น A4
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handlePrint}
                                disabled={printQueue.length === 0}
                                className="rounded-xl bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50"
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                สั่งพิมพ์สติ๊กเกอร์ ({printQueue.length} ดวง)
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
                        <div className="min-w-[220px] flex-1">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">ค้นหา Lot / ชื่อยา / icode</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="เช่น LOT2401 หรือ Paracetamol"
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="min-w-[180px]">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">สถานที่จัดเก็บ</label>
                            <select
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">ทุกคลัง / สถานที่</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">จำนวนดวง / Lot</label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={copiesPerLot}
                                onChange={(e) => setCopiesPerLot(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-24 text-center font-bold"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">รูปแบบกระดาษ</label>
                            <div className="flex rounded-lg border border-input p-0.5 bg-muted/40">
                                <button
                                    type="button"
                                    onClick={() => setLabelFormat('thermal')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${labelFormat === 'thermal' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'}`}
                                >
                                    ม้วนความร้อน (50x30mm)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLabelFormat('a4')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${labelFormat === 'a4' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'}`}
                                >
                                    สติ๊กเกอร์ A4 (3x8)
                                </button>
                            </div>
                        </div>

                        <Button type="submit" variant="secondary" className="rounded-xl">
                            <Search className="mr-1.5 h-4 w-4" />
                            กรอง
                        </Button>
                    </form>
                </div>

                {/* Lots Selection Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs print:hidden">
                    <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="h-8 px-2 text-xs"
                            >
                                {selectedIds.length === lots.length && lots.length > 0 ? (
                                    <CheckSquare className="mr-1.5 h-4 w-4 text-violet-600" />
                                ) : (
                                    <Square className="mr-1.5 h-4 w-4 text-muted-foreground" />
                                )}
                                เลือกทั้งหมด ({selectedIds.length}/{lots.length})
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            ยอดพิมพ์รวม: <b className="text-violet-700 dark:text-violet-300">{printQueue.length} ดวง</b>
                        </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                                <tr>
                                    <th className="w-10 px-3 py-2 text-center"></th>
                                    <th className="px-4 py-2 font-semibold">Lot No.</th>
                                    <th className="px-4 py-2 font-semibold">รายการยา</th>
                                    <th className="px-4 py-2 font-semibold">สถานที่</th>
                                    <th className="px-4 py-2 font-semibold">วันหมดอายุ</th>
                                    <th className="px-4 py-2 font-semibold text-right">คงเหลือ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {lots.map((lot) => {
                                    const isSelected = selectedIds.includes(lot.id);
                                    return (
                                        <tr
                                            key={lot.id}
                                            onClick={() => toggleSelect(lot.id)}
                                            className={`cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? 'bg-violet-50/60 dark:bg-violet-950/30' : ''}`}
                                        >
                                            <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(lot.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                                />
                                            </td>
                                            <td className="px-4 py-2 font-mono font-bold text-foreground">
                                                {lot.lot_no}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                                                    <span>{lot.item.name}</span>
                                                    {lot.item.item_type === 'nondrug' && (
                                                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                                            📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {lot.item.icode} {lot.item.strength ? `· ${lot.item.strength}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-muted-foreground">
                                                {lot.location.name}
                                            </td>
                                            <td className="px-4 py-2 text-xs font-mono">
                                                {lot.expires_at || '—'}
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold">
                                                {lot.qty_remaining} {lot.item.unit}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {lots.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                            ไม่พบ Lot ยาที่พร้อมพิมพ์
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Print Preview Canvas Area */}
                <div className="rounded-2xl border border-border bg-muted/20 p-6 print:border-0 print:bg-white print:p-0">
                    <div className="mb-4 flex items-center justify-between print:hidden">
                        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-violet-600" />
                            ตัวอย่างก่อนพิมพ์ ({printQueue.length} ดวง)
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            รูปแบบ: {labelFormat === 'thermal' ? 'ม้วนสติ๊กเกอร์ความร้อน (50x30mm)' : 'สติ๊กเกอร์ A4 (3 คอลัมน์ x 8 แถว)'}
                        </span>
                    </div>

                    {printQueue.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground print:hidden">
                            ยังไม่ได้เลือก Lot ยาที่ต้องการพิมพ์ กรุณาเลือกจากตารางด้านบน
                        </div>
                    ) : (
                        <div
                            id="printable-labels"
                            className={
                                labelFormat === 'thermal'
                                    ? 'flex flex-col gap-3 print:block print:gap-0'
                                    : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid print:grid-cols-3 print:gap-1'
                            }
                        >
                            {printQueue.map((lot, idx) => (
                                <div
                                    key={`${lot.id}-${idx}`}
                                    className="relative flex items-center justify-between rounded-lg border border-slate-900 bg-white p-2.5 shadow-xs text-slate-900 print:border print:border-black print:shadow-none print:break-inside-avoid"
                                    style={{
                                        width: labelFormat === 'thermal' ? '300px' : 'auto',
                                        minHeight: '100px',
                                        pageBreakInside: 'avoid',
                                    }}
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

                                    {/* QR Code */}
                                    <div className="text-center shrink-0">
                                        {qrUrls[lot.qr_payload] ? (
                                            <img
                                                src={qrUrls[lot.qr_payload]}
                                                alt="QR Code"
                                                className="h-16 w-16 border border-slate-300 rounded"
                                            />
                                        ) : (
                                            <div className="h-16 w-16 bg-slate-100 animate-pulse rounded" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
