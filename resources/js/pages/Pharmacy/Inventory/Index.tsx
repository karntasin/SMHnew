import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, BarChart3, Boxes, ClipboardCheck, FileText, History, PackageMinus, PackagePlus, Printer, QrCode, RefreshCw, ScanLine, Settings, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { warehouseActive, warehouseHome, warehouseSupply, wh } from '@/pages/Pharmacy/inventoryCatalog';

type Summary = {
    totals: {
        items: number;
        lots_active: number;
        low: number;
        empty: number;
        expiring_90d: number;
    };
    by_location: Array<{
        id: number;
        code: string;
        name: string;
        type: string;
        sku_count: number;
        low: number;
        empty: number;
        qty_total: number;
    }>;
    low_stock: Array<{
        available: number;
        item: { icode?: string; name?: string };
        location: { name?: string; type?: string };
    }>;
    expiring: Array<{
        lot_no: string;
        expires_at?: string;
        qty_remaining: number;
        item: { name?: string };
        location: { name?: string };
    }>;
};

export default function InventoryIndex({ summary }: { summary: Summary }) {
    const pageProps = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const flash = pageProps.flash;
    const hasChatFab = Boolean(pageProps.fshhChat?.enabled && pageProps.fshhChat.openUrl);
    const supply = warehouseSupply();

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([{ title: warehouseHome(), href: wh('index') }])}>
            <Head title={warehouseHome()} />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active={warehouseActive()} />

                {(flash?.success || flash?.error) && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${flash.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                        {flash.error || flash.success}
                    </div>
                )}

                <section className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-slate-900 via-violet-950 to-fuchsia-900 p-6 text-white shadow-xl md:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">{supply ? 'คลังเวชภัณฑ์มิใช่ยา' : 'คลังยา และห้องยา'}</h1>
                            <p className="max-w-2xl text-sm text-violet-100/85">
                                {supply
                                    ? 'รับเข้าเวชภัณฑ์จากหมวดค่าเวชภัณฑ์ที่มิใช่ยา · เบิกเข้าจุดจ่าย · จ่ายเวชภัณฑ์ออกหน่วย / คืนเวชภัณฑ์ · ตัดยอดตามรายการ HOSxP · แจ้งเตือนเมื่อเหลือน้อยหรือใกล้หมดอายุ'
                                    : 'รับเข้าพร้อม lot / วันหมดอายุ / QR · เบิกจากคลังสู่ห้องยา · จ่ายยาออกหน่วย / คืนยา · ตัดจ่ายตามใบสั่ง HOSxP · แจ้งเตือนเมื่อเหลือน้อยหรือใกล้หมดอายุ'}
                            </p>
                        </div>

                        {/* PROMINENT QUICK SCAN BUTTON */}
                        <div className="shrink-0">
                            <Button asChild size="lg" className="rounded-2xl bg-emerald-400 text-emerald-950 hover:bg-emerald-300 font-bold shadow-lg shadow-emerald-950/30 px-5 py-6 text-base border border-emerald-300/40">
                                <Link href={wh('scan')}>
                                    <ScanLine className="mr-2.5 h-6 w-6 text-emerald-950" />
                                    <span>{supply ? 'สแกนบาร์โค้ดเวชภัณฑ์' : 'สแกนบาร์โค้ดยา'}</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-white/10">
                        <Button asChild className="rounded-xl bg-white text-violet-900 hover:bg-violet-50 font-semibold">
                            <Link href={wh('receive')}><PackagePlus className="mr-2 h-4 w-4" />{supply ? 'รับเข้าเวชภัณฑ์' : 'รับเข้ายา'}</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl font-semibold">
                            <Link href={wh('transfer')}><ArrowRightLeft className="mr-2 h-4 w-4" />{supply ? 'เบิกเข้าจุดจ่าย' : 'เบิกเข้าห้องยา'}</Link>
                        </Button>
                        <Button asChild className="rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-semibold shadow-sm">
                            <Link href={wh('drug-out')}><PackageMinus className="mr-2 h-4 w-4" />{supply ? 'เวชภัณฑ์ออกหน่วย' : 'ยาออกหน่วย'}</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('lots')}><QrCode className="mr-2 h-4 w-4" />Lot / QR</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('stock')}><Boxes className="mr-2 h-4 w-4" />คงเหลือ</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('stock-card')}><FileText className="mr-2 h-4 w-4" />{supply ? 'บัตรคุมเวชภัณฑ์' : 'บัตรคุมยา'}</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('labels')}><Printer className="mr-2 h-4 w-4" />พิมพ์สติ๊กเกอร์</Link>
                        </Button>
                        {!supply && (
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('analytics')}><BarChart3 className="mr-2 h-4 w-4 text-emerald-400" />วิเคราะห์คลัง (ABC/VEN)</Link>
                        </Button>
                        )}
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('items')}><Boxes className="mr-2 h-4 w-4" />{supply ? 'รายการเวชภัณฑ์' : 'รายการยา / หน่วย'}</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('counts')}><ClipboardCheck className="mr-2 h-4 w-4" />{supply ? 'ตรวจนับเวชภัณฑ์' : 'ตรวจนับยา'}</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('sync-dispense.history')}><History className="mr-2 h-4 w-4" />ประวัติซิงก์ตัดจ่าย</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={wh('settings')}><Settings className="mr-2 h-4 w-4" />ตั้งค่า</Link>
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="rounded-xl"
                            onClick={() => router.post(wh('sync-dispense'))}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />ซิงก์ตัดจ่ายวันนี้
                        </Button>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: supply ? 'รายการเวชภัณฑ์' : 'รายการยา', value: summary.totals.items, tone: 'bg-slate-50 text-slate-800 hover:bg-slate-100', href: wh('stock') },
                        { label: 'Lot ใช้งาน', value: summary.totals.lots_active, tone: 'bg-violet-50 text-violet-800 hover:bg-violet-100', href: wh('lots') },
                        { label: 'เหลือน้อย', value: summary.totals.low, tone: 'bg-amber-50 text-amber-800 hover:bg-amber-100', href: wh('stock') },
                        { label: 'หมดสต็อก', value: summary.totals.empty, tone: 'bg-rose-50 text-rose-800 hover:bg-rose-100', href: wh('stock') },
                        { label: 'ใกล้หมดอายุ 90 วัน', value: summary.totals.expiring_90d, tone: 'bg-orange-50 text-orange-800 hover:bg-orange-100', href: wh('stock', { expiry: 'expiring_90' }) },
                    ].map((c) => (
                        <Link key={c.label} href={c.href} className={`rounded-3xl border border-slate-100 p-4 transition-transform hover:scale-[1.02] ${c.tone}`}>
                            <div className="text-2xl font-bold">{c.value}</div>
                            <div className="text-xs opacity-80">{c.label}</div>
                        </Link>
                    ))}
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 text-sm font-semibold text-slate-800">ตามสถานที่จัดเก็บ</h2>
                        <div className="space-y-2">
                            {summary.by_location.map((loc) => (
                                <div key={loc.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2">
                                    <div>
                                        <div className="font-medium text-slate-800">{loc.name}</div>
                                        <div className="text-[11px] text-slate-500">{loc.type === 'warehouse' ? (supply ? 'คลังเวชภัณฑ์' : 'คลังยา') : (supply ? 'จุดจ่ายเวชภัณฑ์' : 'ห้องยา')} · {loc.code}</div>
                                    </div>
                                    <div className="text-right text-xs text-slate-600">
                                        <div>SKU {loc.sku_count} · รวม {loc.qty_total}</div>
                                        <div className="text-amber-700">ต่ำ {loc.low} · หมด {loc.empty}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <TriangleAlert className="h-4 w-4 text-amber-600" /> {supply ? 'เวชภัณฑ์เหลือน้อย' : 'ยาเหลือน้อย'}
                        </h2>
                        <div className="space-y-2">
                            {summary.low_stock.length === 0 && <div className="text-sm text-slate-500">ไม่มียาเหลือน้อย</div>}
                            {summary.low_stock.slice(0, 8).map((row, idx) => (
                                <div key={idx} className="rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm">
                                    <div className="font-medium text-amber-950">{row.item.name}</div>
                                    <div className="text-[11px] text-amber-800">{row.location.name} · {row.item.icode} · คงเหลือ {row.available}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mb-3 mt-5 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-800">ใกล้หมดอายุ (≤90 วัน)</h2>
                            <Link href={wh('stock', { expiry: 'expiring_90' })} className="text-xs font-medium text-orange-700 hover:underline">
                                ดูในระบบคงเหลือทั้งหมด →
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {summary.expiring.length === 0 && <div className="text-sm text-slate-500">ไม่มี lot ใกล้หมดอายุ</div>}
                            {summary.expiring.slice(0, 6).map((row, idx) => (
                                <Link
                                    key={idx}
                                    href={wh('stock', { expiry: 'expiring_90', q: row.item.icode })}
                                    className="block rounded-2xl border border-orange-100 bg-orange-50/60 px-3 py-2 text-sm transition-colors hover:bg-orange-100/70"
                                >
                                    <div className="font-medium text-orange-950">{row.item.name}</div>
                                    <div className="text-[11px] text-orange-800">lot {row.lot_no} · หมดอายุ {row.expires_at} · คงเหลือ {row.qty_remaining}</div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Floating Quick Scanner Button - Positioned gracefully above the S-Chat FAB */}
                <div
                    className={cn(
                        'fixed right-4 z-40 transition-all duration-300 sm:right-6',
                        hasChatFab ? 'bottom-20 sm:bottom-24' : 'bottom-4 sm:bottom-6'
                    )}
                >
                    <Button
                        asChild
                        className="group relative h-12 sm:h-13 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold shadow-xl shadow-purple-950/25 px-4 sm:px-5 border border-white/25 backdrop-blur-xs transition-all duration-200 hover:scale-105 active:scale-95"
                        title="เปิดระบบสแกนบาร์โค้ดยา"
                    >
                        <Link href={wh('scan')} className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                                <ScanLine className="h-4 w-4 animate-pulse text-white" />
                            </span>
                            <span className="text-sm font-semibold tracking-tight">สแกนบาร์โค้ด</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
