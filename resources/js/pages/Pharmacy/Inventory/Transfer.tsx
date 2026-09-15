import { FormEvent, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

type Location = { id: number; code: string; name: string; type: string };
type Drug = { icode: string; name: string; strength?: string | null };

export default function Transfer({ locations }: { locations: Location[] }) {
    const warehouses = locations.filter((l) => l.type === 'warehouse');
    const pharmacies = locations.filter((l) => l.type === 'pharmacy');
    const [icode, setIcode] = useState('');
    const [q, setQ] = useState('');
    const [hits, setHits] = useState<Drug[]>([]);

    useEffect(() => {
        if (q.trim().length < 2) return;
        const t = setTimeout(() => {
            axios.get(route('pharmacy.inventory.drugs.search'), { params: { q } }).then((res) => setHits(res.data?.data ?? []));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        router.post(route('pharmacy.inventory.transfer.store'), Object.fromEntries(fd.entries()));
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'เบิกเข้าห้องยา' },
        ])}>
            <Head title="เบิกเข้าห้องยา" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
                    <h1 className="text-xl font-bold">เบิกจากคลัง → ห้องยา</h1>
                    <p className="text-sm text-slate-500">ตัดสต็อกคลังและเพิ่มสต็อกห้องยาแบบ FEFO (lot หมดอายุก่อนถูกเบิกก่อน)</p>

                    <div className="space-y-2">
                        <Label>ค้นหายา</Label>
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อยา / icode" />
                        {hits.length > 0 && (
                            <div className="max-h-40 overflow-auto rounded-xl border">
                                {hits.map((d) => (
                                    <button key={d.icode} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-violet-50" onClick={() => { setIcode(d.icode); setQ(d.name); setHits([]); }}>
                                        {d.name} <span className="text-slate-500">({d.icode})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <input type="hidden" name="icode" value={icode} required />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>จากคลัง</Label>
                            <select name="from_location_id" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={warehouses[0]?.id} required>
                                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>ไปห้องยา</Label>
                            <select name="to_location_id" className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={pharmacies[0]?.id} required>
                                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>จำนวน</Label>
                            <Input name="qty" type="number" step="0.01" min="0.01" required />
                        </div>
                        <div className="space-y-2">
                            <Label>หมายเหตุ</Label>
                            <Input name="note" />
                        </div>
                    </div>
                    <Button type="submit" className="rounded-xl bg-violet-700 hover:bg-violet-800" disabled={!icode}>ยืนยันเบิก</Button>
                </form>
            </div>
        </AppLayout>
    );
}
