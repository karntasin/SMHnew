import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';

type Row = {
    id: number;
    type: string;
    qty: number;
    hn?: string;
    vn?: string;
    vstdate?: string;
    note?: string;
    created_at?: string;
    item: { icode?: string; name?: string; item_type?: string; item_type_label?: string };
    lot_no?: string;
    from?: string;
    to?: string;
    user?: string;
};

const typeLabel: Record<string, string> = {
    receive: 'รับเข้า',
    transfer_out: 'เบิกออก',
    transfer_in: 'รับโอน',
    dispense: 'ตัดจ่าย',
    adjust: 'ปรับยอด',
    return: 'คืน',
    expire: 'หมดอายุ',
};

export default function Movements({ rows }: { rows: Row[] }) {
    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'ประวัติเคลื่อนไหว' },
        ])}>
            <Head title="ประวัติเคลื่อนไหวยา" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <div className="flex justify-between">
                    <h1 className="text-xl font-bold">ประวัติเคลื่อนไหวสต็อก</h1>
                    <Button asChild variant="secondary" className="rounded-xl"><Link href={route('pharmacy.inventory.stock')}>กลับคงเหลือ</Link></Button>
                </div>
                <div className="overflow-hidden rounded-3xl border bg-white">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-3">เวลา</th>
                                <th className="px-3 py-3">ประเภท</th>
                                <th className="px-3 py-3">ยา</th>
                                <th className="px-3 py-3">จำนวน</th>
                                <th className="px-3 py-3">จาก → ไป</th>
                                <th className="px-3 py-3">อ้างอิง</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t">
                                    <td className="px-3 py-2 whitespace-nowrap">{r.created_at}</td>
                                    <td className="px-3 py-2">{typeLabel[r.type] || r.type}</td>
                                    <td className="px-3 py-2">
                                        <div className="font-medium flex items-center gap-1.5 flex-wrap">
                                            <span>{r.item.name}</span>
                                            {r.item.item_type === 'nondrug' && (
                                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                                    📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-500">{r.item.icode} · lot {r.lot_no || '—'}</div>
                                    </td>
                                    <td className="px-3 py-2 font-semibold">{r.qty}</td>
                                    <td className="px-3 py-2 text-xs">{r.from || '—'} → {r.to || '—'}</td>
                                    <td className="px-3 py-2 text-xs text-slate-600">
                                        {r.hn ? `HN ${r.hn} / VN ${r.vn}` : (r.note || r.user || '—')}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">ยังไม่มีรายการ</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
