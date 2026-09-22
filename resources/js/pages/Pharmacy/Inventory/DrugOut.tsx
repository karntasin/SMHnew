import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    FileText,
    History,
    Package,
    PackageMinus,
    RefreshCw,
    Search,
    ShieldAlert,
    Snowflake,
    Trash2,
    Undo2,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import InlineBarcodeScanner from '@/components/pharmacy/InlineBarcodeScanner';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';

type Location = {
    id: number;
    code: string;
    name: string;
    type: string;
};

type DrugUnit = {
    id: number;
    name: string;
    factor_to_base: number;
    is_base?: boolean;
};

type Drug = {
    id?: number;
    icode: string;
    name: string;
    item_type?: string;
    item_type_label?: string;
    income_code?: string;
    strength?: string | null;
    unit?: string | null;
    is_had?: boolean;
    is_cold_chain?: boolean;
    is_narcotic?: boolean;
    units?: DrugUnit[];
};

type ActiveLot = {
    id: number;
    lot_no: string;
    expires_at?: string;
    qty_remaining: number;
};

type StockInfo = {
    found: boolean;
    item?: Drug;
    qty_on_hand: number;
    min_level: number;
    reorder_level: number;
    active_lots: ActiveLot[];
};

type Movement = {
    id: number;
    type: 'dispense' | 'return';
    created_at: string;
    item_name: string;
    icode: string;
    qty: number;
    unit_name: string;
    transaction_qty: number;
    transaction_unit: string;
    from_location?: string;
    to_location?: string;
    lot_no?: string;
    reference_id?: string;
    reference_type?: string;
    user_name: string;
    note?: string;
};

type Props = {
    locations: Location[];
    selectedLocationId: number;
    recentMovements: Movement[];
    stats: {
        today_issued_qty: number;
        today_issued_count: number;
        today_returned_qty: number;
        today_returned_count: number;
    };
    initialBarcode?: string;
};

