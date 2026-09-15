import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormEvent, useState } from 'react';

type Lot = {
    id: number;
    lot_no: string;
    qr_token: string;
    received_at?: string;
    expires_at?: string;
    qty_remaining: number;
    status: string;
    item: { icode?: string; name?: string };
    location: { name?: string; type?: string };
};

export default function Lots({ lots, filters }: { lots: Lot[]; filters: { q?: string } }) {
    const [q, setQ] = useState(filters.q || '');
    const onSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(route('pharmacy.inventory.lots'), { q: q || undefined }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'Lot / QR' },
        ])}>
            <Head title="Lot ยา" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <form onSubmit={onSearch} className="flex gap-2">
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="lot / ชื่อยา / QR token" className="max-w-md" />
                    <Button type="submit" className="rounded-xl">ค้นหา</Button>
                </form>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {lots.map((lot) => (
                        <Link key={lot.id} href={route('pharmacy.inventory.lots.show', lot.id)} className="rounded-3xl border bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md">
                            <div className="text-xs text-slate-500">{lot.location.name} · {lot.status}</div>
                            <div className="mt-1 font-semibold text-slate-900">{lot.item.name}</div>
                            <div className="text-[11px] text-slate-500">{lot.item.icode}</div>
                            <div className="mt-3 text-sm">Lot <span className="font-mono">{lot.lot_no}</span></div>
                            <div className="text-sm text-slate-600">เหลือ {lot.qty_remaining} · หมดอายุ {lot.expires_at || '—'}</div>
                        </Link>
                    ))}
                    {lots.length === 0 && <div className="text-slate-500">ยังไม่มี lot</div>}
                </div>
            </div>
        </AppLayout>
    );
}
