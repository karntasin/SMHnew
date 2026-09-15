import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormEvent, useState } from 'react';

type Row = {
    id: number;
    qty_on_hand: number;
    reorder_level: number;
    min_level: number;
    available: number;
    is_low: boolean;
    is_empty: boolean;
    item: { icode?: string; name?: string; strength?: string; unit?: string };
    location: { id?: number; name?: string; type?: string };
};

export default function Stock({
    rows,
    locations,
    filters,
}: {
    rows: Row[];
    locations: Array<{ id: number; name: string; type: string }>;
    filters: { location_id?: number | null; q?: string };
}) {
    const [q, setQ] = useState(filters.q || '');
    const [locationId, setLocationId] = useState(filters.location_id ? String(filters.location_id) : '');

    const search = (e: FormEvent) => {
        e.preventDefault();
        router.get(route('pharmacy.inventory.stock'), {
            q: q || undefined,
            location_id: locationId || undefined,
        }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'คงเหลือ' },
        ])}>
            <Head title="คงเหลือยา" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <form onSubmit={search} className="flex flex-wrap gap-2 rounded-3xl border bg-white p-4">
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อยา / icode" className="max-w-xs" />
                    <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-10 rounded-md border px-3 text-sm">
                        <option value="">ทุกสถานที่</option>
                        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <Button type="submit" className="rounded-xl">ค้นหา</Button>
                    <Button asChild variant="secondary" className="rounded-xl"><Link href={route('pharmacy.inventory.movements')}>ประวัติเคลื่อนไหว</Link></Button>
                </form>

                <div className="overflow-hidden rounded-3xl border bg-white">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">สถานที่</th>
                                <th className="px-4 py-3">ยา</th>
                                <th className="px-4 py-3">คงเหลือ</th>
                                <th className="px-4 py-3">เกณฑ์</th>
                                <th className="px-4 py-3">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t">
                                    <td className="px-4 py-3">{r.location.name}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{r.item.name}</div>
                                        <div className="text-[11px] text-slate-500">{r.item.icode} {r.item.strength || ''}</div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{r.available}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600">min {r.min_level} / reorder {r.reorder_level}</td>
                                    <td className="px-4 py-3">
                                        {r.is_empty ? (
                                            <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-700">หมด</span>
                                        ) : r.is_low ? (
                                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">เหลือน้อย</span>
                                        ) : (
                                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700">ปกติ</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">ยังไม่มีสต็อก — เริ่มจากรับเข้ายา</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
