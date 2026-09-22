import { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Boxes,
    Calendar,
    CheckCircle2,
    DollarSign,
    Flame,
    PieChart,
    Search,
    ShieldAlert,
    Snowflake,
    Zap,
} from 'lucide-react';

type ItemAnalysis = {
    item_id: number;
    icode: string;
    name: string;
    strength?: string | null;
    unit: string;
    qty_on_hand: number;
    unit_price: number;
    total_value: number;
    daily_usage: number;
    dispensed_90d: number;
    days_of_supply: number;
    status: 'out_of_stock' | 'critical_low' | 'reorder_needed' | 'healthy' | 'overstock' | 'dead_stock';
    ven: 'V' | 'E' | 'N';
    abc?: 'A' | 'B' | 'C';
    abc_ven?: string;
    is_had: boolean;
    is_cold_chain: boolean;
    is_narcotic: boolean;
};

type NearExpiryLot = {
    lot_no: string;
    expires_at: string;
    days_remaining: number;
    qty_remaining: number;
    item_name: string;
    icode: string;
    unit: string;
    location_name: string;
};

export default function Analytics({
    locations,
    items,
    nearExpiryLots,
    matrixCounts,
    totalInventoryValue,
    filters,
}: {
    locations: Array<{ id: number; name: string; type: string }>;
    items: ItemAnalysis[];
    nearExpiryLots: NearExpiryLot[];
    matrixCounts: Record<string, number>;
    totalInventoryValue: number;
    filters: { location_id?: number | null };
}) {
    const [q, setQ] = useState('');
    const [selectedCell, setSelectedCell] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    const filteredItems = useMemo(() => {
        return items.filter((it) => {
            if (q) {
                const term = q.toLowerCase();
                if (!it.name.toLowerCase().includes(term) && !it.icode.includes(term)) {
                    return false;
                }
            }
            if (selectedCell && it.abc_ven !== selectedCell) {
                return false;
            }
            if (selectedStatus !== 'all' && it.status !== selectedStatus) {
                return false;
            }
            return true;
        });
    }, [items, q, selectedCell, selectedStatus]);

    const statusCounts = useMemo(() => {
        const counts = {
            out_of_stock: 0,
            critical_low: 0,
            reorder_needed: 0,
            healthy: 0,
            overstock: 0,
            dead_stock: 0,
        };
        items.forEach((it) => {
            if (counts[it.status] !== undefined) {
                counts[it.status]++;
            }
        });
        return counts;
    }, [items]);

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
                { title: 'วิเคราะห์คลังยา & ABC/VEN Matrix' },
            ])}
        >
            <Head title="วิเคราะห์คลังยาและห่วงโซ่อุปทาน (Analytics & ABC/VEN)" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />

                {/* KPI Header Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            มูลค่าสินค้าคงคลังรวม
                        </div>
                        <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            ฿{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">จากยาคงเหลือทุกรายการ</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Boxes className="h-4 w-4 text-violet-600" />
                            รายการยาที่วิเคราะห์
                        </div>
                        <div className="mt-2 text-2xl font-bold text-foreground">{items.length.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">SKUs มีสต็อกในคลัง</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                            สต็อกวิกฤต (&lt; 7 วัน)
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {statusCounts.critical_low + statusCounts.out_of_stock}
                        </div>
                        <div className="text-xs text-muted-foreground">เสี่ยงยาขาดคลัง</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Calendar className="h-4 w-4 text-amber-500" />
                            Lot ใกล้หมดอายุ (180 วัน)
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {nearExpiryLots.length}
                        </div>
                        <div className="text-xs text-muted-foreground">ต้องเร่งจ่าย / หมุนเวียน</div>
                    </div>
                </div>

                {/* ABC / VEN 9-Cell Matrix Section */}
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* 9-Cell Matrix Card */}
                    <div className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <PieChart className="h-4 w-4 text-violet-600" />
                                    เมทริกซ์ 9 ช่อง ABC / VEN Matrix
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    จำแนกตามมูลค่า (A=75%, B=20%, C=5%) และความจำเป็นทางการแพทย์ (V=จำเป็นวิกฤต, E=จำเป็น, N=ไม่จำเป็น)
                                </p>
                            </div>
                            {selectedCell && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCell(null)}
                                    className="text-xs text-violet-700 dark:text-violet-300"
                                >
                                    ล้างตัวกรอง ({selectedCell})
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                            <div className="p-2"></div>
                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                                V (Vital · จำเป็นมาก)
                            </div>
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
                                E (Essential · จำเป็น)
                            </div>
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-300">
                                N (Non-essential · ทั่วไป)
                            </div>

                            {/* Row A */}
                            <div className="flex items-center justify-center p-2 rounded-lg bg-rose-100 text-rose-900 font-bold dark:bg-rose-950/50 dark:text-rose-300">
                                A (มูลค่า 75%)
                            </div>
                            {['AV', 'AE', 'AN'].map((cell) => {
                                const isSelected = selectedCell === cell;
                                return (
                                    <button
                                        key={cell}
                                        type="button"
                                        onClick={() => setSelectedCell(isSelected ? null : cell)}
                                        className={`rounded-xl p-3 text-left transition border ${
                                            isSelected
                                                ? 'border-violet-600 bg-violet-100 ring-2 ring-violet-500 font-bold dark:bg-violet-950/60'
                                                : cell === 'AV'
                                                ? 'border-rose-300 bg-rose-50/60 hover:bg-rose-100/80 dark:border-rose-900 dark:bg-rose-950/30'
                                                : 'border-border bg-card hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="text-[11px] font-bold text-foreground">{cell}</div>
                                        <div className="text-xl font-black text-violet-700 dark:text-violet-300">
                                            {matrixCounts[cell] || 0}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {cell === 'AV' ? 'คุมเข้มงวดที่สุด' : 'คุมตามงวด'}
                                        </div>
                                    </button>
                                );
                            })}

                            {/* Row B */}
                            <div className="flex items-center justify-center p-2 rounded-lg bg-amber-100 text-amber-900 font-bold dark:bg-amber-950/50 dark:text-amber-300">
                                B (มูลค่า 20%)
                            </div>
                            {['BV', 'BE', 'BN'].map((cell) => {
                                const isSelected = selectedCell === cell;
                                return (
                                    <button
                                        key={cell}
                                        type="button"
                                        onClick={() => setSelectedCell(isSelected ? null : cell)}
                                        className={`rounded-xl p-3 text-left transition border ${
                                            isSelected
                                                ? 'border-violet-600 bg-violet-100 ring-2 ring-violet-500 font-bold dark:bg-violet-950/60'
                                                : 'border-border bg-card hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="text-[11px] font-bold text-foreground">{cell}</div>
                                        <div className="text-xl font-black text-foreground">
                                            {matrixCounts[cell] || 0}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">ควบคุมปานกลาง</div>
                                    </button>
                                );
                            })}

                            {/* Row C */}
                            <div className="flex items-center justify-center p-2 rounded-lg bg-slate-100 text-slate-900 font-bold dark:bg-slate-800 dark:text-slate-300">
                                C (มูลค่า 5%)
                            </div>
                            {['CV', 'CE', 'CN'].map((cell) => {
                                const isSelected = selectedCell === cell;
                                return (
                                    <button
                                        key={cell}
                                        type="button"
                                        onClick={() => setSelectedCell(isSelected ? null : cell)}
                                        className={`rounded-xl p-3 text-left transition border ${
                                            isSelected
                                                ? 'border-violet-600 bg-violet-100 ring-2 ring-violet-500 font-bold dark:bg-violet-950/60'
                                                : 'border-border bg-card hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="text-[11px] font-bold text-foreground">{cell}</div>
                                        <div className="text-xl font-black text-foreground">
                                            {matrixCounts[cell] || 0}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">ควบคุมพื้นฐาน</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Days of Supply Health Card */}
                    <div className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
                        <div>
                            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
                                <Activity className="h-4 w-4 text-emerald-600" />
                                ดัชนีวันคงเหลือ (Days of Supply)
                            </h2>
                            <p className="text-xs text-muted-foreground mb-4">
                                ประเมินระยะเวลาที่สต็อกจะพอใช้ คำนวณจากการใช้ยาจริง 90 วันย้อนหลัง (ADU)
                            </p>

                            <div className="space-y-2.5">
                                {[
                                    { key: 'critical_low', label: 'วิกฤตใกล้หมด (< 7 วัน)', count: statusCounts.critical_low, color: 'bg-rose-500', text: 'text-rose-700' },
                                    { key: 'reorder_needed', label: 'ถึงขั้นต่ำที่ต้องสั่งซื้อ (7-14 วัน)', count: statusCounts.reorder_needed, color: 'bg-amber-500', text: 'text-amber-700' },
                                    { key: 'healthy', label: 'สต็อกปกติ (15-180 วัน)', count: statusCounts.healthy, color: 'bg-emerald-500', text: 'text-emerald-700' },
                                    { key: 'overstock', label: 'สต็อกเกินความต้องการ (> 180 วัน)', count: statusCounts.overstock, color: 'bg-sky-500', text: 'text-sky-700' },
                                    { key: 'dead_stock', label: 'ไม่มีการเคลื่อนไหว (Dead Stock 90 วัน)', count: statusCounts.dead_stock, color: 'bg-slate-400', text: 'text-slate-700' },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setSelectedStatus(selectedStatus === item.key ? 'all' : item.key)}
                                        className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                                            selectedStatus === item.key ? 'border-violet-600 bg-violet-50 font-bold' : 'border-border hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                                            <span>{item.label}</span>
                                        </div>
                                        <span className={`font-bold ${item.text}`}>{item.count} SKUs</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedStatus !== 'all' && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedStatus('all')}
                                className="mt-4 rounded-xl text-xs"
                            >
                                ล้างตัวกรองสถานะ
                            </Button>
                        )}
                    </div>
                </div>

                {/* Near-Expiry Tracker Table */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        รายการ Lot ยาใกล้หมดอายุ (ภายใน 180 วัน)
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold">Lot No.</th>
                                    <th className="px-4 py-2.5 font-semibold">รายการยา</th>
                                    <th className="px-4 py-2.5 font-semibold">สถานที่</th>
                                    <th className="px-4 py-2.5 font-semibold">วันหมดอายุ</th>
                                    <th className="px-4 py-2.5 font-semibold text-center">คงเหลือเวลา</th>
                                    <th className="px-4 py-2.5 font-semibold text-right">จำนวนคงเหลือ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {nearExpiryLots.map((lot, idx) => (
                                    <tr key={idx} className="hover:bg-muted/30">
                                        <td className="px-4 py-2 font-mono font-bold text-foreground">{lot.lot_no}</td>
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-foreground">{lot.item_name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{lot.icode}</div>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-muted-foreground">{lot.location_name}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{lot.expires_at}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                lot.days_remaining <= 30
                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                                    : lot.days_remaining <= 90
                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                            }`}>
                                                {lot.days_remaining <= 0 ? 'หมดอายุแล้ว' : `อีก ${lot.days_remaining} วัน`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold text-foreground">
                                            {lot.qty_remaining} {lot.unit}
                                        </td>
                                    </tr>
                                ))}
                                {nearExpiryLots.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-xs">
                                            ไม่มีรายการ Lot ยาที่ใกล้หมดอายุในระยะ 180 วัน
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Main SKUs Inventory Table */}
                <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xs">
                    <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 p-4 gap-3">
                        <div>
                            <h3 className="font-bold text-foreground">รายการวิเคราะห์ยาคงเหลือ ({filteredItems.length} SKUs)</h3>
                            <div className="text-xs text-muted-foreground">
                                {selectedCell && <span className="mr-2 text-violet-700 font-semibold">กลุ่ม ABC-VEN: {selectedCell}</span>}
                                {selectedStatus !== 'all' && <span className="text-violet-700 font-semibold">สถานะ: {selectedStatus}</span>}
                            </div>
                        </div>
                        <div className="relative min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="ค้นหาชื่อยา หรือ icode..."
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">รหัส (icode)</th>
                                    <th className="px-4 py-3 font-semibold">รายการยา</th>
                                    <th className="px-4 py-3 font-semibold text-center">ABC / VEN</th>
                                    <th className="px-4 py-3 font-semibold text-right">คงเหลือ</th>
                                    <th className="px-4 py-3 font-semibold text-right">ใช้เฉลี่ย/วัน (ADU)</th>
                                    <th className="px-4 py-3 font-semibold text-center">วันคงเหลือ (DOS)</th>
                                    <th className="px-4 py-3 font-semibold text-right">มูลค่ารวม (฿)</th>
                                    <th className="px-4 py-3 font-semibold text-center">บัตรคุมยา</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {filteredItems.map((it) => (
                                    <tr key={it.item_id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 font-mono font-bold text-xs">{it.icode}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-foreground">{it.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {it.strength ? `${it.strength} · ` : ''}หน่วย: {it.unit}
                                            </div>
                                            {/* Badges */}
                                            <div className="flex gap-1 mt-1">
                                                {it.is_had && (
                                                    <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">HAD</span>
                                                )}
                                                {it.is_cold_chain && (
                                                    <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-700">Cold Chain</span>
                                                )}
                                                {it.is_narcotic && (
                                                    <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">Narcotic</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-secondary-foreground">
                                                {it.abc_ven || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {it.qty_on_hand.toLocaleString()} {it.unit}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                                            {it.daily_usage > 0 ? it.daily_usage.toFixed(2) : '0'} /วัน
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                it.status === 'critical_low' || it.status === 'out_of_stock'
                                                    ? 'bg-rose-100 text-rose-700'
                                                    : it.status === 'reorder_needed'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : it.status === 'dead_stock'
                                                    ? 'bg-slate-200 text-slate-700'
                                                    : it.status === 'overstock'
                                                    ? 'bg-sky-100 text-sky-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {it.days_of_supply >= 999 ? 'ไม่เคลื่อนไหว' : `${it.days_of_supply} วัน`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            ฿{it.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs text-violet-700 hover:bg-violet-50">
                                                <Link href={route('pharmacy.inventory.stock-card', { icode: it.icode })}>
                                                    บัตรคุม
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                            ไม่พบรายการยาที่ตรงกับเงื่อนไขการค้นหา
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
