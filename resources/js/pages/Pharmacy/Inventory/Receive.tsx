import { FormEvent, useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

type Location = { id: number; code: string; name: string; type: string };
type Drug = { icode: string; name: string; strength?: string | null; unit?: string | null };

export default function Receive({ locations }: { locations: Location[] }) {
    const warehouses = locations.filter((l) => l.type === 'warehouse');
    const [icode, setIcode] = useState('');
    const [q, setQ] = useState('');
    const [hits, setHits] = useState<Drug[]>([]);
    const [selected, setSelected] = useState<Drug | null>(null);

    useEffect(() => {
        if (q.trim().length < 2) {
            setHits([]);
            return;
        }
        const t = setTimeout(() => {
            axios.get(route('pharmacy.inventory.drugs.search'), { params: { q } }).then((res) => {
                setHits(res.data?.data ?? []);
            });
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        router.post(route('pharmacy.inventory.receive.store'), Object.fromEntries(fd.entries()));
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'รับเข้ายา' },
        ])}>
            <Head title="รับเข้ายา" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900">รับเข้ายาเข้าคลัง</h1>
                    <p className="text-sm text-slate-500">ระบบจะสร้าง lot + QR อัตโนมัติ และตัดเชื่อมกับ icode ใน HOSxP</p>

                    <div className="space-y-2">
                        <Label>ค้นหายาจาก HOSxP</Label>
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่อยาหรือ icode..." />
                        {hits.length > 0 && (
                            <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
                                {hits.map((d) => (
                                    <button
                                        key={d.icode}
                                        type="button"
                                        className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-violet-50"
                                        onClick={() => {
                                            setSelected(d);
                                            setIcode(d.icode);
                                            setHits([]);
                                            setQ(d.name);
                                        }}
                                    >
                                        <div className="font-medium">{d.name}</div>
                                        <div className="text-[11px] text-slate-500">{d.icode} {d.strength ? `· ${d.strength}` : ''}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selected && <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">เลือกแล้ว: {selected.name} ({selected.icode})</div>}
                        <input type="hidden" name="icode" value={icode} required />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>คลังรับเข้า</Label>
                            <select name="location_id" className="h-10 w-full rounded-md border px-3 text-sm" required defaultValue={warehouses[0]?.id}>
                                {locations.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Lot No.</Label>
                            <Input name="lot_no" required placeholder="เช่น LOT20260911" />
                        </div>
                        <div className="space-y-2">
                            <Label>จำนวน</Label>
                            <Input name="qty" type="number" step="0.01" min="0.01" required />
                        </div>
                        <div className="space-y-2">
                            <Label>วันที่รับ</Label>
                            <Input name="received_at" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                        </div>
                        <div className="space-y-2">
                            <Label>วันหมดอายุ</Label>
                            <Input name="expires_at" type="date" />
                        </div>
                        <div className="space-y-2">
                            <Label>ผู้จำหน่าย</Label>
                            <Input name="supplier" />
                        </div>
                        <div className="space-y-2">
                            <Label>เลขที่ใบส่งของ</Label>
                            <Input name="invoice_no" />
                        </div>
                        <div className="space-y-2">
                            <Label>เกณฑ์แจ้งเตือน (reorder)</Label>
                            <Input name="reorder_level" type="number" step="0.01" min="0" placeholder="เช่น 50" />
                        </div>
                        <div className="space-y-2">
                            <Label>เกณฑ์ขั้นต่ำ (min)</Label>
                            <Input name="min_level" type="number" step="0.01" min="0" placeholder="เช่น 20" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>หมายเหตุ</Label>
                        <Input name="notes" />
                    </div>
                    <Button type="submit" className="rounded-xl bg-violet-700 hover:bg-violet-800" disabled={!icode}>บันทึกรับเข้า + สร้าง QR</Button>
                </form>
            </div>
        </AppLayout>
    );
}