export default function DrugOut({
    locations,
    selectedLocationId: initialLocationId,
    recentMovements,
    stats,
    initialBarcode = '',
}: Props) {
    const pageProps = usePage().props as { flash?: { success?: string; error?: string }; errors?: Record<string, string> };
    const flash = pageProps.flash;
    const errors = pageProps.errors;

    const [activeTab, setActiveTab] = useState<'issue' | 'return' | 'history'>('issue');
    const [locationId, setLocationId] = useState<number>(initialLocationId);

    // Selected Drug & Stock info state
    const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
    const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
    const [isLoadingStock, setIsLoadingStock] = useState(false);

    // Search state
    const [searchQ, setSearchQ] = useState('');
    const [searchHits, setSearchHits] = useState<Drug[]>([]);
    const [barcode, setBarcode] = useState(initialBarcode);
    const [scanError, setScanError] = useState('');
    const [scanSuccessNote, setScanSuccessNote] = useState('');

    // Issue Form State
    const [issueQty, setIssueQty] = useState('1');
    const [issueUnitId, setIssueUnitId] = useState<string>('');
    const [issueReason, setIssueReason] = useState<string>('department');
    const [issueRecipient, setIssueRecipient] = useState('');
    const [issueRefId, setIssueRefId] = useState('');
    const [issueNote, setIssueNote] = useState('');
    const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

    // Return Form State
    const [returnQty, setReturnQty] = useState('1');
    const [returnUnitId, setReturnUnitId] = useState<string>('');
    const [returnReason, setReturnReason] = useState<string>('patient_return');
    const [returnSource, setReturnSource] = useState('');
    const [returnRefId, setReturnRefId] = useState('');
    const [returnExpiresAt, setReturnExpiresAt] = useState('');
    const [returnLotId, setReturnLotId] = useState('');
    const [returnNote, setReturnNote] = useState('');
    const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

    // Quick department chips
    const commonDepartments = ['ตึกผู้ป่วยใน (IPD)', 'ห้องฉุกเฉิน (ER)', 'ห้องผ่าตัด (OR)', 'คลินิก ARI', 'ห้องคลอด (LR)', 'กลุ่มงานทันตกรรม', 'แผนกไตเทียม'];

    // Load Stock Info for selected drug in location
    const loadStockInfo = async (drugIcode: string, locId: number, preferredUnitId?: number) => {
        setIsLoadingStock(true);
        try {
            const res = await axios.get(route('pharmacy.inventory.drug-out.stock-info'), {
                params: { icode: drugIcode, location_id: locId },
            });
            if (res.data?.found) {
                setStockInfo(res.data);
                setSelectedDrug(res.data.item);

                // Auto-select unit
                const units = res.data.item.units || [];
                if (preferredUnitId && units.some((u: DrugUnit) => u.id === preferredUnitId)) {
                    setIssueUnitId(String(preferredUnitId));
                    setReturnUnitId(String(preferredUnitId));
                } else if (units.length > 0) {
                    const baseUnit = units.find((u: DrugUnit) => u.is_base || Number(u.factor_to_base) === 1);
                    const defaultUnit = baseUnit || units[0];
                    setIssueUnitId(String(defaultUnit.id));
                    setReturnUnitId(String(defaultUnit.id));
                }
            } else {
                setStockInfo(null);
            }
        } catch (e) {
            console.error('Failed to load stock info', e);
        } finally {
            setIsLoadingStock(false);
        }
    };

    // Trigger stock reload if location changes
    useEffect(() => {
        if (selectedDrug) {
            loadStockInfo(selectedDrug.icode, locationId);
        }
    }, [locationId]);

    // Autocomplete drug search
    useEffect(() => {
        if (searchQ.trim().length < 2) {
            setSearchHits([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(route('pharmacy.inventory.drugs.search'), { params: { q: searchQ } });
                setSearchHits(res.data || []);
            } catch (e) {
                console.error(e);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [searchQ]);

    // Handle Drug Selection from Search List
    const handleSelectDrug = (drug: Drug) => {
        setSelectedDrug(drug);
        setSearchQ('');
        setSearchHits([]);
        setScanError('');
        loadStockInfo(drug.icode, locationId);
    };

    // Handle Barcode Scanned
    const handleBarcodeDetected = async (code: string) => {
        setScanError('');
        setScanSuccessNote('');
        try {
            const res = await axios.get(route('pharmacy.inventory.scan.resolve'), { params: { code } });
            if (res.data?.data) {
                const payload = res.data.data;
                const icode = payload.item?.icode || payload.icode;
                if (icode) {
                    await loadStockInfo(icode, locationId, payload.unit?.id);
                    setScanSuccessNote(`สแกนพบ: ${payload.item?.name || icode} (${code})`);
                }
            } else {
                setScanError(`ไม่พบข้อมูลบาร์โค้ด [${code}] ในระบบ`);
            }
        } catch (e: any) {
            setScanError(`ไม่พบบาร์โค้ด [${code}] ในฐานข้อมูล หรือยังไม่ได้ผูกกับรายการยา`);
        }
    };

    // Calculate total base quantity for Issue
    const selectedIssueUnit = useMemo(() => {
        return stockInfo?.item?.units?.find((u) => String(u.id) === String(issueUnitId));
    }, [stockInfo, issueUnitId]);

    const issueBaseQty = useMemo(() => {
        const q = parseFloat(issueQty) || 0;
        const factor = selectedIssueUnit ? parseFloat(String(selectedIssueUnit.factor_to_base)) || 1 : 1;
        return Math.round(q * factor * 100) / 100;
    }, [issueQty, selectedIssueUnit]);

    // Calculate total base quantity for Return
    const selectedReturnUnit = useMemo(() => {
        return stockInfo?.item?.units?.find((u) => String(u.id) === String(returnUnitId));
    }, [stockInfo, returnUnitId]);

    const returnBaseQty = useMemo(() => {
        const q = parseFloat(returnQty) || 0;
        const factor = selectedReturnUnit ? parseFloat(String(selectedReturnUnit.factor_to_base)) || 1 : 1;
        return Math.round(q * factor * 100) / 100;
    }, [returnQty, selectedReturnUnit]);

    // Submit Issue Out
    const handleSubmitIssue = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedDrug) return;
        setIsSubmittingIssue(true);

        router.post(
            route('pharmacy.inventory.drug-out.issue'),
            {
                location_id: locationId,
                icode: selectedDrug.icode,
                qty: parseFloat(issueQty),
                unit_id: issueUnitId || null,
                reason: issueReason,
                recipient: issueRecipient,
                reference_id: issueRefId,
                note: issueNote,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmittingIssue(false);
                    setIssueQty('1');
                    setIssueNote('');
                    setIssueRefId('');
                    loadStockInfo(selectedDrug.icode, locationId);
                },
                onError: () => {
                    setIsSubmittingIssue(false);
                },
            },
        );
    };

    // Submit Return In
    const handleSubmitReturn = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedDrug) return;
        setIsSubmittingReturn(true);

        router.post(
            route('pharmacy.inventory.drug-out.return'),
            {
                location_id: locationId,
                icode: selectedDrug.icode,
                qty: parseFloat(returnQty),
                unit_id: returnUnitId || null,
                reason: returnReason,
                source: returnSource,
                reference_id: returnRefId,
                expires_at: returnExpiresAt || null,
                lot_id: returnLotId || null,
                note: returnNote,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmittingReturn(false);
                    setReturnQty('1');
                    setReturnNote('');
                    setReturnRefId('');
                    setReturnExpiresAt('');
                    loadStockInfo(selectedDrug.icode, locationId);
                },
                onError: () => {
                    setIsSubmittingReturn(false);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([
            { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
            { title: 'ยาออกหน่วย' },
        ])}>
            <Head title="ระบบยาออกหน่วย (ตัดยาออกหน่วย / คืนยาเข้าห้องยา)" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />

                {/* Header Card */}
                <div className="rounded-[2rem] border border-rose-100 bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 p-6 text-white shadow-xl md:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 backdrop-blur-xs">
                                <PackageMinus className="h-3.5 w-3.5" />
                                Drug Issue to Ward/Unit & Return
                            </div>
                            <h1 className="text-3xl font-black tracking-tight">ระบบยาออกหน่วย</h1>
                            <p className="text-sm text-rose-100/80 max-w-2xl">
                                ระบบตัดยาออกจากห้องยาให้หน่วยงาน/หอผู้ป่วย (เบิกให้วอร์ด, จ่ายผู้ป่วย, ตัดยาชำรุด/หมดอายุ/ส่งทำลาย) และรับคืนยาเข้าสู่สต็อกห้องยา
                            </p>
                        </div>

                        {/* Location Selector */}
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-md">
                            <label className="text-xs font-medium text-rose-200 block mb-1">
                                จุดห้องยาที่ทำรายการ:
                            </label>
                            <select
                                value={locationId}
                                onChange={(e) => setLocationId(Number(e.target.value))}
                                className="rounded-xl border border-white/20 bg-slate-900/80 px-3 py-1.5 text-sm font-semibold text-white focus:ring-2 focus:ring-rose-400 focus:outline-hidden"
                            >
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">
                                        {loc.name} ({loc.type === 'warehouse' ? 'คลังยา' : 'ห้องยา'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-white/10">
                        <div className="rounded-xl bg-white/5 p-3">
                            <div className="text-xs text-rose-200/80">ตัดยาออกหน่วยวันนี้ (จำนวน)</div>
                            <div className="text-xl font-bold text-rose-300 mt-0.5">
                                {stats.today_issued_qty.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-white/60">{stats.today_issued_count} รายการ</div>
                        </div>

                        <div className="rounded-xl bg-white/5 p-3">
                            <div className="text-xs text-emerald-200/80">รับคืนยาวันนี้ (จำนวน)</div>
                            <div className="text-xl font-bold text-emerald-300 mt-0.5">
                                {stats.today_returned_qty.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-white/60">{stats.today_returned_count} รายการ</div>
                        </div>

                        <div className="rounded-xl bg-white/5 p-3">
                            <div className="text-xs text-slate-300">สุทธิเคลื่อนไหววันนี้</div>
                            <div className="text-xl font-bold text-white mt-0.5">
                                {(stats.today_issued_qty - stats.today_returned_qty).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-white/60">ยอดตัดจ่ายสุทธิ</div>
                        </div>

                        <div className="rounded-xl bg-white/5 p-3">
                            <div className="text-xs text-slate-300">โรงพยาบาล</div>
                            <div className="text-sm font-semibold text-white mt-1 truncate">
                                โรงพยาบาลค่ายสุรสิงหนาท
                            </div>
                            <div className="text-[11px] text-white/60">กลุ่มงานเภสัชกรรม</div>
                        </div>
                    </div>
                </div>

                {/* Alerts / Feedback */}
                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 font-medium">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {(flash?.error || errors?.error) && (
                    <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 font-medium">
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        <span>{flash?.error || errors?.error}</span>
                    </div>
                )}

                {/* Main Tabs */}
                <div className="flex border-b border-border space-x-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('issue')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'issue'
                                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <PackageMinus className="h-4 w-4" />
                        1. ตัดยาออกหน่วย (Issue to Unit)
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('return')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'return'
                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Undo2 className="h-4 w-4" />
                        2. คืนยาให้ห้องยา (Return In)
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'history'
                                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <History className="h-4 w-4" />
                        3. ประวัติยาออกหน่วย & คืนยา ({recentMovements.length})
                    </button>
                </div>

                {/* TAB 1 & 2 CONTENT: SHARED DRUG PICKER + TAB ACTION FORM */}
                {activeTab !== 'history' && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                        {/* LEFT COLUMN: Drug Search & Operation Form */}
                        <div className="space-y-6">
                            {/* Card: Drug Scanner & Search */}
                            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Search className="h-4 w-4 text-violet-600" />
                                        ค้นหายา หรือ สแกนบาร์โค้ด / QR Code
                                    </h2>
                                    {selectedDrug && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                                            onClick={() => {
                                                setSelectedDrug(null);
                                                setStockInfo(null);
                                                setSearchQ('');
                                            }}
                                        >
                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                            ล้างรายการยาที่เลือก
                                        </Button>
                                    )}
                                </div>

                                {/* Barcode Scanner Input */}
                                <InlineBarcodeScanner
                                    value={barcode}
                                    onChange={setBarcode}
                                    onDetected={handleBarcodeDetected}
                                    error={scanError}
                                />

                                {scanSuccessNote && (
                                    <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200">
                                        ✓ {scanSuccessNote}
                                    </div>
                                )}

                                {/* Text Search Input */}
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={searchQ}
                                            onChange={(e) => setSearchQ(e.target.value)}
                                            placeholder="พิมพ์ค้นหาด้วยชื่อยา, เวชภัณฑ์มิใช่ยา, รหัส icode..."
                                            className="pl-10 rounded-xl"
                                        />
                                    </div>

                                    {/* Dropdown Hits */}
                                    {searchHits.length > 0 && (
                                        <div className="absolute z-20 mt-1 w-full rounded-2xl border border-border bg-popover p-1 shadow-lg max-h-64 overflow-y-auto">
                                            {searchHits.map((d) => (
                                                <button
                                                    key={d.icode}
                                                    type="button"
                                                    onClick={() => handleSelectDrug(d)}
                                                    className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{d.name}</span>
                                                            {d.item_type === 'nondrug' ? (
                                                                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                                                                    ค่าเวชภัณฑ์ที่มิใช่ยา
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-300">
                                                                    ยา
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            {d.icode} · {d.strength || ''} {d.unit ? `(${d.unit})` : ''}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                                        เลือก
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card: Selected Drug Details & Active Lots */}
                            {selectedDrug ? (
                                <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
                                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                                    {selectedDrug.icode}
                                                </span>
                                                <h2 className="text-xl font-black text-foreground">
                                                    {selectedDrug.name}
                                                </h2>
                                                {selectedDrug.item_type === 'nondrug' ? (
                                                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                                                        ค่าเวชภัณฑ์ที่มิใช่ยา
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-300">
                                                        ยา
                                                    </span>
                                                )}
                                                {selectedDrug.strength && (
                                                    <span className="text-sm text-muted-foreground">· {selectedDrug.strength}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                {selectedDrug.is_had && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                                        <ShieldAlert className="h-3 w-3" /> HAD
                                                    </span>
                                                )}
                                                {selectedDrug.is_cold_chain && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">
                                                        <Snowflake className="h-3 w-3" /> Cold Chain
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    หน่วยฐาน: <b className="text-foreground">{selectedDrug.unit || 'หน่วย'}</b>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stock On-hand Badge */}
                                        <div className="rounded-2xl border border-border bg-muted/40 p-3 text-right">
                                            <div className="text-xs text-muted-foreground">คงเหลือในห้องยานี้</div>
                                            <div className={`text-2xl font-black ${
                                                (stockInfo?.qty_on_hand ?? 0) > 0 ? 'text-foreground' : 'text-rose-600'
                                            }`}>
                                                {stockInfo?.qty_on_hand?.toLocaleString() ?? 0}{' '}
                                                <span className="text-sm font-normal text-muted-foreground">
                                                    {selectedDrug.unit || 'หน่วย'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lots Table in this location */}
                                    {stockInfo?.active_lots && stockInfo.active_lots.length > 0 ? (
                                        <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 space-y-2">
                                            <div className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                                                <span>Lot ที่เปิดใช้อยู่ในห้องยานี้ (ตัดตามลำดับ FEFO):</span>
                                                <span>{stockInfo.active_lots.length} Lot</span>
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {stockInfo.active_lots.map((lot) => (
                                                    <div
                                                        key={lot.id}
                                                        className="rounded-xl border border-border bg-background p-2.5 text-xs flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <div className="font-semibold font-mono">Lot: {lot.lot_no}</div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                หมดอายุ: <span className="font-semibold text-foreground">{lot.expires_at || '—'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="font-mono font-bold text-foreground">
                                                            {lot.qty_remaining.toLocaleString()} {selectedDrug.unit}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
                                            ⚠️ ไม่พบ Lot ยาคงเหลือในห้องยานี้
                                        </div>
                                    )}

                                    {/* TAB 1: ISSUE OUT FORM */}
                                    {activeTab === 'issue' && (
                                        <form onSubmit={handleSubmitIssue} className="pt-2 space-y-4">
                                            <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4 space-y-4 dark:border-rose-950 dark:bg-rose-950/20">
                                                <div className="text-sm font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                    ระบุข้อมูลการตัดยาออกหน่วย
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {/* Qty Input */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">จำนวนที่ต้องการตัด *</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            min="0.01"
                                                            value={issueQty}
                                                            onChange={(e) => setIssueQty(e.target.value)}
                                                            className="rounded-xl bg-background font-bold text-base"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Unit Picker */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">หน่วยบรรจุภัณฑ์</Label>
                                                        <select
                                                            value={issueUnitId}
                                                            onChange={(e) => setIssueUnitId(e.target.value)}
                                                            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                                                        >
                                                            {(stockInfo?.item?.units || []).map((u) => (
                                                                <option key={u.id} value={u.id}>
                                                                    {u.name} {Number(u.factor_to_base) > 1 ? `(× ${u.factor_to_base} ${selectedDrug.unit})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Calculated Base Quantity Note */}
                                                {selectedIssueUnit && Number(selectedIssueUnit.factor_to_base) > 1 && (
                                                    <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                                                        เทียบเท่าหน่วยฐาน: <b>{issueBaseQty.toLocaleString()} {selectedDrug.unit}</b>
                                                    </div>
                                                )}

                                                {/* Reason Picker */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold">สาเหตุ / วัตถุประสงค์การตัดยา *</Label>
                                                    <select
                                                        value={issueReason}
                                                        onChange={(e) => setIssueReason(e.target.value)}
                                                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                                                    >
                                                        <option value="department">เบิกจ่ายให้หน่วยงาน / หอผู้ป่วย (Ward / Clinic / ER)</option>
                                                        <option value="patient">จ่ายยาให้ผู้ป่วย (กรณีนอกระบบ / ใบสั่งพิเศษ)</option>
                                                        <option value="damaged">ตัดยาชำรุด / แตกหัก / เสื่อมสภาพ</option>
                                                        <option value="expired">ตัดยาหมดอายุ / นำส่งทำลาย</option>
                                                        <option value="borrow">ยืมระหว่างโรงพยาบาล / หน่วยงานภายนอก</option>
                                                        <option value="other">ตัดยาออกกรณีอื่นๆ (ระบุในหมายเหตุ)</option>
                                                    </select>
                                                </div>

                                                {/* Recipient / Department */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold">หน่วยงาน / แผนก / ผู้รับยา</Label>
                                                    <Input
                                                        value={issueRecipient}
                                                        onChange={(e) => setIssueRecipient(e.target.value)}
                                                        placeholder="เช่น ตึกผู้ป่วยใน IPD, ห้องฉุกเฉิน ER, ห้องผ่าตัด, ชื่อผู้ป่วย..."
                                                        className="rounded-xl bg-background"
                                                    />
                                                    {/* Quick Chips */}
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {commonDepartments.map((dept) => (
                                                            <button
                                                                key={dept}
                                                                type="button"
                                                                onClick={() => setIssueRecipient(dept)}
                                                                className="rounded-lg border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                                                            >
                                                                + {dept}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {/* Ref No */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">เลขที่ใบเบิก / เลขที่เอกสารอ้างอิง</Label>
                                                        <Input
                                                            value={issueRefId}
                                                            onChange={(e) => setIssueRefId(e.target.value)}
                                                            placeholder="เช่น REQ-6709-012"
                                                            className="rounded-xl bg-background"
                                                        />
                                                    </div>

                                                    {/* Note */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">หมายเหตุเพิ่มเติม</Label>
                                                        <Input
                                                            value={issueNote}
                                                            onChange={(e) => setIssueNote(e.target.value)}
                                                            placeholder="บันทึกข้อความหรือสาเหตุเพิ่มเติม..."
                                                            className="rounded-xl bg-background"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Submit Button */}
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmittingIssue || (stockInfo?.qty_on_hand ?? 0) < issueBaseQty}
                                                    className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold h-11"
                                                >
                                                    {isSubmittingIssue ? (
                                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <PackageMinus className="mr-2 h-4 w-4" />
                                                    )}
                                                    ยืนยันตัดยาออกหน่วย ({issueBaseQty.toLocaleString()} {selectedDrug.unit})
                                                </Button>

                                                {(stockInfo?.qty_on_hand ?? 0) < issueBaseQty && (
                                                    <p className="text-xs text-rose-600 text-center font-semibold">
                                                        ⚠️ สต็อกคงเหลือในห้องยานี้ไม่เพียงพอสำหรับการตัดยา
                                                    </p>
                                                )}
                                            </div>
                                        </form>
                                    )}

                                    {/* TAB 2: RETURN IN FORM */}
                                    {activeTab === 'return' && (
                                        <form onSubmit={handleSubmitReturn} className="pt-2 space-y-4">
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                                                <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                                    <ArrowDownLeft className="h-4 w-4" />
                                                    ระบุข้อมูลการรับคืนยาเข้าสู่ห้องยา
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {/* Qty Input */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">จำนวนที่รับคืน *</Label>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            min="0.01"
                                                            value={returnQty}
                                                            onChange={(e) => setReturnQty(e.target.value)}
                                                            className="rounded-xl bg-background font-bold text-base"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Unit Picker */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">หน่วยบรรจุภัณฑ์</Label>
                                                        <select
                                                            value={returnUnitId}
                                                            onChange={(e) => setReturnUnitId(e.target.value)}
                                                            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                                                        >
                                                            {(stockInfo?.item?.units || []).map((u) => (
                                                                <option key={u.id} value={u.id}>
                                                                    {u.name} {Number(u.factor_to_base) > 1 ? `(× ${u.factor_to_base} ${selectedDrug.unit})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Calculated Base Quantity Note */}
                                                {selectedReturnUnit && Number(selectedReturnUnit.factor_to_base) > 1 && (
                                                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                                                        เทียบเท่าหน่วยฐาน: <b>{returnBaseQty.toLocaleString()} {selectedDrug.unit}</b>
                                                    </div>
                                                )}

                                                {/* Return Reason */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold">สาเหตุการรับคืนยา *</Label>
                                                    <select
                                                        value={returnReason}
                                                        onChange={(e) => setReturnReason(e.target.value)}
                                                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                                                    >
                                                        <option value="patient_return">ผู้ป่วยนำยามาคืน (หยุดยา / ปรับขนาดยา / ผู้ป่วย Admit)</option>
                                                        <option value="department_return">หน่วยงาน / หอผู้ป่วย ส่งคืนยาเหลือใช้</option>
                                                        <option value="order_cancel">ยกเลิกใบสั่งยา / สั่งผิด</option>
                                                        <option value="other_return">รับคืนยากรณีอื่นๆ</option>
                                                    </select>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {/* Source / Patient HN */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">รับคืนจาก (HN ผู้ป่วย หรือ ชื่อตึก/วอร์ด)</Label>
                                                        <Input
                                                            value={returnSource}
                                                            onChange={(e) => setReturnSource(e.target.value)}
                                                            placeholder="เช่น HN 1234567, วอร์ดชาย, ER..."
                                                            className="rounded-xl bg-background"
                                                        />
                                                    </div>

                                                    {/* Expiry Date */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">วันหมดอายุของยาที่รับคืน</Label>
                                                        <Input
                                                            type="date"
                                                            value={returnExpiresAt}
                                                            onChange={(e) => setReturnExpiresAt(e.target.value)}
                                                            className="rounded-xl bg-background"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {/* Ref Slip */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">เลขที่ใบคืนยา / เลขใบสั่งเดิม</Label>
                                                        <Input
                                                            value={returnRefId}
                                                            onChange={(e) => setReturnRefId(e.target.value)}
                                                            placeholder="เช่น RET-6709-001"
                                                            className="rounded-xl bg-background"
                                                        />
                                                    </div>

                                                    {/* Lot Assignment Picker (Optional) */}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-bold">นำเข้าสมทบใน Lot เดิม (ถ้ามี)</Label>
                                                        <select
                                                            value={returnLotId}
                                                            onChange={(e) => setReturnLotId(e.target.value)}
                                                            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                                                        >
                                                            <option value="">สร้าง Lot รับคืนใหม่ หรือเลือก Lot อัตโนมัติ</option>
                                                            {(stockInfo?.active_lots || []).map((l) => (
                                                                <option key={l.id} value={l.id}>
                                                                    Lot: {l.lot_no} (EXP: {l.expires_at || '—'}, เหลือ {l.qty_remaining})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Note */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-bold">หมายเหตุการรับคืน</Label>
                                                    <Input
                                                        value={returnNote}
                                                        onChange={(e) => setReturnNote(e.target.value)}
                                                        placeholder="บันทึกสภาพยา หรือสาเหตุการคืน..."
                                                        className="rounded-xl bg-background"
                                                    />
                                                </div>

                                                {/* Submit Button */}
                                                <Button
                                                    type="submit"
                                                    disabled={isSubmittingReturn}
                                                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                                                >
                                                    {isSubmittingReturn ? (
                                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Undo2 className="mr-2 h-4 w-4" />
                                                    )}
                                                    ยืนยันรับคืนยาเข้าห้องยา (+{returnBaseQty.toLocaleString()} {selectedDrug.unit})
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                                    <Package className="mx-auto h-12 w-12 opacity-30 mb-3" />
                                    <h3 className="text-base font-semibold text-foreground">ยังไม่ได้เลือกรายการยา</h3>
                                    <p className="mt-1 text-sm max-w-md mx-auto">
                                        กรุณาสแกนบาร์โค้ด / QR Code หรือพิมพ์ค้นหายาด้านบนเพื่อดำเนินการตัดยาออกหรือรับคืนยา
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Quick Guidelines & Recent Mini-Feed */}
                        <div className="space-y-4">
                            {/* Guide Card */}
                            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-violet-600" />
                                    แนวทางมาตรฐานระบบยาออก
                                </h3>
                                <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-rose-500 font-bold">•</span>
                                        <span><b>การตัดยาออก:</b> ระบบจะตัดทอนสต็อกตามหลักการ FEFO (Lot ใกล้หมดอายุถูกตัดออกก่อน)</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-emerald-500 font-bold">•</span>
                                        <span><b>การรับคืนยา:</b> ตรวจสอบสภาพยาและวันหมดอายุก่อนรับคืนเข้าสต็อกห้องยาเสมอ</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-blue-500 font-bold">•</span>
                                        <span><b>Stock Card:</b> ทุกรายการจะวิ่งตรงเข้าสู่บัตรคุมยาและประวัติเคลื่อนไหวทันที</span>
                                    </li>
                                </ul>
                                <div className="pt-2 border-t border-border">
                                    <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs">
                                        <Link href={route('pharmacy.inventory.stock-card')}>
                                            เปิดดูบัตรคุมยา (Stock Card) →
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            {/* Mini Recent Transactions */}
                            <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-foreground">รายการล่าสุดในห้องยานี้</h3>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('history')}
                                        className="text-xs text-violet-600 hover:underline"
                                    >
                                        ดูทั้งหมด
                                    </button>
                                </div>
                                <div className="space-y-2.5">
                                    {recentMovements.slice(0, 5).map((m) => (
                                        <div
                                            key={m.id}
                                            className="rounded-2xl border border-border/70 p-2.5 text-xs space-y-1 bg-muted/20"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                        m.type === 'dispense'
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                    }`}
                                                >
                                                    {m.type === 'dispense' ? '📤 ตัดออก' : '📥 รับคืน'}
                                                </span>
                                                <span className="text-muted-foreground font-mono text-[11px]">
                                                    {m.created_at}
                                                </span>
                                            </div>
                                            <div className="font-semibold text-foreground truncate">
                                                {m.item_name}
                                            </div>
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>{m.note || '—'}</span>
                                                <span className="font-bold text-foreground">
                                                    {m.type === 'dispense' ? `-${m.qty}` : `+${m.qty}`} {m.unit_name}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {recentMovements.length === 0 && (
                                        <div className="text-xs text-muted-foreground text-center py-4">
                                            ยังไม่มีรายการเคลื่อนไหวในห้องยานี้
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: FULL HISTORY TABLE */}
                {activeTab === 'history' && (
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    ประวัติรายการยาออกหน่วยและรับคืนยา
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    แสดงประวัติความเคลื่อนไหวทั้งหมดที่เกิดขึ้นในห้องยา
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button asChild variant="outline" className="rounded-xl text-xs">
                                    <Link href={route('pharmacy.inventory.movements')}>
                                        เปิดดูประวัติเคลื่อนไหวรวมทั้งโรงพยาบาล →
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-border">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3">วัน-เวลา</th>
                                        <th className="px-4 py-3">ประเภท</th>
                                        <th className="px-4 py-3">รายการยา</th>
                                        <th className="px-4 py-3 text-right">จำนวน</th>
                                        <th className="px-4 py-3">ห้องยา / สถานที่</th>
                                        <th className="px-4 py-3">เลขที่เอกสาร / อ้างอิง</th>
                                        <th className="px-4 py-3">หมายเหตุ / เหตุผล</th>
                                        <th className="px-4 py-3">ผู้บันทึก</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recentMovements.map((m) => (
                                        <tr key={m.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                                                {m.created_at}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                        m.type === 'dispense'
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                    }`}
                                                >
                                                    {m.type === 'dispense' ? '📤 ตัดยาออกหน่วย' : '📥 รับคืนยา'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-semibold text-foreground">{m.item_name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {m.icode} {m.lot_no ? `· Lot: ${m.lot_no}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-bold whitespace-nowrap">
                                                <span className={m.type === 'dispense' ? 'text-rose-600' : 'text-emerald-600'}>
                                                    {m.type === 'dispense' ? `-${m.qty.toLocaleString()}` : `+${m.qty.toLocaleString()}`}
                                                </span>{' '}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    {m.unit_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                {m.from_location || m.to_location || '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-mono">
                                                {m.reference_id ? `#${m.reference_id}` : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">
                                                {m.note || '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {m.user_name}
                                            </td>
                                        </tr>
                                    ))}
                                    {recentMovements.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                                                ยังไม่มีประวัติการตัดยาออกหรือรับคืนยาในระบบ
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
