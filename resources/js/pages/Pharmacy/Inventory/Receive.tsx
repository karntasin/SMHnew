import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import InlineBarcodeScanner from '@/components/pharmacy/InlineBarcodeScanner';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import {
    inventoryFieldLabel,
    inventoryFormShell,
    inventoryPackCard,
    inventoryPackSection,
    inventoryScanBox,
    inventoryScanLabel,
    inventorySelectClass,
    inventorySummaryBox,
    inventorySummaryCard,
} from '@/pages/Pharmacy/Inventory/ui-classes';

type Location = { id: number; code: string; name: string; type: string };
type Drug = { icode: string; name: string; strength?: string | null; unit?: string | null; item_type?: string; income_name?: string };
type PackagingType = { id: number; code: string; name: string };
type ChainLevel = {
    packaging_type_id: string;
    name: string;
    contains_qty: string;
    barcode: string;
    use_scanned_barcode?: boolean;
};

function defaultLevels(baseUnit: string, types: PackagingType[]): ChainLevel[] {
    const findId = (...codes: string[]) => String(types.find((type) => codes.includes(type.code))?.id ?? '');
    const packType = types.find((t) => t.code === 'pack') || types.find((t) => t.name.includes('แพ็ค'));
    const boxType = types.find((t) => t.code === 'box') || types.find((t) => t.name.includes('กล่อง'));
    const baseType = types.find((t) => t.name.toLowerCase() === (baseUnit || '').toLowerCase())
        || types.find((t) => baseUnit && t.name.includes(baseUnit))
        || types.find((t) => ['tablet', 'base'].includes(t.code));

    return [
        {
            name: baseType?.name || baseUnit || 'หน่วยย่อย',
            packaging_type_id: String(baseType?.id ?? ''),
            contains_qty: '1',
            barcode: '',
            use_scanned_barcode: false,
        },
        {
            name: packType?.name || 'แพ็ค',
            packaging_type_id: String(packType?.id ?? findId('pack')),
            contains_qty: '10',
            barcode: '',
            use_scanned_barcode: false,
        },
        {
            name: boxType?.name || 'กล่อง',
            packaging_type_id: String(boxType?.id ?? findId('box', 'outer_box')),
            contains_qty: '10',
            barcode: '',
            use_scanned_barcode: false,
        },
    ];
}

