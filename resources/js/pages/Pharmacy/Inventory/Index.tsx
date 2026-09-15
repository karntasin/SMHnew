import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Boxes, PackagePlus, QrCode, RefreshCw, TriangleAlert } from 'lucide-react';

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
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([{ title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') }])}>
            <Head title="คลังยา / ห้องยา" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />

                {(flash?.success || flash?.error) && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${flash.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                        {flash.error || flash.success}
                    </div>
                )}

                <section className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-slate-900 via-violet-950 to-fuchsia-900 p-6 text-white shadow-xl md:p-8">
                    <h1 className="text-3xl font-bold tracking-tight">คลังยา และห้องยา</h1>
                    <p className="mt-2 max-w-2xl text-sm text-violet-100/85">
                        รับเข้าพร้อม lot / วันหมดอายุ / QR · เบิกจากคลังสู่ห้องยา · ตัดจ่ายตามใบสั่ง HOSxP · แจ้งเตือนเมื่อเหลือน้อยหรือใกล้หมดอายุ
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Button asChild className="rounded-xl bg-white text-violet-900 hover:bg-violet-50">
                            <Link href={route('pharmacy.inventory.receive')}><PackagePlus className="mr-2 h-4 w-4" />รับเข้ายา</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={route('pharmacy.inventory.transfer')}><ArrowRightLeft className="mr-2 h-4 w-4" />เบิกเข้าห้องยา</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={route('pharmacy.inventory.lots')}><QrCode className="mr-2 h-4 w-4" />Lot / QR</Link>
                        </Button>
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={route('pharmacy.inventory.stock')}><Boxes className="mr-2 h-4 w-4" />คงเหลือ</Link>
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="rounded-xl"
                            onClick={() => router.post(route('pharmacy.inventory.sync-dispense'))}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />ซิงก์ตัดจ่ายวันนี้
                        </Button>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'รายการยา', value: summary.totals.items, tone: 'bg-slate-50 text-slate-800' },
                        { label: 'Lot ใช้งาน', value: summary.totals.lots_active, tone: 'bg-violet-50 text-violet-800' },
                        { label: 'เหลือน้อย', value: summary.totals.low, tone: 'bg-amber-50 text-amber-800' },
                        { label: 'หมดสต็อก', value: summary.totals.empty, tone: 'bg-rose-50 text-rose-800' },
                        { label: 'ใกล้หมดอายุ 90 วัน', value: summary.totals.expiring_90d, tone: 'bg-orange-50 text-orange-800' },
                    ].map((c) => (
                        <div key={c.label} className={`rounded-3xl border border-slate-100 p-4 ${c.tone}`}>
                            <div className="text-2xl font-bold">{c.value}</div>
                            <div className="text-xs opacity-80">{c.label}</div>
                        </div>
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
                                        <div className="text-[11px] text-slate-500">{loc.type === 'warehouse' ? 'คลังยา' : 'ห้องยา'} · {loc.code}</div>
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
                            <TriangleAlert className="h-4 w-4 text-amber-600" /> ยาเหลือน้อย
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
                        <h2 className="mb-3 mt-5 text-sm font-semibold text-slate-800">ใกล้หมดอายุ</h2>
                        <div className="space-y-2">
                            {summary.expiring.length === 0 && <div className="text-sm text-slate-500">ไม่มี lot ใกล้หมดอายุ</div>}
                            {summary.expiring.slice(0, 6).map((row, idx) => (
                                <div key={idx} className="rounded-2xl border border-orange-100 bg-orange-50/60 px-3 py-2 text-sm">
                                    <div className="font-medium text-orange-950">{row.item.name}</div>
                                    <div className="text-[11px] text-orange-800">lot {row.lot_no} · หมดอายุ {row.expires_at} · คงเหลือ {row.qty_remaining}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
