import { FormEvent, useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Boxes,
    FileText,
    Flame,
    History,
    Printer,
    QrCode,
    Search,
    ShieldAlert,
    Snowflake,
} from 'lucide-react';

type MovementRow = {
    id: number;
    date: string;
    type: string;
    type_label: string;
    document_no: string;
    lot_no?: string | null;
    expires_at?: string | null;
    in_qty: number;
    out_qty: number;
    balance: number;
    unit: string;
    package_info?: string | null;
    user_name: string;
    note?: string | null;
};

type CardData = {
    item: {
        id: number;
        icode: string;
        name: string;
        item_type?: 'drug' | 'nondrug' | string;
        item_type_label?: string;
        income_code?: string;
        strength?: string | null;
        unit: string;
        base_unit?: string | null;
        is_had: boolean;
        is_cold_chain: boolean;
        is_narcotic: boolean;
        storage_temp?: string | null;
        had_alert_text?: string | null;
    };
    location?: {
        id: number;
        name: string;
        code: string;
        type: string;
    } | null;
    start_date: string;
    end_date: string;
    starting_balance: number;
    total_in: number;
    total_out: number;
    ending_balance: number;
    current_stock: number;
    movements: MovementRow[];
};

export default function StockCard({
    locations,
    filters,
    cardData,
    hospitalName = 'โรงพยาบาลค่ายสุรสิงหนาท',
}: {
    locations: Array<{ id: number; code: string; name: string; type: string }>;
    filters: { icode: string; location_id?: number | null; start_date: string; end_date: string };
    cardData?: CardData | null;
    hospitalName?: string;
}) {
    const [icode, setIcode] = useState(filters.icode || '');
    const [locationId, setLocationId] = useState(filters.location_id ? String(filters.location_id) : '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [isBinCardView, setIsBinCardView] = useState(false);

    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const binQrCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!cardData?.item) return;
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
        if (qrCanvasRef.current && currentUrl) {
            QRCode.toCanvas(qrCanvasRef.current, currentUrl, {
                width: 130,
                margin: 1,
                color: { dark: '#0f172a', light: '#ffffff' },
            });
        }
        if (binQrCanvasRef.current && currentUrl) {
            QRCode.toCanvas(binQrCanvasRef.current, currentUrl, {
                width: 110,
                margin: 1,
                color: { dark: '#0f172a', light: '#ffffff' },
            });
        }
    }, [cardData, isBinCardView]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            route('pharmacy.inventory.stock-card'),
            {
                icode: icode.trim() || undefined,
                location_id: locationId || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            { preserveState: true },
        );
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
                { title: 'บัตรคุมยา (Stock Card)' },
            ])}
        >
            <Head title={cardData?.item ? `บัตรคุมยา - ${cardData.item.name}` : 'บัตรคุมยา (Stock Card)'} />

            <div className="container mx-auto space-y-6 px-4 py-6 print:p-0 print:space-y-3">
                <div className="print:hidden">
                    <PharmacySubNav active="pharmacy.inventory.index" />
                </div>

                {/* Filter and Query Form */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs print:hidden">
                    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[240px] flex-1">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                รหัสยา (icode) หรือ ชื่อยา *
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={icode}
                                    onChange={(e) => setIcode(e.target.value)}
                                    placeholder="เช่น 1000001 หรือ Paracetamol"
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="min-w-[180px]">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">สถานที่จัดเก็บ / คลัง</label>
                            <select
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">ทุกคลัง / สถานที่</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name} ({loc.type})
                                    </option>
                                ))}
                            </select>
                        </div>

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

                        <Button type="submit" className="rounded-xl bg-violet-700 hover:bg-violet-800">
                            <Search className="mr-1.5 h-4 w-4" />
                            ดูบัตรคุมยา
                        </Button>

                        {cardData && (
                            <div className="ml-auto flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant={isBinCardView ? 'default' : 'outline'}
                                    className={`rounded-xl ${isBinCardView ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                                    onClick={() => setIsBinCardView(!isBinCardView)}
                                >
                                    <QrCode className="mr-1.5 h-4 w-4" />
                                    {isBinCardView ? 'มุมมองปกติ' : 'โหมด Bin Card ติดตู้ยา'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={handlePrint}
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    พิมพ์
                                </Button>
                            </div>
                        )}
                    </form>
                </div>

                {!cardData ? (
                    <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 opacity-30 mb-3" />
                        <h3 className="text-base font-semibold text-foreground">ยังไม่ได้เลือกรายการยา</h3>
                        <p className="mt-1 text-sm max-w-md mx-auto">
                            กรุณาระบุรหัสยา (icode) หรือชื่อยาในช่องค้นหาด้านบน เพื่อเปิดดูประวัติการเคลื่อนไหว ยอดยกมา รับ จ่าย และยอดคงเหลือตามบัตรคุมยา
                        </p>
                        <div className="mt-4">
                            <Button asChild variant="outline" className="rounded-xl">
                                <Link href={route('pharmacy.inventory.stock')}>
                                    <Boxes className="mr-1.5 h-4 w-4" />
                                    ไปที่หน้าคงเหลือยา
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : isBinCardView ? (
                    /* BIN CARD VIEW: สำหรับพิมพ์ติดหน้าตู้ยา / ชั้นวางยา */
                    <div className="rounded-2xl border-2 border-slate-900 bg-white p-6 text-slate-900 shadow-sm print:border-2 print:p-4">
                        <div className="border-b-2 border-slate-900 pb-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-xs font-bold tracking-wider text-slate-600">
                                        {hospitalName || 'โรงพยาบาลค่ายสุรสิงหนาท'} · กลุ่มงานเภสัชกรรม
                                    </div>
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                        บัตรคุมยอดประจำจุดจ่าย (BIN CARD)
                                    </h1>
                                    <div className="mt-1 text-sm font-medium text-slate-700">
                                        สถานที่จัดเก็บ: <span className="font-bold underline">{cardData.location?.name || 'ทุกคลัง / ชั้นวางยา'}</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <canvas ref={binQrCanvasRef} className="mx-auto border border-slate-300 rounded-md" />
                                    <div className="text-[10px] font-mono text-slate-500 mt-1">สแกนตรวจสอบสต็อก</div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-900 p-3 text-sm sm:grid-cols-4 bg-slate-50">
                                <div>
                                    <div className="text-[11px] font-bold text-slate-500">ชื่อสามัญ / การค้า</div>
                                    <div className="font-black text-base text-slate-900 flex items-center gap-1.5 flex-wrap">
                                        <span>{cardData.item.name}</span>
                                        {cardData.item.item_type === 'nondrug' && (
                                            <span className="rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold text-slate-500">ความแรง (Strength)</div>
                                    <div className="font-bold text-slate-800">{cardData.item.strength || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold text-slate-500">รหัสยา (icode)</div>
                                    <div className="font-mono font-bold text-slate-900">{cardData.item.icode}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold text-slate-500">หน่วยนับ (Base Unit)</div>
                                    <div className="font-bold text-slate-800">{cardData.item.unit}</div>
                                </div>
                            </div>

                            {(cardData.item.is_had || cardData.item.is_cold_chain || cardData.item.is_narcotic) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {cardData.item.is_had && (
                                        <div className="flex items-center gap-1.5 rounded-lg border-2 border-rose-600 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                                            <ShieldAlert className="h-4 w-4" />
                                            <span>HIGH ALERT DRUG (HAD): {cardData.item.had_alert_text || 'ยาความเสี่ยงสูง ต้องตรวจสอบซ้ำ'}</span>
                                        </div>
                                    )}
                                    {cardData.item.is_cold_chain && (
                                        <div className="flex items-center gap-1.5 rounded-lg border-2 border-sky-600 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                                            <Snowflake className="h-4 w-4" />
                                            <span>COLD CHAIN ({cardData.item.storage_temp || '2-8°C'}): แช่ตู้เย็น ห้ามแช่แข็ง</span>
                                        </div>
                                    )}
                                    {cardData.item.is_narcotic && (
                                        <div className="flex items-center gap-1.5 rounded-lg border-2 border-purple-600 bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                                            <Flame className="h-4 w-4" />
                                            <span>NARCOTIC: ยาเสพติด/วัตถุออกฤทธิ์ ต้องล็อคตู้</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="my-3 flex items-center justify-between text-xs text-slate-600">
                            <div>ช่วงข้อมูล: <b>{cardData.start_date}</b> ถึง <b>{cardData.end_date}</b></div>
                            <div>ยอดยกมา: <b className="text-slate-900">{cardData.starting_balance.toLocaleString()}</b> {cardData.item.unit}</div>
                            <div>ยอดคงเหลือปัจจุบัน: <b className="text-slate-900 text-sm">{cardData.ending_balance.toLocaleString()}</b> {cardData.item.unit}</div>
                        </div>

                        <table className="min-w-full border-collapse border-2 border-slate-900 text-xs">
                            <thead>
                                <tr className="bg-slate-200 text-slate-900">
                                    <th className="border border-slate-900 px-2 py-1.5 text-center w-10">ลำดับ</th>
                                    <th className="border border-slate-900 px-2 py-1.5 text-left w-28">วัน/เดือน/ปี</th>
                                    <th className="border border-slate-900 px-2 py-1.5 text-left">เลขที่เอกสาร / Lot No.</th>
                                    <th className="border border-slate-900 px-2 py-1.5 text-right w-20">รับ (+)</th>
                                    <th className="border border-slate-900 px-2 py-1.5 text-right w-20">จ่าย (-)</th>
                                    <th className="border border-slate-900 px-2 py-1.5 text-right w-24">คงเหลือ</th>
                                    <th className="border border-slate-900 px-2 py-1.5 text-center w-24">ผู้บันทึก</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-slate-100 font-bold">
                                    <td className="border border-slate-900 px-2 py-1 text-center">—</td>
                                    <td className="border border-slate-900 px-2 py-1">{cardData.start_date}</td>
                                    <td className="border border-slate-900 px-2 py-1">ยอดยกมาก่อนรอบนี้</td>
                                    <td className="border border-slate-900 px-2 py-1 text-right">—</td>
                                    <td className="border border-slate-900 px-2 py-1 text-right">—</td>
                                    <td className="border border-slate-900 px-2 py-1 text-right">{cardData.starting_balance.toLocaleString()}</td>
                                    <td className="border border-slate-900 px-2 py-1 text-center">ยอดยกมา</td>
                                </tr>
                                {cardData.movements.slice(-20).map((m, idx) => (
                                    <tr key={m.id} className="hover:bg-slate-50">
                                        <td className="border border-slate-900 px-2 py-1 text-center">{idx + 1}</td>
                                        <td className="border border-slate-900 px-2 py-1 font-mono text-[11px]">{m.date}</td>
                                        <td className="border border-slate-900 px-2 py-1">
                                            <span className="font-semibold">{m.type_label}</span> {m.document_no !== '—' && `(${m.document_no})`}
                                        </td>
                                        <td className="border border-slate-900 px-2 py-1 text-right font-semibold">
                                            {m.in_qty > 0 ? `+${m.in_qty.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="border border-slate-900 px-2 py-1 text-right font-semibold">
                                            {m.out_qty > 0 ? `-${m.out_qty.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="border border-slate-900 px-2 py-1 text-right font-bold">
                                            {m.balance.toLocaleString()}
                                        </td>
                                        <td className="border border-slate-900 px-2 py-1 text-center text-[11px]">{m.user_name}</td>
                                    </tr>
                                ))}
                                {Array.from({ length: Math.max(0, 8 - cardData.movements.length) }).map((_, i) => (
                                    <tr key={`empty-${i}`} className="h-7">
                                        <td className="border border-slate-900 px-2 py-1"></td>
                                        <td className="border border-slate-900 px-2 py-1"></td>
                                        <td className="border border-slate-900 px-2 py-1"></td>
                                        <td className="border border-slate-900 px-2 py-1"></td>
                                        <td className="border border-slate-900 px-2 py-1"></td>
                                        <td className="border border-slate-900 px-2 py-1"></td>
                                        <td className="border border-slate-900 px-2 py-1"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 flex justify-between text-xs text-slate-500">
                            <div>{hospitalName || 'โรงพยาบาลค่ายสุรสิงหนาท'} · พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</div>
                            <div>ลงชื่อผู้ตรวจ ..................................................... วันที่ ......../......../............</div>
                        </div>
                    </div>
                ) : (
                    /* STANDARD STOCK CARD VIEW */
                    <div className="space-y-6">
                        <div className="hidden print:block mb-3 pb-2 border-b-2 border-slate-900">
                            <div className="text-lg font-black text-slate-900">{hospitalName || 'โรงพยาบาลค่ายสุรสิงหนาท'}</div>
                            <div className="text-xs font-semibold text-slate-600">กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค · บัตรคุมยา (Stock Card)</div>
                        </div>
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-mono font-bold text-secondary-foreground">
                                            {cardData.item.icode}
                                        </span>
                                        <h2 className="text-2xl font-bold text-foreground">
                                            {cardData.item.name}
                                        </h2>
                                        {cardData.item.item_type === 'nondrug' && (
                                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                                📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                            </span>
                                        )}
                                        {cardData.item.strength && (
                                            <span className="text-muted-foreground">· {cardData.item.strength}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                        <span>หน่วยนับ: <b className="text-foreground">{cardData.item.unit}</b></span>
                                        <span>สถานที่: <b className="text-foreground">{cardData.location?.name || 'ทุกคลัง / ภาพรวมทั้งระบบ'}</b></span>
                                        <span>ช่วงวันที่: <b className="text-foreground">{cardData.start_date}</b> ถึง <b className="text-foreground">{cardData.end_date}</b></span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {cardData.item.is_had && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                HAD (High Alert Drug) {cardData.item.had_alert_text ? `— ${cardData.item.had_alert_text}` : ''}
                                            </span>
                                        )}
                                        {cardData.item.is_cold_chain && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                                                <Snowflake className="h-3.5 w-3.5" />
                                                Cold Chain ({cardData.item.storage_temp || '2-8°C'})
                                            </span>
                                        )}
                                        {cardData.item.is_narcotic && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                                                <Flame className="h-3.5 w-3.5" />
                                                ยาเสพติด / วัตถุออกฤทธิ์
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center print:hidden">
                                    <canvas ref={qrCanvasRef} className="mx-auto rounded-lg border border-border p-1 bg-white" />
                                    <div className="mt-1 text-[11px] font-mono text-muted-foreground">QR บัตรคุมยา</div>
                                </div>
                            </div>
                        </div>

                        {/* 5-Card Stat Bar */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="text-xs font-medium text-muted-foreground">1. ยอดยกมา</div>
                                <div className="mt-1 text-2xl font-bold text-foreground">
                                    {cardData.starting_balance.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">ก่อน {cardData.start_date}</div>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-950 dark:bg-emerald-950/20">
                                <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                    2. รับเข้ารวม (+)
                                </div>
                                <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                                    +{cardData.total_in.toLocaleString()}
                                </div>
                                <div className="text-xs text-emerald-600/80">รับเข้า + โอนเข้า</div>
                            </div>

                            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs dark:border-rose-950 dark:bg-rose-950/20">
                                <div className="flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-300">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    3. จ่ายออกรวม (-)
                                </div>
                                <div className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-400">
                                    -{cardData.total_out.toLocaleString()}
                                </div>
                                <div className="text-xs text-rose-600/80">จ่ายคนไข้ + โอนออก</div>
                            </div>

                            <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-xs dark:border-violet-950 dark:bg-violet-950/20">
                                <div className="text-xs font-medium text-violet-700 dark:text-violet-300">4. คงเหลือตามบัตร</div>
                                <div className="mt-1 text-2xl font-bold text-violet-800 dark:text-violet-300">
                                    {cardData.ending_balance.toLocaleString()}
                                </div>
                                <div className="text-xs text-violet-600/80">ยกมา + รับ - จ่าย</div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="text-xs font-medium text-muted-foreground">5. ยอดจริงในสต็อก</div>
                                <div className="mt-1 text-2xl font-bold text-foreground">
                                    {cardData.current_stock.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">Live Stock On Hand</div>
                            </div>
                        </div>

                        {/* Movement Ledger Table */}
                        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                            <div className="border-b border-border bg-muted/40 px-4 py-3">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <History className="h-4 w-4 text-violet-600" />
                                    รายการเคลื่อนไหวทั้งหมดในรอบ ({cardData.movements.length} รายการ)
                                </h3>
                            </div>

                            <table className="min-w-full divide-y divide-border text-sm">
                                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">วัน/เวลา</th>
                                        <th className="px-4 py-3 font-semibold">ประเภทรายการ</th>
                                        <th className="px-4 py-3 font-semibold">เอกสาร / Lot / วันหมดอายุ</th>
                                        <th className="px-4 py-3 font-semibold text-right text-emerald-700 dark:text-emerald-400">รับ (+)</th>
                                        <th className="px-4 py-3 font-semibold text-right text-rose-700 dark:text-rose-400">จ่าย (-)</th>
                                        <th className="px-4 py-3 font-semibold text-right font-bold">คงเหลือ</th>
                                        <th className="px-4 py-3 font-semibold">บรรจุภัณฑ์ / ผู้บันทึก</th>
                                        <th className="px-4 py-3 font-semibold">หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    <tr className="bg-muted/20 font-medium">
                                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{cardData.start_date}</td>
                                        <td className="px-4 py-2.5" colSpan={2}>
                                            <span className="font-semibold text-foreground">ยอดยกมาเริ่มต้นงวด (Starting Balance)</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">—</td>
                                        <td className="px-4 py-2.5 text-right">—</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-foreground">
                                            {cardData.starting_balance.toLocaleString()} {cardData.item.unit}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground" colSpan={2}>ยอดสะสมก่อนหน้านี้</td>
                                    </tr>

                                    {cardData.movements.map((m) => (
                                        <tr key={m.id} className="transition-colors hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                {m.date}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                                    m.type === 'receive' || m.type === 'transfer_in'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                        : m.type === 'dispense' || m.type === 'transfer_out'
                                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                                }`}>
                                                    {m.type_label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="font-medium text-foreground">{m.document_no}</div>
                                                {m.expires_at && (
                                                    <div className="text-muted-foreground">Exp: {m.expires_at}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                {m.in_qty > 0 ? `+${m.in_qty.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                                                {m.out_qty > 0 ? `-${m.out_qty.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-foreground">
                                                {m.balance.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                {m.package_info && (
                                                    <div className="font-medium text-violet-700 dark:text-violet-300">
                                                        📦 {m.package_info}
                                                    </div>
                                                )}
                                                <div className="text-muted-foreground">{m.user_name}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {m.note || '—'}
                                            </td>
                                        </tr>
                                    ))}

                                    {cardData.movements.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                                ไม่มีรายการเคลื่อนไหว (รับ/จ่าย/โอน) ในช่วงวันที่เลือก
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
