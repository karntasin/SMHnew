import { FormEvent, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Barcode, ChevronDown, ChevronUp, ScanLine, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';

type BarcodeRow = { id: number; barcode: string; symbology: string; label?: string; is_primary: boolean };
type Unit = {
    id: number;
    name: string;
    parent_unit_id?: number;
    contains_qty: number;
    factor_to_base: number;
    barcode?: string;
    usage_context: string;
    is_default_receive: boolean;
    is_default_transfer: boolean;
    is_default_dispense: boolean;
    is_active: boolean;
    parent_unit?: { id: number; name: string };
    packaging_type?: { id: number; name: string };
    barcodes: BarcodeRow[];
};
type Item = {
    id: number;
    icode: string;
    name: string;
    item_type?: string;
    income_code?: string;
    strength?: string;
    base_unit?: string;
    dispense_unit?: string;
    barcode?: string;
    units: Unit[];
};
type PackagingType = { id: number; code: string; name: string };

const formData = (form: HTMLFormElement) => Object.fromEntries(new FormData(form).entries());

export default function Items({
    items,
    packagingTypes,
    filters,
    stats,
}: {
    items: { data: Item[] };
    packagingTypes: PackagingType[];
    filters: { q: string; item_type?: string };
    stats?: { total: number; drugs: number; nondrugs: number };
}) {
    const [open, setOpen] = useState<number | null>(items.data.length === 1 ? items.data[0].id : null);
    const activeItemType = filters.item_type || 'all';

    const search = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        router.get(route('pharmacy.inventory.items'), {
            q: fd.get('q'),
            item_type: activeItemType !== 'all' ? activeItemType : undefined,
        }, { preserveState: true });
    };

    const filterByType = (type: string) => {
        router.get(route('pharmacy.inventory.items'), {
            q: filters.q || undefined,
            item_type: type !== 'all' ? type : undefined,
        }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'จัดการยาและบรรจุภัณฑ์' },
        ])}>
            <Head title="จัดการยาและบรรจุภัณฑ์" />
            <div className="container mx-auto space-y-5 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white p-5 shadow-xs">
                    <div>
                        <h1 className="text-xl font-bold">จัดการยา เวชภัณฑ์มิใช่ยา และหน่วยบรรจุ</h1>
                        <p className="text-sm text-slate-500">สร้างจากหน่วยเล็กไปใหญ่ เช่น เม็ด → แพ็ค → กล่อง → ลัง</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={route('pharmacy.inventory.scan')}>
                                <ScanLine className="mr-2 h-4 w-4" />เปิดเครื่องสแกน
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold"
                            onClick={() => router.post(route('pharmacy.inventory.items.import'), { type: 'nondrug' })}
                        >
                            นำเข้าเวชภัณฑ์มิใช่ยา (HOSxP)
                        </Button>
                        <Button
                            className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-semibold"
                            onClick={() => router.post(route('pharmacy.inventory.items.import'), { type: 'drug' })}
                        >
                            นำเข้ายา (HOSxP)
                        </Button>
                    </div>
                </section>

                {/* Filter Tabs by Item Type */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => filterByType('all')}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${activeItemType === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        ทั้งหมด {stats ? `(${stats.total})` : ''}
                    </button>
                    <button
                        type="button"
                        onClick={() => filterByType('drug')}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${activeItemType === 'drug' ? 'bg-sky-600 text-white shadow-xs' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'}`}
                    >
                        เฉพาะยา {stats ? `(${stats.drugs})` : ''}
                    </button>
                    <button
                        type="button"
                        onClick={() => filterByType('nondrug')}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${activeItemType === 'nondrug' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'}`}
                    >
                        ค่าเวชภัณฑ์ที่มิใช่ยา {stats ? `(${stats.nondrugs})` : ''}
                    </button>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                    <b>ตัวอย่าง:</b> สร้าง “เม็ด” หรือ “ชิ้น” เป็นหน่วยฐาน → สร้าง “แพ็ค” โดยเลือกหน่วยย่อยและระบุ 10 →
                    สร้าง “กล่อง” โดยเลือกหน่วยย่อย “แพ็ค” และระบุ 100 ระบบจะคำนวณ 1 กล่อง = 1,000 หน่วยให้อัตโนมัติ
                </div>

                <form onSubmit={search} className="flex gap-2">
                    <Input name="q" defaultValue={filters.q} placeholder="ชื่อยา/เวชภัณฑ์ / icode / barcode" className="rounded-xl" />
                    <Button type="submit" variant="secondary" className="rounded-xl">ค้นหา</Button>
                </form>

                <div className="space-y-3">
                    {items.data.map((item) => (
                        <section key={item.id} className="rounded-3xl border bg-white p-4 shadow-xs">
                            <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(open === item.id ? null : item.id)}>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-semibold text-slate-900 text-base">{item.name}</h2>
                                        {item.item_type === 'nondrug' ? (
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                                                ค่าเวชภัณฑ์ที่มิใช่ยา
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 border border-sky-300">
                                                ยา
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{item.icode} {item.strength ? `· ${item.strength}` : ''}</p>
                                    <p className="mt-1 text-xs text-violet-700">
                                        หน่วยฐาน {item.base_unit || 'ยังไม่กำหนด'} · {item.units.slice().sort((a, b) => a.factor_to_base - b.factor_to_base).map((unit) => `${unit.name} ×${unit.factor_to_base}`).join(' → ') || 'ยังไม่มีหน่วยบรรจุ'}
                                    </p>
                                </div>
                                {open === item.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                            </button>

                            {open === item.id && (
                                <div className="mt-4 space-y-5 border-t pt-4">
                                    <form onSubmit={(event) => {
                                        event.preventDefault();
                                        router.patch(route('pharmacy.inventory.items.update', { item: item.id }), formData(event.currentTarget));
                                    }} className="grid gap-2 md:grid-cols-4">
                                        <Input name="base_unit" defaultValue={item.base_unit || ''} placeholder="หน่วยฐาน เช่น เม็ด" required />
                                        <Input name="dispense_unit" defaultValue={item.dispense_unit || item.base_unit || ''} placeholder="หน่วยจ่าย HOSxP" />
                                        <Input name="barcode" defaultValue={item.barcode || ''} placeholder="บาร์โค้ดระดับรายการยา" />
                                        <input type="hidden" name="is_active" value="1" />
                                        <Button size="sm">บันทึกข้อมูลหลัก</Button>
                                    </form>

                                    <div>
                                        <h3 className="mb-2 font-semibold">โครงสร้างบรรจุภัณฑ์</h3>
                                        <div className="space-y-2">
                                            {item.units.slice().sort((a, b) => a.factor_to_base - b.factor_to_base).map((unit) => (
                                                <div key={unit.id} className="rounded-2xl border border-slate-200 p-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <b>{unit.packaging_type?.name || 'หน่วย'}: {unit.name}</b>
                                                            <span className="ml-2 text-sm text-violet-700">
                                                                {unit.parent_unit ? `1 ${unit.name} = ${unit.contains_qty} ${unit.parent_unit.name}` : 'หน่วยฐาน'}
                                                                {' · '}รวม ×{unit.factor_to_base} {item.base_unit}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {unit.is_default_receive && 'รับเข้าเริ่มต้น · '}
                                                            {unit.is_default_transfer && 'เบิกเริ่มต้น · '}
                                                            {unit.is_default_dispense && 'จ่ายเริ่มต้น'}
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {unit.barcodes.map((barcode) => (
                                                            <span key={barcode.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-800">
                                                                <Barcode className="h-3 w-3" />{barcode.barcode}
                                                                <button type="button" title="ลบบาร์โค้ด" onClick={() => router.delete(route('pharmacy.inventory.barcodes.destroy', { barcode: barcode.id }))}><Trash2 className="h-3 w-3" /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <details className="mt-2">
                                                        <summary className="cursor-pointer text-xs font-medium text-slate-600">แก้ไขหน่วยและอัตราบรรจุ</summary>
                                                        <form onSubmit={(event) => {
                                                            event.preventDefault();
                                                            router.patch(route('pharmacy.inventory.units.update', { unit: unit.id }), formData(event.currentTarget));
                                                        }} className="mt-2 grid gap-2 md:grid-cols-4">
                                                            <Input name="name" defaultValue={unit.name} required />
                                                            <select name="packaging_type_id" defaultValue={unit.packaging_type?.id || ''} className="h-10 rounded-md border px-2 text-sm">
                                                                <option value="">ประเภทบรรจุภัณฑ์</option>
                                                                {packagingTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                                                            </select>
                                                            <select name="parent_unit_id" defaultValue={unit.parent_unit_id || ''} className="h-10 rounded-md border px-2 text-sm">
                                                                <option value="">เป็นหน่วยฐาน</option>
                                                                {item.units.filter((candidate) => candidate.id !== unit.id).map((candidate) => <option key={candidate.id} value={candidate.id}>ภายในเป็น {candidate.name}</option>)}
                                                            </select>
                                                            <Input name="contains_qty" type="number" min="0.0001" step="0.0001" defaultValue={unit.contains_qty || 1} required />
                                                            <Input name="barcode" defaultValue={unit.barcode || ''} placeholder="บาร์โค้ดเดิม" />
                                                            <select name="usage_context" defaultValue={unit.usage_context} className="h-10 rounded-md border px-2 text-sm">
                                                                <option value="all">ใช้ทุกงาน</option><option value="receive">รับเข้า</option>
                                                                <option value="transfer">เบิก</option><option value="dispense">จ่าย</option>
                                                            </select>
                                                            {['is_active', 'is_default_receive', 'is_default_transfer', 'is_default_dispense'].map((field) => <input key={`${field}-hidden`} type="hidden" name={field} value="0" />)}
                                                            <label className="text-xs"><input type="checkbox" name="is_active" value="1" defaultChecked={unit.is_active} /> ใช้งาน</label>
                                                            <label className="text-xs"><input type="checkbox" name="is_default_receive" value="1" defaultChecked={unit.is_default_receive} /> รับเข้าเริ่มต้น</label>
                                                            <label className="text-xs"><input type="checkbox" name="is_default_transfer" value="1" defaultChecked={unit.is_default_transfer} /> เบิกเริ่มต้น</label>
                                                            <label className="text-xs"><input type="checkbox" name="is_default_dispense" value="1" defaultChecked={unit.is_default_dispense} /> จ่ายเริ่มต้น</label>
                                                            <Button size="sm" variant="secondary">บันทึกการแก้ไข</Button>
                                                        </form>
                                                    </details>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <form onSubmit={(event) => {
                                            event.preventDefault();
                                            router.post(route('pharmacy.inventory.items.units.store', { item: item.id }), formData(event.currentTarget));
                                        }} className="space-y-3 rounded-2xl bg-slate-50 p-4">
                                            <h3 className="font-semibold">เพิ่มระดับบรรจุภัณฑ์</h3>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <select name="packaging_type_id" className="h-10 rounded-md border px-3 text-sm">
                                                    <option value="">เลือกประเภทบรรจุภัณฑ์</option>
                                                    {packagingTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                                                </select>
                                                <Input name="name" placeholder="ชื่อหน่วย เช่น กล่อง" required />
                                                <select name="parent_unit_id" className="h-10 rounded-md border px-3 text-sm">
                                                    <option value="">เป็นหน่วยฐาน</option>
                                                    {item.units.map((unit) => <option key={unit.id} value={unit.id}>ภายในเป็น {unit.name}</option>)}
                                                </select>
                                                <Input name="contains_qty" type="number" step="0.0001" min="0.0001" defaultValue="1" placeholder="บรรจุกี่หน่วยย่อย" required />
                                                <Input name="barcode" placeholder="บาร์โค้ดหลักของบรรจุภัณฑ์" />
                                                <select name="usage_context" className="h-10 rounded-md border px-3 text-sm">
                                                    <option value="all">ใช้ได้ทุกงาน</option><option value="receive">รับเข้า</option>
                                                    <option value="transfer">เบิก</option><option value="dispense">จ่าย</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-xs">
                                                <label><input type="checkbox" name="is_default_receive" value="1" /> ค่าเริ่มต้นรับเข้า</label>
                                                <label><input type="checkbox" name="is_default_transfer" value="1" /> ค่าเริ่มต้นเบิก</label>
                                                <label><input type="checkbox" name="is_default_dispense" value="1" /> ค่าเริ่มต้นจ่าย</label>
                                            </div>
                                            <Button size="sm">เพิ่มระดับบรรจุภัณฑ์</Button>
                                        </form>

                                        <form onSubmit={(event) => {
                                            event.preventDefault();
                                            router.post(route('pharmacy.inventory.items.barcodes.store', { item: item.id }), formData(event.currentTarget));
                                        }} className="space-y-3 rounded-2xl bg-emerald-50 p-4">
                                            <h3 className="font-semibold">เพิ่มบาร์โค้ดให้กล่อง/หน่วย</h3>
                                            <select name="unit_id" className="h-10 w-full rounded-md border px-3 text-sm" required>
                                                <option value="">เลือกหน่วยบรรจุ</option>
                                                {item.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} (×{unit.factor_to_base})</option>)}
                                            </select>
                                            <Input name="barcode" placeholder="ยิงหรือกรอกบาร์โค้ด" autoComplete="off" required />
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input name="label" placeholder="คำอธิบาย เช่น กล่อง รพ." />
                                                <select name="symbology" className="h-10 rounded-md border px-3 text-sm">
                                                    <option value="AUTO">ตรวจอัตโนมัติ</option><option value="EAN13">EAN-13</option>
                                                    <option value="EAN8">EAN-8</option><option value="CODE128">Code 128</option>
                                                    <option value="CODE39">Code 39</option><option value="QR">QR Code</option>
                                                </select>
                                            </div>
                                            <label className="text-xs"><input type="checkbox" name="is_primary" value="1" /> ตั้งเป็นบาร์โค้ดหลักของหน่วยนี้</label>
                                            <div><Button size="sm" className="bg-emerald-700 hover:bg-emerald-800">บันทึกบาร์โค้ด</Button></div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