export default function Receive({
    locations,
    packagingTypes = [],
    initialBarcode,
}: {
    locations: Location[];
    packagingTypes?: PackagingType[];
    initialBarcode?: string;
}) {
    const warehouses = locations.filter((l) => l.type === 'warehouse');
    const [icode, setIcode] = useState('');
    const [q, setQ] = useState('');
    const [hits, setHits] = useState<Drug[]>([]);
    const [selected, setSelected] = useState<Drug | null>(null);
    const [qty, setQty] = useState('1');
    const [barcode, setBarcode] = useState(initialBarcode || '');
    const [scanCode, setScanCode] = useState(initialBarcode || '');
    const [scanError, setScanError] = useState('');
    const [scanSuccessNote, setScanSuccessNote] = useState('');
    const [levels, setLevels] = useState<ChainLevel[]>(() => defaultLevels('หน่วยย่อย', packagingTypes));

    const currentScannedBarcode = (barcode || scanCode || '').trim();

    const toggleUseScannedBarcode = (index: number, checked: boolean) => {
        setLevels((current) => current.map((lvl, i) => {
            if (i === index) {
                return {
                    ...lvl,
                    use_scanned_barcode: checked,
                    barcode: checked ? currentScannedBarcode : lvl.barcode,
                };
            }
            // หากระดับนี้ถูกติ๊กเลือก ให้ยกเลิกติ๊กของระดับอื่นเพื่อป้องกันบาร์โค้ดซ้ำ
            if (checked && lvl.use_scanned_barcode) {
                return {
                    ...lvl,
                    use_scanned_barcode: false,
                    barcode: lvl.barcode === currentScannedBarcode ? '' : lvl.barcode,
                };
            }
            return lvl;
        }));
    };

    // อัปเดตบาร์โค้ดให้กับระดับที่ติ๊ก "ใช้อันเดียวกับบาร์โค้ดที่สแกน" แบบอัตโนมัติทันทีที่มีการสแกนใหม่
    useEffect(() => {
        if (!currentScannedBarcode) return;
        setLevels((current) => current.map((lvl) => {
            if (lvl.use_scanned_barcode && lvl.barcode !== currentScannedBarcode) {
                return { ...lvl, barcode: currentScannedBarcode };
            }
            return lvl;
        }));
    }, [currentScannedBarcode]);

    const factorToBase = useMemo(() => {
        return levels.reduce((factor, level, index) => {
            if (index === 0) return 1;
            return factor * (Number(level.contains_qty) || 1);
        }, 1);
    }, [levels]);

    const stockQty = (Number(qty) || 0) * factorToBase;
    const outerName = levels[levels.length - 1]?.name || 'หน่วยนอกสุด';
    const baseName = levels[0]?.name || selected?.unit || 'หน่วยฐาน';

    const chooseDrug = async (drug: Drug) => {
        setSelected(drug);
        setIcode(drug.icode);
        setHits([]);
        setQ(drug.name);

        try {
            const res = await axios.get(route('pharmacy.inventory.drugs.units', { icode: drug.icode }));
            const existing = (res.data?.data?.units ?? []) as Array<{
                name: string;
                contains_qty: number;
                packaging_type?: string;
                barcodes?: string[];
                factor_to_base: number;
            }>;
            if (existing.length >= 2) {
                const sorted = [...existing].sort((a, b) => a.factor_to_base - b.factor_to_base);
                const hasMatched = currentScannedBarcode !== '' && sorted.some((u) => u.barcodes?.includes(currentScannedBarcode));
                setLevels(sorted.map((unit, index) => {
                    const matchedType = packagingTypes.find((t) => t.name === unit.packaging_type)
                        || (index === 0 ? packagingTypes.find((t) => t.name.toLowerCase() === (drug.unit || '').toLowerCase() || (drug.unit && t.name.includes(drug.unit))) : undefined);
                    const unitBarcode = unit.barcodes?.[0] || '';
                    const isSynced = currentScannedBarcode !== '' && (
                        hasMatched
                            ? unit.barcodes?.includes(currentScannedBarcode)
                            : index === sorted.length - 1
                    );
                    return {
                        name: matchedType?.name || (index === 0 ? (drug.unit || unit.name) : unit.name),
                        packaging_type_id: String(matchedType?.id ?? ''),
                        contains_qty: String(index === 0 ? 1 : unit.contains_qty || 1),
                        barcode: isSynced ? currentScannedBarcode : unitBarcode,
                        use_scanned_barcode: Boolean(isSynced),
                    };
                }));
                return;
            }
        } catch {
            // fallback if api error
        }

        const defaults = defaultLevels(drug.unit || 'เม็ด', packagingTypes);
        setLevels(defaults.map((lvl, index, arr) => {
            const isSynced = currentScannedBarcode !== '' && index === arr.length - 1;
            return {
                ...lvl,
                barcode: isSynced ? currentScannedBarcode : '',
                use_scanned_barcode: isSynced,
            };
        }));
    };

    const resolveBarcode = async (scanned: string) => {
        setScanError('');
        setScanSuccessNote('');
        const trimmed = scanned.trim();
        setBarcode(trimmed);
        setScanCode(trimmed);
        try {
            const response = await axios.get(route('pharmacy.inventory.scan.resolve'), { params: { code: trimmed } });
            const found = response.data?.data;
            if (found?.item) {
                await chooseDrug(found.item);
                setScanSuccessNote(`พบบาร์โค้ดยา: ${found.item.name} (${found.item.unit || 'หน่วย'})`);
            } else {
                setScanSuccessNote(`สแกนรหัสใหม่: ${trimmed} — กรุณาเลือกยาด้านล่างเพื่อผูกบาร์โค้ดนี้กับตัวยาเมื่อบันทึก`);
            }
        } catch {
            setScanSuccessNote(`สแกนรหัสใหม่: ${trimmed} — กรุณาเลือกยาด้านล่างเพื่อผูกบาร์โค้ดนี้กับตัวยาเมื่อบันทึก`);
        }
    };

    useEffect(() => {
        if (initialBarcode) void resolveBarcode(initialBarcode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBarcode]);

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

    const updateLevel = (index: number, patch: Partial<ChainLevel>) => {
        setLevels((current) => current.map((level, i) => {
            if (i !== index) return level;
            const updated = { ...level, ...patch };
            if (patch.packaging_type_id !== undefined) {
                const type = packagingTypes.find((t) => String(t.id) === patch.packaging_type_id);
                if (type) {
                    updated.name = type.name;
                }
            }
            return updated;
        }));
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
        payload.packaging_chain = levels.map((lvl, index) => ({
            name: lvl.name,
            packaging_type_id: lvl.packaging_type_id ? Number(lvl.packaging_type_id) : null,
            contains_qty: index === 0 ? 1 : (Number(lvl.contains_qty) || 1),
            barcode: lvl.barcode || null,
        }));
        router.post(route('pharmacy.inventory.receive.store'), payload);
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'รับเข้ายา' },
        ])}>
            <Head title="รับเข้ายา" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />
                <form onSubmit={onSubmit} className={inventoryFormShell}>
                    <h1 className="text-xl font-bold text-foreground">รับเข้ายาเข้าคลัง</h1>
                    <p className="text-sm text-muted-foreground">
                        สแกนบาร์โค้ดหรือค้นหายา พร้อมระบุโครงสร้างบรรจุภัณฑ์ เช่น 1 ลัง = 20 กล่อง, 1 กล่อง = 10 แพ็ค, 1 แพ็ค = 10 เม็ด
                    </p>

                    <div className={inventoryScanBox}>
                        <Label className={inventoryScanLabel}>สแกนบาร์โค้ดกล่อง/แพ็ค/ขวด</Label>
                        <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">เปิดกล้องในหน้านี้ได้ทันที หรือยิงบาร์โค้ดจากเครื่องอ่าน</p>
                        <div className="mt-2">
                            <InlineBarcodeScanner
                                value={scanCode}
                                onChange={setScanCode}
                                onDetected={resolveBarcode}
                                error={scanError}
                            />
                        </div>
                        {scanSuccessNote && (
                            <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                                ✓ {scanSuccessNote}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className={inventoryFieldLabel}>ค้นหายาหรือเวชภัณฑ์จาก HOSxP</Label>
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่อยา, เวชภัณฑ์มิใช่ยา หรือ icode..." />
                        {hits.length > 0 && (
                            <div className="max-h-48 overflow-auto rounded-xl border border-border bg-background">
                                {hits.map((d) => (
                                    <button
                                        key={d.icode}
                                        type="button"
                                        className="block w-full border-b border-border px-3 py-2 text-left text-sm text-foreground hover:bg-violet-50 dark:hover:bg-violet-950/40"
                                        onClick={() => void chooseDrug(d)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium">{d.name}</span>
                                            {d.item_type === 'nondrug' ? (
                                                <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                                                    ค่าเวชภัณฑ์ที่มิใช่ยา
                                                </span>
                                            ) : (
                                                <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-300">
                                                    ยา
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">{d.icode} {d.strength ? `· ${d.strength}` : ''} {d.unit ? `· หน่วย: ${d.unit}` : ''}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selected && (
                            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-base">{selected.name}</span>
                                    {selected.item_type === 'nondrug' ? (
                                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                                            ค่าเวชภัณฑ์ที่มิใช่ยา
                                        </span>
                                    ) : (
                                        <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-300">
                                            ยา
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    <span>รหัส: <b className="text-foreground">{selected.icode}</b></span>
                                    {selected.strength && <span>ความแรง: <b className="text-foreground">{selected.strength}</b></span>}
                                    <span>หน่วยนับตัดจ่ายคนไข้ (HOSxP): <b className="text-violet-700 dark:text-violet-300">{selected.unit || 'หน่วย'}</b></span>
                                </div>
                            </div>
                        )}
                        <input type="hidden" name="icode" value={icode} required />
                        <input type="hidden" name="barcode" value={barcode} />
                    </div>

                    {/* ส่วนโครงสร้างบรรจุภัณฑ์และการแปลงหน่วย (ไม่มีช่องกรอกชื่อหน่วยเอง) */}
                    <section className={inventoryPackSection}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                                    <h2 className="text-lg font-bold text-violet-950 dark:text-violet-100">
                                        โครงสร้างบรรจุภัณฑ์และการแปลงหน่วย
                                    </h2>
                                </div>
                                <p className="text-xs text-violet-800 dark:text-violet-200">
                                    ระบุจำนวนบรรจุในแต่ละชั้น (เช่น 1 กล่อง มี 10 แพ็ค, 1 แพ็ค มี 10 เม็ด) โดยเลือกประเภทบรรจุภัณฑ์ ไม่ต้องพิมพ์ชื่อหน่วยเอง
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 border-violet-300 bg-white/80 hover:bg-violet-100 dark:bg-violet-900/40"
                                onClick={() => {
                                    const defaultNextType = packagingTypes.find((t) => ['carton', 'outer_box', 'box', 'dozen'].includes(t.code)) || packagingTypes[0];
                                    setLevels((current) => [
                                        ...current,
                                        {
                                            name: defaultNextType?.name || 'ระดับถัดไป',
                                            packaging_type_id: String(defaultNextType?.id ?? ''),
                                            contains_qty: '10',
                                            barcode: '',
                                        },
                                    ]);
                                }}
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" /> เพิ่มระดับชั้นบรรจุภัณฑ์
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {levels.map((level, index) => (
                                <div key={index} className={inventoryPackCard}>
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-900 dark:bg-violet-800 dark:text-violet-100">
                                                {index + 1}
                                            </span>
                                            <b className="text-sm text-violet-900 dark:text-violet-100">
                                                {index === 0 ? 'ระดับฐาน (ย่อยสุด)' : `ระดับที่ ${index + 1}: ${level.name || 'หน่วยบรรจุ'}`}
                                            </b>
                                            {index === 0 && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                                    หน่วยตัดจ่ายคนไข้ใน HOSxP
                                                </span>
                                            )}
                                        </div>
                                        {levels.length > 1 && index === levels.length - 1 && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                onClick={() => setLevels((current) => current.slice(0, -1))}
                                            >
                                                <Trash2 className="mr-1 h-3.5 w-3.5" /> ลบระดับนี้
                                            </Button>
                                        )}
                                    </div>

                                    {index === 0 ? (
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <div>
                                                <Label className="text-xs text-foreground">ประเภทบรรจุภัณฑ์ (หน่วยฐานย่อยสุด) *</Label>
                                                <select
                                                    value={level.packaging_type_id}
                                                    onChange={(e) => updateLevel(index, { packaging_type_id: e.target.value })}
                                                    className={`mt-1 ${inventorySelectClass}`}
                                                    required
                                                >
                                                    <option value="">-- เลือกประเภทบรรจุภัณฑ์ฐาน --</option>
                                                    {packagingTypes.map((type) => (
                                                        <option key={type.id} value={type.id}>{type.name}</option>
                                                    ))}
                                                </select>
                                                {selected?.unit && (
                                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                                        หน่วยจาก HOSxP: <span className="font-semibold text-violet-700 dark:text-violet-300">{selected.unit}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">คำอธิบายระดับฐาน</Label>
                                                <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-muted/60 px-3 text-xs text-muted-foreground">
                                                    1 {level.name || 'หน่วย'} (หน่วยย่อยสุดที่ใช้ตัดจ่ายคนไข้)
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <Label className="text-xs text-foreground">บาร์โค้ดหน่วยย่อยนี้ (ถ้ามี)</Label>
                                                    <label
                                                        title={currentScannedBarcode ? `ติ๊กเพื่อใช้บาร์โค้ดที่สแกน: ${currentScannedBarcode}` : 'สแกนบาร์โค้ดที่กล่องด้านบนเพื่อซิงค์'}
                                                        className="inline-flex items-center gap-1.5 cursor-pointer rounded-md border border-violet-200 bg-violet-50/80 px-2 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/60 transition select-none"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(level.use_scanned_barcode)}
                                                            onChange={(e) => toggleUseScannedBarcode(index, e.target.checked)}
                                                            className="h-3.5 w-3.5 rounded border-violet-400 text-violet-600 focus:ring-violet-500"
                                                        />
                                                        <span>ใช้อันเดียวกับบาร์โค้ดที่สแกน</span>
                                                    </label>
                                                </div>
                                                <Input
                                                    className="mt-1 font-mono text-xs"
                                                    value={level.barcode}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateLevel(index, {
                                                            barcode: val,
                                                            use_scanned_barcode: val !== '' && val === currentScannedBarcode,
                                                        });
                                                    }}
                                                    placeholder="ยิงหรือกรอกบาร์โค้ดย่อย เช่น บาร์โค้ดแผง/เม็ด"
                                                />
                                                {level.use_scanned_barcode && currentScannedBarcode && (
                                                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                                        <span>✓</span> ซิงค์บาร์โค้ดที่สแกน: <b className="font-mono">{currentScannedBarcode}</b>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <div>
                                                <Label className="text-xs text-foreground">ประเภทบรรจุภัณฑ์</Label>
                                                <select
                                                    value={level.packaging_type_id}
                                                    onChange={(e) => updateLevel(index, { packaging_type_id: e.target.value })}
                                                    className={`mt-1 ${inventorySelectClass}`}
                                                    required
                                                >
                                                    <option value="">-- เลือกประเภทบรรจุภัณฑ์ --</option>
                                                    {packagingTypes.map((type) => (
                                                        <option key={type.id} value={type.id}>{type.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-foreground">
                                                    1 {level.name || 'หน่วยนี้'} บรรจุกี่ {levels[index - 1]?.name || 'หน่วยย่อย'}?
                                                </Label>
                                                <div className="relative mt-1">
                                                    <Input
                                                        type="number"
                                                        min="0.0001"
                                                        step="any"
                                                        value={level.contains_qty}
                                                        onChange={(e) => updateLevel(index, { contains_qty: e.target.value })}
                                                        placeholder="เช่น 10"
                                                        required
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                        {levels[index - 1]?.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <Label className="text-xs text-foreground">บาร์โค้ดของ {level.name || 'หน่วยนี้'} (ถ้ามี)</Label>
                                                    <label
                                                        title={currentScannedBarcode ? `ติ๊กเพื่อใช้บาร์โค้ดที่สแกน: ${currentScannedBarcode}` : 'สแกนบาร์โค้ดที่กล่องด้านบนเพื่อซิงค์'}
                                                        className="inline-flex items-center gap-1.5 cursor-pointer rounded-md border border-violet-200 bg-violet-50/80 px-2 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/60 transition select-none"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(level.use_scanned_barcode)}
                                                            onChange={(e) => toggleUseScannedBarcode(index, e.target.checked)}
                                                            className="h-3.5 w-3.5 rounded border-violet-400 text-violet-600 focus:ring-violet-500"
                                                        />
                                                        <span>ใช้อันเดียวกับบาร์โค้ดที่สแกน</span>
                                                    </label>
                                                </div>
                                                <Input
                                                    className="mt-1 font-mono text-xs"
                                                    value={level.barcode}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateLevel(index, {
                                                            barcode: val,
                                                            use_scanned_barcode: val !== '' && val === currentScannedBarcode,
                                                        });
                                                    }}
                                                    placeholder={`ยิงหรือกรอกบาร์โค้ด${level.name || ''}`}
                                                />
                                                {level.use_scanned_barcode && currentScannedBarcode && (
                                                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                                        <span>✓</span> ซิงค์บาร์โค้ดที่สแกน: <b className="font-mono">{currentScannedBarcode}</b>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* กล่องสรุปการแปลงหน่วยและจำนวนรับเข้า */}
                        <div className={inventorySummaryBox}>
                            <div className="space-y-2">
                                <Label className={inventoryFieldLabel}>
                                    จำนวนที่รับเข้า ({outerName}) *
                                </Label>
                                <Input
                                    name="qty"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    placeholder="เช่น 5"
                                    required
                                />
                                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                                    บันทึกรับเข้าเป็นหน่วยนอกสุด: <b>{qty || 0} {outerName}</b>
                                </p>
                            </div>

                            <div className={inventorySummaryCard}>
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    สรุปการแปลงหน่วยเข้าคลัง
                                </div>
                                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                    {levels.slice(1).map((level, idx) => (
                                        <div key={idx}>
                                            • 1 {level.name || 'หน่วย'} = <b>{level.contains_qty}</b> {levels[idx]?.name || 'หน่วยย่อย'}
                                        </div>
                                    ))}
                                    <div className="text-foreground font-medium">
                                        • สัดส่วนรวม: 1 {outerName} = <b>{factorToBase.toLocaleString()}</b> {baseName}
                                    </div>
                                </div>
                                <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 p-2 text-sm font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                                    🟢 รับ {qty || 0} {outerName} = เข้าสต็อกจริง {stockQty.toLocaleString()} {baseName}
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>คลังรับเข้า *</Label>
                            <select name="location_id" className={inventorySelectClass} required defaultValue={warehouses[0]?.id}>
                                {locations.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>Lot No. *</Label>
                            <Input name="lot_no" required placeholder="เช่น LOT20260911" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>วันที่รับ *</Label>
                            <Input name="received_at" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>วันหมดอายุ</Label>
                            <Input name="expires_at" type="date" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>ผู้จำหน่าย</Label>
                            <Input name="supplier" placeholder="เช่น บ. อาร์เอ็กซ์ จำกัด" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>เลขที่ใบส่งของ</Label>
                            <Input name="invoice_no" placeholder="เช่น INV-69012" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>วันที่ใบส่งของ</Label>
                            <Input name="invoice_date" type="date" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>ราคาต่อหน่วยรับเข้า ({outerName})</Label>
                            <Input name="invoice_unit_price" type="number" step="0.0001" min="0" placeholder="เช่น 250.00" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>ราคารวมตามใบส่งของ (บาท)</Label>
                            <Input name="invoice_total_price" type="number" step="0.01" min="0" placeholder="เช่น 1250.00" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>ขั้นต่ำที่ต้องสั่งซื้อ (reorder - {baseName})</Label>
                            <Input name="reorder_level" type="number" step="0.01" min="0" placeholder="เช่น 50" />
                        </div>
                        <div className="space-y-2">
                            <Label className={inventoryFieldLabel}>เกณฑ์ขั้นต่ำ (min - {baseName})</Label>
                            <Input name="min_level" type="number" step="0.01" min="0" placeholder="เช่น 20" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className={inventoryFieldLabel}>หมายเหตุ</Label>
                        <Input name="notes" placeholder="เช่น ยารอบสั่งซื้อพิเศษประจำงวด" />
                    </div>
                    <Button type="submit" className="rounded-xl bg-violet-700 hover:bg-violet-800" disabled={!icode}>
                        บันทึกรับเข้าคลัง + สร้าง QR Lot
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
