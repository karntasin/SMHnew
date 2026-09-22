import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ArrowRightLeft, PackagePlus, Pill, ScanLine } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import InlineBarcodeScanner from '@/components/pharmacy/InlineBarcodeScanner';
import { inventoryFormShell, inventorySelectClass } from '@/pages/Pharmacy/Inventory/ui-classes';

type ScanResult = {
    code: string;
    item: { id: number; icode: string; name: string; strength?: string; base_unit: string };
    unit?: { id: number; name: string; factor_to_base: number; hierarchy_label: string; packaging_type?: string };
    lot?: { id: number; lot_no: string; location: string; qty_remaining: number; expires_at?: string };
};

type Location = { id: number; name: string; type: string };

export default function Scanner({ locations }: { locations: Location[] }) {
    const [code, setCode] = useState('');
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState('');
    const pharmacies = locations.filter((location) => location.type === 'pharmacy');
    const [locationId, setLocationId] = useState(String(pharmacies[0]?.id ?? ''));
    const [dispenseQty, setDispenseQty] = useState('1');
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;

    const resolveCode = async (value: string) => {
        const normalized = value.trim();
        if (!normalized) return;
        setError('');
        try {
            const response = await axios.get(route('pharmacy.inventory.scan.resolve'), { params: { code: normalized } });
            setResult(response.data?.data ?? null);
            setCode(normalized);
        } catch (scanError) {
            setResult(null);
            setError(axios.isAxiosError(scanError) ? (scanError.response?.data?.message ?? 'ไม่พบบาร์โค้ดนี้ในระบบ') : 'สแกนไม่สำเร็จ');
        }
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'สแกนบาร์โค้ด' },
        ])}>
            <Head title="สแกนบาร์โค้ดยา" />
            <div className="container mx-auto space-y-5 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                {(flash?.success || flash?.error) && (
                    <div className={`mx-auto max-w-3xl rounded-2xl p-3 text-sm ${flash.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {flash.error || flash.success}
                    </div>
                )}
                <section className={inventoryFormShell}>
                    <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                            <ScanLine className="h-6 w-6" />
                        </span>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">สแกนบาร์โค้ดยา</h1>
                            <p className="text-sm text-muted-foreground">
                                เล็งบาร์โค้ดผ่านกล้องเลเซอร์แดง หรือใช้เครื่องยิง หรือถ่ายรูปบาร์โค้ด
                            </p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <InlineBarcodeScanner
                            value={code}
                            onChange={setCode}
                            onDetected={resolveCode}
                            error={error}
                        />
                    </div>
                </section>

                {result && (
                    <section className="mx-auto max-w-3xl rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40 shadow-sm animate-in fade-in-50 duration-300">
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            พบข้อมูลยา
                        </div>
                        <h2 className="mt-1 text-xl font-bold text-emerald-950 dark:text-emerald-50">{result.item.name}</h2>
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">
                            icode: <span className="font-mono font-semibold">{result.item.icode}</span>
                            {result.item.strength ? ` · ${result.item.strength}` : ''}
                            {result.item.base_unit ? ` · หน่วยฐาน: ${result.item.base_unit}` : ''}
                        </p>

                        {result.unit && (
                            <div className="mt-3 rounded-2xl bg-card p-3.5 border border-emerald-100 dark:border-emerald-900/60 shadow-sm text-card-foreground">
                                <b className="text-emerald-950 dark:text-emerald-100">
                                    {result.unit.packaging_type || 'บรรจุภัณฑ์'}: {result.unit.name}
                                </b>
                                <div className="text-sm text-muted-foreground mt-0.5">
                                    {result.unit.hierarchy_label} · บรรจุ {result.unit.factor_to_base} {result.item.base_unit}
                                </div>
                            </div>
                        )}

                        {result.lot && (
                            <div className="mt-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 p-3.5 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-950 dark:text-emerald-100">
                                <div className="font-semibold">ข้อมูล Lot คงคลัง</div>
                                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                    <div>Lot: <span className="font-mono font-bold text-foreground">{result.lot.lot_no}</span></div>
                                    <div>สถานที่จัดเก็บ: <span className="font-medium text-foreground">{result.lot.location}</span></div>
                                    <div>คงเหลือ: <span className="font-bold text-emerald-700 dark:text-emerald-300">{result.lot.qty_remaining}</span> {result.item.base_unit}</div>
                                    <div>วันหมดอายุ: <span className="font-medium text-foreground">{result.lot.expires_at || '—'}</span></div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button asChild className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white">
                                <Link href={route('pharmacy.inventory.receive', { barcode: result.code })}>
                                    <PackagePlus className="mr-2 h-4 w-4" />รับเข้าด้วยรายการนี้
                                </Link>
                            </Button>
                            <Button asChild variant="secondary" className="rounded-xl">
                                <Link href={route('pharmacy.inventory.transfer', { barcode: result.code })}>
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />เบิกเข้าห้องยา
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl">
                                <Link href={route('pharmacy.inventory.items', { q: result.item.icode })}>
                                    จัดการยา / หน่วยบรรจุ
                                </Link>
                            </Button>
                        </div>

                        {result.unit && pharmacies.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                                <b className="text-sm text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                                    <Pill className="h-4 w-4 text-amber-600" /> ตัดจ่ายด่วนด้วยบาร์โค้ดนี้
                                </b>
                                <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                                    <select
                                        value={locationId}
                                        onChange={(event) => setLocationId(event.target.value)}
                                        className={inventorySelectClass}
                                    >
                                        {pharmacies.map((loc) => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <Input
                                        value={dispenseQty}
                                        onChange={(event) => setDispenseQty(event.target.value)}
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                    />
                                    <Button
                                        type="button"
                                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                                        onClick={() => router.post(route('pharmacy.inventory.dispense.manual'), {
                                            location_id: locationId,
                                            icode: result.item.icode,
                                            unit_id: result.unit?.id,
                                            qty: dispenseQty,
                                        })}
                                    >
                                        <Pill className="mr-2 h-4 w-4" />ตัดจ่าย
                                    </Button>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
