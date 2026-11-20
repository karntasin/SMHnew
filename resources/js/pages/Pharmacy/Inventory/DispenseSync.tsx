import { FormEvent, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import {
    AlertCircle,
    ArrowDownLeft,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    FileSpreadsheet,
    Filter,
    HelpCircle,
    History,
    Layers,
    ListFilter,
    Package,
    PackageCheck,
    Play,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldAlert,
    TriangleAlert,
    Undo2,
    User,
    X,
    XCircle,
} from 'lucide-react';
import { warehouseActive, warehouseHome, warehouseSupply, wh } from '@/pages/Pharmacy/inventoryCatalog';
import axios from 'axios';

type SyncRecord = {
    id: number;
    hosxp_key: string;
    hn: string;
    vn: string;
    an?: string | null;
    patient_name?: string | null;
    icode: string;
    vstdate: string;
    qty: number;
    status: 'deducted' | 'insufficient' | 'failed' | 'skipped' | 'cancelled' | 'reversed';
    movement_id?: number | null;
    message?: string | null;
    cancel_reason?: string | null;
    cancelled_at?: string | null;
    cancelled_by_user?: { id: number; name: string } | null;
    fulfilled_at?: string | null;
    fulfilled_by_user?: { id: number; name: string } | null;
    reversed_at?: string | null;
    reversed_by_user?: { id: number; name: string } | null;
    created_at: string;
    item?: {
        name: string;
        strength?: string;
        unit?: string;
        item_type?: 'drug' | 'nondrug' | string;
        item_type_label?: string;
    } | null;
};

type OwedItem = {
    id: number;
    hosxp_key: string;
    hn: string;
    vn: string;
    an?: string | null;
    visit_type: 'OPD' | 'IPD';
    patient_name: string;
    icode: string;
    item_name: string;
    strength?: string | null;
    unit: string;
    qty: number;
    vstdate: string;
    status: string;
    current_stock: number;
    can_fulfill: boolean;
    message?: string | null;
    created_at?: string | null;
};

type PreviewItem = {
    key: string;
    sync_id?: number | null;
    hn: string;
    vn: string;
    an?: string;
    visit_type: 'OPD' | 'IPD';
    patient_name: string;
    vstdate: string;
    icode: string;
    item_name: string;
    strength?: string | null;
    unit: string;
    qty: number;
    current_stock: number;
    simulated_remaining: number;
    preview_status: 'already_deducted' | 'ready_to_deduct' | 'insufficient' | 'cancelled' | 'reversed';
    deficit: number;
};

type GroupedPreviewItem = {
    icode: string;
    item_name: string;
    strength?: string | null;
    unit: string;
    current_stock: number;
    total_ordered: number;
    can_deduct_qty: number;
    deficit_qty: number;
    status: 'full' | 'partial' | 'insufficient';
    orders_count: number;
    orders: Array<{
        key: string;
        hn: string;
        vn: string;
        an?: string;
        visit_type: 'OPD' | 'IPD';
        patient_name: string;
        qty: number;
        vstdate: string;
        preview_status: string;
    }>;
};

type Pagination = {
    data: SyncRecord[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url?: string | null;
    next_page_url?: string | null;
};

export default function DispenseSync({
    syncs,
    stats,
    owedList = [],
    pharmacyLocation,
    filters,
}: {
    syncs: Pagination;
    stats: {
        total: number;
        synced: number;
        insufficient: number;
        cancelled: number;
        reversed: number;
        failed: number;
    };
    owedList?: OwedItem[];
    pharmacyLocation?: { id: number; name: string } | null;
    filters: { start_date: string; end_date: string; status: string; tab?: string };
}) {
    const [activeTab, setActiveTab] = useState<'preview' | 'owed' | 'history'>(
        (filters.tab as 'preview' | 'owed' | 'history') || 'preview',
    );
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [status, setStatus] = useState(filters.status || 'all');

    // Preview state
    const [previewStartDate, setPreviewStartDate] = useState(
        filters.start_date || new Date().toISOString().split('T')[0],
    );
    const [previewEndDate, setPreviewEndDate] = useState(
        filters.end_date || new Date().toISOString().split('T')[0],
    );
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewMode, setPreviewMode] = useState<'grouped' | 'detailed'>('grouped');
    const [expandedDrug, setExpandedDrug] = useState<string | null>(null);

    const [previewResult, setPreviewResult] = useState<{
        stats: {
            total_orders: number;
            total_drugs?: number;
            already_deducted: number;
            ready_to_deduct: number;
            insufficient: number;
            cancelled: number;
            reversed: number;
        };
        items: PreviewItem[];
        grouped_items?: GroupedPreviewItem[];
    } | null>(null);
    const [isCommitting, setIsCommitting] = useState(false);

    // Modal state for cancel & rollback
    const [cancelModalItem, setCancelModalItem] = useState<OwedItem | null>(null);
    const [cancelReason, setCancelReason] = useState('ผู้ป่วยไม่มารับยา / ยกเลิกคำสั่ง');
    const [isCancelling, setIsCancelling] = useState(false);

    const [rollbackModalItem, setRollbackModalItem] = useState<SyncRecord | null>(null);
    const [rollbackReason, setRollbackReason] = useState('ตัดจ่ายผิดพลาด / ขอย้อนคืนสต็อก');
    const [isRollingBack, setIsRollingBack] = useState(false);

    const [showRollbackAllModal, setShowRollbackAllModal] = useState(false);
    const [isRollingBackAll, setIsRollingBackAll] = useState(false);

    const [isFulfillingAll, setIsFulfillingAll] = useState(false);
    const [fulfillingId, setFulfillingId] = useState<number | null>(null);

    // Owed tab search & filter state
    const [owedSearch, setOwedSearch] = useState('');
    const [owedStockFilter, setOwedStockFilter] = useState<'all' | 'ready' | 'waiting'>('all');
    const [owedTypeFilter, setOwedTypeFilter] = useState<'all' | 'OPD' | 'IPD'>('all');

    const filteredOwedList = owedList.filter((item) => {
        if (owedStockFilter === 'ready' && !item.can_fulfill) return false;
        if (owedStockFilter === 'waiting' && item.can_fulfill) return false;
        if (owedTypeFilter !== 'all' && item.visit_type !== owedTypeFilter) return false;
        if (owedSearch.trim() !== '') {
            const q = owedSearch.toLowerCase().trim();
            const matchName = (item.patient_name || '').toLowerCase().includes(q);
            const matchHn = (item.hn || '').toLowerCase().includes(q);
            const matchVn = (item.vn || '').toLowerCase().includes(q);
            const matchDrug = (item.item_name || '').toLowerCase().includes(q);
            const matchIcode = (item.icode || '').toLowerCase().includes(q);
            if (!matchName && !matchHn && !matchVn && !matchDrug && !matchIcode) return false;
        }
        return true;
    });

    // Run Preview
    const handleRunPreview = async () => {
        setIsPreviewing(true);
        try {
            const res = await axios.post(wh('sync-dispense.preview'), {
                start_date: previewStartDate,
                end_date: previewEndDate,
            });
            if (res.data?.ok) {
                setPreviewResult(res.data);
            } else {
                alert(res.data?.message || 'ไม่สามารถดึงข้อมูลจำลองได้');
            }
        } catch (e: any) {
            alert('เกิดข้อผิดพลาดในการจำลอง: ' + (e.response?.data?.message || e.message));
        } finally {
            setIsPreviewing(false);
        }
    };

    // Commit Dispense from Preview
    const handleCommit = (mode: 'all' | 'only_ready') => {
        const confirmMsg =
            mode === 'only_ready'
                ? `ยืนยันตัดจ่ายจริงเฉพาะรายการที่สต็อกพร้อม (${previewResult?.stats.ready_to_deduct || 0} รายการ) หรือไม่?`
                : `ยืนยันตัดจ่ายจริงทั้งหมด (${(previewResult?.stats.ready_to_deduct || 0) + (previewResult?.stats.insufficient || 0)} รายการ) โดยรายการที่สต็อกไม่พอจะเข้าสู่ระบบยาค้างจ่ายอัตโนมัติ?`;

        if (!confirm(confirmMsg)) return;

        setIsCommitting(true);
        router.post(
            wh('sync-dispense.commit'),
            {
                start_date: previewStartDate,
                end_date: previewEndDate,
                mode,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsCommitting(false);
                    handleRunPreview();
                },
            },
        );
    };

    // Fulfill single owed item
    const handleFulfillSingle = (id: number) => {
        setFulfillingId(id);
        router.post(
            wh('pending-dispense.fulfill', { id }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setFulfillingId(null),
            },
        );
    };

    // Fulfill all ready owed items
    const handleFulfillAllReady = () => {
        if (!confirm('ยืนยันตัดจ่ายรายการยาค้างจ่ายทั้งหมดที่สต็อกในห้องยาพร้อมจ่ายแล้วหรือไม่?')) return;
        setIsFulfillingAll(true);
        router.post(
            wh('pending-dispense.fulfill-ready'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsFulfillingAll(false),
            },
        );
    };

    // Submit Cancel Owed
    const handleSubmitCancel = (e: FormEvent) => {
        e.preventDefault();
        if (!cancelModalItem) return;
        setIsCancelling(true);
        router.post(
            wh('pending-dispense.cancel', { id: cancelModalItem.id }),
            { reason: cancelReason },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsCancelling(false);
                    setCancelModalItem(null);
                },
            },
        );
    };

    // Submit Rollback Single
    const handleSubmitRollback = (e: FormEvent) => {
        e.preventDefault();
        if (!rollbackModalItem) return;
        setIsRollingBack(true);
        router.post(
            wh('sync-dispense.rollback', { id: rollbackModalItem.id }),
            { reason: rollbackReason },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsRollingBack(false);
                    setRollbackModalItem(null);
                },
            },
        );
    };

    // Submit Rollback All
    const handleConfirmRollbackAll = () => {
        setIsRollingBackAll(true);
        router.post(
            wh('sync-dispense.rollback-all'),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsRollingBackAll(false);
                    setShowRollbackAllModal(false);
                },
            },
        );
    };

    // Search History
    const handleSearchHistory = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            wh('sync-dispense.history'),
            {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                status: status !== 'all' ? status : undefined,
                tab: 'history',
            },
            { preserveState: true },
        );
    };

    const locationName = pharmacyLocation?.name || 'ห้องยา OPD';

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: warehouseHome(), href: wh('index') },
                { title: 'ระบบตัดจ่าย HOSxP & ยาค้างจ่าย' },
            ])}
        >
            <Head
                title={
                    warehouseSupply()
                        ? 'ระบบตัดจ่ายเวชภัณฑ์ HOSxP & เวชภัณฑ์ค้างจ่าย'
                        : 'ระบบตัดจ่ายยา HOSxP & ยาค้างจ่าย'
                }
            />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active={warehouseActive()} />

                {/* Header with Title and Tabs */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <span>ระบบตัดจ่ายจาก HOSxP และระบบยาค้างจ่าย</span>
                            <span className="rounded-full bg-teal-100 px-3 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                {locationName} (OPD + IPD)
                            </span>
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            จำลองตรวจสอบก่อนตัดจ่ายจริง, จัดการยาค้างจ่ายเมื่อสต็อกเข้ามา, และระบบกู้คืนข้อมูลหากตัดผิด
                        </p>
                    </div>

                    {/* Actions and Navigation Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 h-9"
                        >
                            <Link href={wh('reports.stock-summary')}>
                                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                                รายงานสรุปยอดสต็อก
                            </Link>
                        </Button>

                        <div className="flex rounded-2xl bg-muted p-1 border border-border">
                            <button
                                type="button"
                                onClick={() => setActiveTab('preview')}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                                    activeTab === 'preview'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Play className="h-3.5 w-3.5 text-teal-600" />
                                1. จำลองก่อนตัดจ่าย (Dry Run)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('owed')}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition relative ${
                                    activeTab === 'owed'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Clock className="h-3.5 w-3.5 text-rose-500" />
                                2. ระบบยาค้างจ่าย
                                {owedList.length > 0 && (
                                    <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                        {owedList.length}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                                    activeTab === 'history'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <History className="h-3.5 w-3.5 text-violet-600" />
                                3. ประวัติการตัดจ่าย & กู้คืน
                            </button>
                        </div>
                    </div>
                </div>

                {/* TAB 1: PREVIEW / DRY RUN */}
                {activeTab === 'preview' && (
                    <div className="space-y-6">
                        {/* Preview Control Card */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div className="flex flex-wrap items-end gap-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                            ตั้งแต่วันที่
                                        </label>
                                        <ThaiDatePicker
                                            label="ตั้งแต่วันที่"
                                            value={previewStartDate}
                                            onChange={setPreviewStartDate}
                                            className="w-56"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                            ถึงวันที่
                                        </label>
                                        <ThaiDatePicker
                                            label="ถึงวันที่"
                                            value={previewEndDate}
                                            onChange={setPreviewEndDate}
                                            className="w-56"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleRunPreview}
                                        disabled={isPreviewing}
                                        className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
                                    >
                                        <Play
                                            className={`mr-1.5 h-4 w-4 ${isPreviewing ? 'animate-spin' : ''}`}
                                        />
                                        {isPreviewing ? 'กำลังจำลองตรวจสอบ...' : 'ดึงข้อมูลและจำลอง (Dry Run)'}
                                    </Button>
                                </div>

                                {previewResult && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleCommit('only_ready')}
                                            disabled={
                                                isCommitting ||
                                                previewResult.stats.ready_to_deduct === 0
                                            }
                                            className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                                        >
                                            <PackageCheck className="mr-1.5 h-4 w-4" />
                                            ยืนยันตัดเฉพาะรายการที่พร้อม ({previewResult.stats.ready_to_deduct})
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => handleCommit('all')}
                                            disabled={
                                                isCommitting ||
                                                previewResult.stats.ready_to_deduct +
                                                    previewResult.stats.insufficient ===
                                                    0
                                            }
                                            className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white"
                                        >
                                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                            ยืนยันตัดจ่ายจริงทั้งหมด (ไม่พอเข้ายาค้างจ่าย)
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Info Banner */}
                            <div className="rounded-xl bg-teal-50/70 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 flex items-start gap-2 border border-teal-200/60 dark:border-teal-900">
                                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-teal-600" />
                                <div>
                                    <span className="font-bold">โหมดจำลองตรวจสอบ (Dry Run):</span>{' '}
                                    ระบบจะดึงใบสั่งยาจาก HOSxP ทั้งหมด (รวมทั้ง OPD และ IPD)
                                    นำมาเทียบกับสต็อกห้องยา OPD โดย<strong>ยังไม่มีการตัดสต็อกจริง</strong>{' '}
                                    ตารางด้านล่างจะสรุปภาพรวมตาม<strong>รายชื่อยา</strong> เพื่อให้เห็นยอดตัดจ่าย ยอดคงเหลือ และยอดค้างจ่ายชัดเจน
                                </div>
                            </div>
                        </div>

                        {/* Preview Stat Cards */}
                        {previewResult && (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                                        รายการใน HOSxP ทั้งหมด
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-foreground">
                                        {previewResult.stats.total_orders.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {previewResult.stats.total_drugs ? `${previewResult.stats.total_drugs} ชนิดยา (OPD+IPD)` : 'ใบสั่งยารวม'}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        สต็อกพร้อมตัดทันที
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {previewResult.stats.ready_to_deduct.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">สต็อกห้องยา OPD พอจ่าย</div>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <TriangleAlert className="h-3.5 w-3.5 text-rose-500" />
                                        สต็อกไม่พอ (เข้ายาค้างจ่าย)
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                                        {previewResult.stats.insufficient.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">ต้องเบิกยาจากคลังมาเติม</div>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <PackageCheck className="h-3.5 w-3.5 text-purple-500" />
                                        เคยตัดจ่ายไปแล้ว
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {previewResult.stats.already_deducted.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">ตัดสต็อกเรียบร้อยแล้ว</div>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Undo2 className="h-3.5 w-3.5 text-amber-500" />
                                        กู้คืน / ยกเลิกแล้ว
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                                        {(
                                            previewResult.stats.cancelled +
                                            previewResult.stats.reversed
                                        ).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">รายการที่ไม่ต้องตัด</div>
                                </div>
                            </div>
                        )}

                        {/* Preview Table Header & Mode Switcher */}
                        {previewResult && (
                            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                                <div className="p-4 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">
                                            {previewMode === 'grouped'
                                                ? `สรุปผลการจำลองรายชื่อยา (${previewResult.grouped_items?.length || 0} ชนิดยา · รวม ${previewResult.stats.total_orders.toLocaleString()} ใบสั่ง)`
                                                : `แสดงรายใบสั่งยาทั้งหมด (${previewResult.items.length.toLocaleString()} รายการ)`}
                                        </h3>
                                        <span className="text-xs text-muted-foreground">
                                            * จำลองการตัดแบบ FEFO เทียบกับยอดสต็อกปัจจุบันในห้องยา OPD
                                        </span>
                                    </div>

                                    <div className="flex rounded-xl bg-background p-1 border border-border">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode('grouped')}
                                            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                previewMode === 'grouped'
                                                    ? 'bg-teal-600 text-white shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Layers className="h-3.5 w-3.5" />
                                            สรุปตามชื่อยา
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode('detailed')}
                                            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                previewMode === 'detailed'
                                                    ? 'bg-teal-600 text-white shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ListFilter className="h-3.5 w-3.5" />
                                            แสดงรายใบสั่ง
                                        </button>
                                    </div>
                                </div>

                                {/* GROUPED BY DRUG VIEW (ตามคำขอของผู้ใช้) */}
                                {previewMode === 'grouped' && (
                                    <div className="overflow-x-auto max-h-[650px]">
                                        <table className="min-w-full divide-y divide-border text-sm">
                                            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-left text-xs uppercase tracking-wider text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold">รหัส icode</th>
                                                    <th className="px-4 py-3 font-semibold">ชื่อยา / เวชภัณฑ์</th>
                                                    <th className="px-4 py-3 font-semibold">หน่วย</th>
                                                    <th className="px-4 py-3 font-semibold text-right text-purple-700 dark:text-purple-300">
                                                        จำนวนที่ตัดจ่าย (ยอดสั่ง HOSxP)
                                                    </th>
                                                    <th className="px-4 py-3 font-semibold text-right text-teal-700 dark:text-teal-300">
                                                        จำนวนคงเหลือในห้องยา OPD
                                                    </th>
                                                    <th className="px-4 py-3 font-semibold text-right text-emerald-700 dark:text-emerald-300">
                                                        สามารถตัดได้
                                                    </th>
                                                    <th className="px-4 py-3 font-semibold text-right text-rose-700 dark:text-rose-300">
                                                        ค้างจ่าย (ขาดอีก)
                                                    </th>
                                                    <th className="px-4 py-3 font-semibold text-center">สถานะความพร้อม</th>
                                                    <th className="px-4 py-3 font-semibold text-center">ใบสั่งยา</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border bg-card">
                                                {(previewResult.grouped_items || []).map((g) => {
                                                    const isExpanded = expandedDrug === g.icode;
                                                    return (
                                                        <>
                                                            <tr
                                                                key={g.icode}
                                                                className={`transition-colors hover:bg-muted/30 ${
                                                                    g.status === 'insufficient'
                                                                        ? 'bg-rose-50/20 dark:bg-rose-950/10'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                                    {g.icode}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="font-semibold text-foreground">
                                                                        {g.item_name}
                                                                    </div>
                                                                    {g.strength && (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {g.strength}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                                    {g.unit}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                                                    {g.total_ordered.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono font-semibold text-teal-700 dark:text-teal-300 whitespace-nowrap">
                                                                    {g.current_stock.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                                                                    {g.can_deduct_qty.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                                                    {g.deficit_qty > 0 ? (
                                                                        <span className="text-rose-600 dark:text-rose-400">
                                                                            {g.deficit_qty.toLocaleString()}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                    {g.status === 'full' ? (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                            <CheckCircle2 className="h-3 w-3" />
                                                                            พอตัดครบ
                                                                        </span>
                                                                    ) : g.status === 'partial' ? (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                            <TriangleAlert className="h-3 w-3" />
                                                                            พอตัดบางส่วน
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                            <XCircle className="h-3 w-3" />
                                                                            ค้างจ่ายทั้งหมด
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            setExpandedDrug(
                                                                                isExpanded ? null : g.icode,
                                                                            )
                                                                        }
                                                                        className="h-7 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                                                        ) : (
                                                                            <ChevronRight className="h-3.5 w-3.5 mr-1" />
                                                                        )}
                                                                        {g.orders_count} ใบสั่ง
                                                                    </Button>
                                                                </td>
                                                            </tr>

                                                            {/* EXPANDABLE ACCORDION FOR PATIENT ORDERS */}
                                                            {isExpanded && (
                                                                <tr className="bg-muted/30">
                                                                    <td colSpan={9} className="p-4 pl-12">
                                                                        <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2">
                                                                            <div className="text-xs font-bold text-foreground">
                                                                                รายการใบสั่งยา {g.item_name} ({g.orders.length} ใบสั่ง)
                                                                            </div>
                                                                            <div className="overflow-x-auto max-h-56">
                                                                                <table className="min-w-full text-xs">
                                                                                    <thead className="bg-muted/70 text-muted-foreground text-left">
                                                                                        <tr>
                                                                                            <th className="p-2">วันบริการ</th>
                                                                                            <th className="p-2">ประเภท</th>
                                                                                            <th className="p-2">ผู้ป่วย (HN / VN)</th>
                                                                                            <th className="p-2 text-right">จำนวนสั่ง</th>
                                                                                            <th className="p-2 text-center">สถานะจำลอง</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-border">
                                                                                        {g.orders.map((ord) => (
                                                                                            <tr key={ord.key} className="hover:bg-muted/40">
                                                                                                <td className="p-2 font-mono text-muted-foreground">
                                                                                                    {ord.vstdate}
                                                                                                </td>
                                                                                                <td className="p-2">
                                                                                                    {ord.visit_type === 'IPD' ? (
                                                                                                        <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-800">
                                                                                                            IPD {ord.an ? `(${ord.an})` : ''}
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
                                                                                                            OPD
                                                                                                        </span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="p-2">
                                                                                                    <span className="font-semibold text-foreground">
                                                                                                        {ord.patient_name}
                                                                                                    </span>{' '}
                                                                                                    <span className="font-mono text-muted-foreground">
                                                                                                        HN {ord.hn} {ord.vn ? `· VN ${ord.vn}` : ''}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="p-2 text-right font-bold font-mono">
                                                                                                    {ord.qty} {g.unit}
                                                                                                </td>
                                                                                                <td className="p-2 text-center">
                                                                                                    {ord.preview_status === 'ready_to_deduct' ? (
                                                                                                        <span className="text-emerald-600 font-semibold">
                                                                                                            พร้อมตัด
                                                                                                        </span>
                                                                                                    ) : ord.preview_status === 'already_deducted' ? (
                                                                                                        <span className="text-purple-600">
                                                                                                            ตัดไปแล้ว
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="text-rose-600 font-semibold">
                                                                                                            ค้างจ่าย
                                                                                                        </span>
                                                                                                    )}
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* DETAILED PRESCRIPTION VIEW */}
                                {previewMode === 'detailed' && (
                                    <div className="overflow-x-auto max-h-[600px]">
                                        <table className="min-w-full divide-y divide-border text-sm">
                                            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur text-left text-xs uppercase tracking-wider text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold">วันบริการ (vstdate)</th>
                                                    <th className="px-4 py-3 font-semibold">ประเภท</th>
                                                    <th className="px-4 py-3 font-semibold">ผู้ป่วย (HN / ชื่อ-สกุล)</th>
                                                    <th className="px-4 py-3 font-semibold">รายการยา (icode)</th>
                                                    <th className="px-4 py-3 font-semibold text-right">จำนวนที่สั่ง</th>
                                                    <th className="px-4 py-3 font-semibold text-right">สต็อกห้องยาปัจจุบัน</th>
                                                    <th className="px-4 py-3 font-semibold text-center">ผลการจำลอง</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border bg-card">
                                                {previewResult.items.map((row) => (
                                                    <tr
                                                        key={row.key}
                                                        className="transition-colors hover:bg-muted/30"
                                                    >
                                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                            {row.vstdate}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            {row.visit_type === 'IPD' ? (
                                                                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                                                                    🏥 IPD {row.an ? `(${row.an})` : ''}
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300">
                                                                    🩺 OPD
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs">
                                                            <div className="font-semibold text-foreground">
                                                                {row.patient_name}
                                                            </div>
                                                            <div className="font-mono text-muted-foreground">
                                                                HN {row.hn} {row.vn ? `· VN ${row.vn}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-foreground">
                                                                {row.item_name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground font-mono">
                                                                {row.icode} {row.strength ? `· ${row.strength}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-foreground">
                                                            {row.qty} {row.unit}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                                                            {row.current_stock.toLocaleString()} {row.unit}
                                                        </td>
                                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                                            {row.preview_status === 'already_deducted' ? (
                                                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                                                                    ตัดไปแล้ว
                                                                </span>
                                                            ) : row.preview_status === 'ready_to_deduct' ? (
                                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                                    ✓ สต็อกพร้อมตัด
                                                                </span>
                                                            ) : row.preview_status === 'insufficient' ? (
                                                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                                                    ✕ สต็อกไม่พอ (ขาด {row.deficit})
                                                                </span>
                                                            ) : row.preview_status === 'cancelled' ? (
                                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                                    ยกเลิกแล้ว
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                                    กู้คืนแล้ว
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: PENDING DISPENSE (ยาค้างจ่าย) */}
                {activeTab === 'owed' && (
                    <div className="space-y-6">
                        {/* Top Action Card */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-rose-500" />
                                    <span>รายการยาค้างจ่ายห้องยา OPD</span>
                                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                        {owedList.length} รายการคงค้าง
                                    </span>
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    รายการยาที่สั่งจาก HOSxP แต่สต็อกในห้องยาไม่พอจ่าย
                                    เมื่อมียาเข้ามาเติมแล้ว สามารถกดตัดจ่ายให้ผู้ป่วยได้ทันที (แสดงชื่อผู้ป่วยและมาสก์นามสกุลตาม PDPA)
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    onClick={handleFulfillAllReady}
                                    disabled={
                                        isFulfillingAll ||
                                        owedList.filter((x) => x.can_fulfill).length === 0
                                    }
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <PackageCheck
                                        className={`mr-1.5 h-4 w-4 ${isFulfillingAll ? 'animate-spin' : ''}`}
                                    />
                                    {isFulfillingAll
                                        ? 'กำลังตัดจ่าย...'
                                        : `ตัดจ่ายรายการที่สต็อกพร้อมทั้งหมด (${owedList.filter((x) => x.can_fulfill).length})`}
                                </Button>
                            </div>
                        </div>

                        {/* Search & Filter Bar for Owed Items */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
                            <div className="flex-1 min-w-[280px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={owedSearch}
                                        onChange={(e) => setOwedSearch(e.target.value)}
                                        placeholder="ค้นหาชื่อผู้ป่วย, HN, VN, หรือชื่อยา..."
                                        className="pl-9 rounded-xl h-10"
                                    />
                                </div>
                            </div>

                            {/* Filter Status Pills */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground mr-1 font-medium">สต็อก:</span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={owedStockFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setOwedStockFilter('all')}
                                    className="h-8 rounded-lg text-xs"
                                >
                                    ทั้งหมด ({owedList.length})
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={owedStockFilter === 'ready' ? 'secondary' : 'outline'}
                                    onClick={() => setOwedStockFilter('ready')}
                                    className="h-8 rounded-lg text-xs border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                                >
                                    พร้อมจ่าย ({owedList.filter((x) => x.can_fulfill).length})
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={owedStockFilter === 'waiting' ? 'secondary' : 'outline'}
                                    onClick={() => setOwedStockFilter('waiting')}
                                    className="h-8 rounded-lg text-xs border-rose-300 text-rose-800 dark:border-rose-800 dark:text-rose-300"
                                >
                                    รอเติมสต็อก ({owedList.filter((x) => !x.can_fulfill).length})
                                </Button>

                                <span className="text-muted-foreground mx-1.5 font-medium">|</span>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant={owedTypeFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setOwedTypeFilter('all')}
                                    className="h-8 rounded-lg text-xs"
                                >
                                    ทุกประเภท
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={owedTypeFilter === 'OPD' ? 'secondary' : 'outline'}
                                    onClick={() => setOwedTypeFilter('OPD')}
                                    className="h-8 rounded-lg text-xs border-blue-300 text-blue-800 dark:border-blue-800 dark:text-blue-300"
                                >
                                    OPD
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={owedTypeFilter === 'IPD' ? 'secondary' : 'outline'}
                                    onClick={() => setOwedTypeFilter('IPD')}
                                    className="h-8 rounded-lg text-xs border-purple-300 text-purple-800 dark:border-purple-800 dark:text-purple-300"
                                >
                                    IPD
                                </Button>

                                {(owedSearch || owedStockFilter !== 'all' || owedTypeFilter !== 'all') && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setOwedSearch('');
                                            setOwedStockFilter('all');
                                            setOwedTypeFilter('all');
                                        }}
                                        className="h-8 rounded-lg text-xs text-muted-foreground"
                                    >
                                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                        ล้างตัวกรอง
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Owed Table */}
                        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                            <table className="min-w-full divide-y divide-border text-sm">
                                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">วันสั่งยา (vstdate)</th>
                                        <th className="px-4 py-3 font-semibold">ประเภท</th>
                                        <th className="px-4 py-3 font-semibold">ผู้ป่วย (HN / ชื่อ-สกุล)</th>
                                        <th className="px-4 py-3 font-semibold">รายการยาค้างจ่าย</th>
                                        <th className="px-4 py-3 font-semibold text-right">จำนวนค้างจ่าย</th>
                                        <th className="px-4 py-3 font-semibold text-right">สต็อกห้องยาปัจจุบัน</th>
                                        <th className="px-4 py-3 font-semibold text-center">สถานะสต็อก</th>
                                        <th className="px-4 py-3 font-semibold text-center">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {filteredOwedList.map((row) => (
                                        <tr key={row.id} className="transition-colors hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                {row.vstdate}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {row.visit_type === 'IPD' ? (
                                                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                                                        🏥 IPD
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300">
                                                        🩺 OPD
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                                                    <User className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                                                    <span>{row.patient_name}</span>
                                                </div>
                                                <div className="font-mono text-muted-foreground mt-0.5 pl-5.5">
                                                    HN <span className="font-semibold text-foreground/80">{row.hn}</span>
                                                    {row.vn ? ` · VN ${row.vn}` : ''}
                                                    {row.an ? ` · AN ${row.an}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">
                                                    {row.item_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {row.icode} {row.strength ? `· ${row.strength}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                                {row.qty} {row.unit}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
                                                {row.current_stock.toLocaleString()} {row.unit}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {row.can_fulfill ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        สต็อกพร้อมจ่ายแล้ว
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                                        <TriangleAlert className="h-3.5 w-3.5" />
                                                        รอเติมสต็อก (ขาด {(row.qty - row.current_stock).toFixed(2)})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleFulfillSingle(row.id)}
                                                        disabled={
                                                            !row.can_fulfill ||
                                                            fulfillingId === row.id
                                                        }
                                                        className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                                    >
                                                        <PackageCheck className="mr-1 h-3.5 w-3.5" />
                                                        {fulfillingId === row.id ? 'กำลังจ่าย...' : 'ตัดจ่ายให้ผู้ป่วย'}
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCancelModalItem(row)}
                                                        className="h-8 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50 text-xs dark:border-rose-900 dark:text-rose-400"
                                                    >
                                                        <X className="mr-1 h-3.5 w-3.5" />
                                                        ยกเลิก
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOwedList.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                                                {owedList.length === 0 ? (
                                                    <>
                                                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                                                        ยอดเยี่ยม! ไม่มีรายการยาค้างจ่ายในขณะนี้
                                                    </>
                                                ) : (
                                                    'ไม่พบรายการยาค้างจ่ายตามเงื่อนไขที่ค้นหา'
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: DISPENSE HISTORY & ROLLBACK */}
                {activeTab === 'history' && (
                    <div className="space-y-6">
                        {/* History Stat Cards */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-violet-600" />
                                    รายการสั่งยาในงวด
                                </div>
                                <div className="mt-2 text-2xl font-bold text-foreground">
                                    {stats.total.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">ใบสั่งยาทั้งหมด</div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ตัดจ่ายสต็อกสำเร็จ
                                </div>
                                <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {stats.synced.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">ตัดสต็อกห้องยาแล้ว</div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <TriangleAlert className="h-4 w-4 text-rose-500" />
                                    สต็อกไม่พอ (ค้างจ่าย)
                                </div>
                                <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                                    {stats.insufficient.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">รอยกยอด / เติมยา</div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Undo2 className="h-4 w-4 text-amber-500" />
                                    กู้คืนข้อมูลแล้ว
                                </div>
                                <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {stats.reversed.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">ย้อนคืนสต็อกเข้าห้องยา</div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <XCircle className="h-4 w-4 text-gray-500" />
                                    ยกเลิกรายการแล้ว
                                </div>
                                <div className="mt-2 text-2xl font-bold text-gray-600 dark:text-gray-400">
                                    {stats.cancelled.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">ผู้ป่วยไม่รับยา / ยกเลิก</div>
                            </div>
                        </div>

                        {/* Search and Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
                            <form
                                onSubmit={handleSearchHistory}
                                className="flex flex-1 flex-wrap items-end gap-3"
                            >
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        ตั้งแต่วันที่
                                    </label>
                                    <ThaiDatePicker
                                        label="ตั้งแต่วันที่"
                                        value={startDate}
                                        onChange={setStartDate}
                                        className="w-56"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        ถึงวันที่
                                    </label>
                                    <ThaiDatePicker
                                        label="ถึงวันที่"
                                        value={endDate}
                                        onChange={setEndDate}
                                        className="w-56"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        สถานะการซิงก์
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="all">ทุกสถานะ</option>
                                        <option value="deducted">ตัดสต็อกสำเร็จ (Deducted)</option>
                                        <option value="insufficient">สต็อกไม่พอ (Insufficient)</option>
                                        <option value="reversed">กู้คืนข้อมูลแล้ว (Reversed)</option>
                                        <option value="cancelled">ยกเลิกแล้ว (Cancelled)</option>
                                        <option value="failed">ล้มเหลว (Failed)</option>
                                    </select>
                                </div>

                                <Button type="submit" variant="secondary" className="rounded-xl h-10">
                                    <Filter className="mr-1.5 h-4 w-4" />
                                    กรอง
                                </Button>
                            </form>

                            {/* Batch Rollback Button (ตามคำขอของผู้ใช้: คืนสต็อกที่ตัดจาก HOSxP ทั้งหมด) */}
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowRollbackAllModal(true)}
                                    disabled={stats.synced === 0}
                                    className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 h-10"
                                >
                                    <Undo2 className="mr-1.5 h-4 w-4" />
                                    กู้คืนสต็อก HOSxP ทั้งหมด ({stats.synced})
                                </Button>
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                            <table className="min-w-full divide-y divide-border text-sm">
                                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">วันบริการ (vstdate)</th>
                                        <th className="px-4 py-3 font-semibold">ประเภท</th>
                                        <th className="px-4 py-3 font-semibold">ผู้ป่วย (HN / VN)</th>
                                        <th className="px-4 py-3 font-semibold">รายการยา (icode)</th>
                                        <th className="px-4 py-3 font-semibold text-right">จำนวนจ่าย</th>
                                        <th className="px-4 py-3 font-semibold text-center">สถานะ</th>
                                        <th className="px-4 py-3 font-semibold">ข้อความ / หมายเหตุ</th>
                                        <th className="px-4 py-3 font-semibold text-center">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {syncs.data.map((row) => (
                                        <tr key={row.id} className="transition-colors hover:bg-muted/30">
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                {row.vstdate}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {row.an ? (
                                                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                                                        🏥 IPD
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300">
                                                        🩺 OPD
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                                    <span>{row.patient_name || 'ผู้ป่วย'}</span>
                                                </div>
                                                <div className="font-mono text-muted-foreground pl-5">
                                                    HN {row.hn || '—'} {row.vn ? `· VN ${row.vn}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                                                    <span>{row.item?.name || `รหัส ${row.icode}`}</span>
                                                    {row.item?.item_type === 'nondrug' && (
                                                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                                            📦 ค่าเวชภัณฑ์ที่มิใช่ยา
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {row.icode} {row.item?.strength ? `· ${row.item.strength}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">
                                                {row.qty} {row.item?.unit || 'หน่วย'}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {row.status === 'deducted' ? (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                        ตัดจ่ายสำเร็จ
                                                    </span>
                                                ) : row.status === 'reversed' ? (
                                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                        🔄 กู้คืนแล้ว
                                                    </span>
                                                ) : row.status === 'cancelled' ? (
                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                        ยกเลิกแล้ว
                                                    </span>
                                                ) : row.status === 'insufficient' ? (
                                                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                                        สต็อกไม่พอ
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                        {row.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                                                {row.cancel_reason || row.message || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                {row.status === 'deducted' && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 rounded-lg text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                                                        onClick={() => setRollbackModalItem(row)}
                                                    >
                                                        <Undo2 className="mr-1 h-3.5 w-3.5" />
                                                        กู้คืนข้อมูล
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {syncs.data.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                                ไม่พบประวัติการซิงก์ตัดจ่ายในช่วงวันที่เลือก
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {syncs.last_page > 1 && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div>
                                    หน้า {syncs.current_page} จาก {syncs.last_page} (รวม {syncs.total} รายการ)
                                </div>
                                <div className="flex gap-1">
                                    {syncs.prev_page_url && (
                                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                            <a href={syncs.prev_page_url}>ก่อนหน้า</a>
                                        </Button>
                                    )}
                                    {syncs.next_page_url && (
                                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                            <a href={syncs.next_page_url}>ถัดไป</a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL: CANCEL OWED */}
            {cancelModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-rose-500" />
                                ยกเลิกรายการยาค้างจ่าย
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCancelModalItem(null)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                            <div>
                                <span className="font-semibold text-foreground">ยา:</span>{' '}
                                {cancelModalItem.item_name} ({cancelModalItem.icode})
                            </div>
                            <div>
                                <span className="font-semibold text-foreground">ผู้ป่วย:</span>{' '}
                                {cancelModalItem.patient_name} (HN: {cancelModalItem.hn})
                            </div>
                            <div>
                                <span className="font-semibold text-foreground">จำนวนค้าง:</span>{' '}
                                {cancelModalItem.qty} {cancelModalItem.unit}
                            </div>
                        </div>

                        <form onSubmit={handleSubmitCancel} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    ระบุเหตุผลในการยกเลิก:
                                </label>
                                <textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows={3}
                                    required
                                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                                    placeholder="เช่น ผู้ป่วยไม่รอรับยา, แพทย์เปลี่ยนยา, สั่งยาซ้ำซ้อน..."
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCancelModalItem(null)}
                                    className="rounded-xl text-xs"
                                >
                                    ยกเลิก
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isCancelling}
                                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs"
                                >
                                    {isCancelling ? 'กำลังบันทึก...' : 'ยืนยันยกเลิกรายการค้างจ่าย'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ROLLBACK SINGLE DISPENSE */}
            {rollbackModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Undo2 className="h-5 w-5 text-amber-500" />
                                กู้คืนข้อมูลการตัดจ่าย (Rollback)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setRollbackModalItem(null)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="rounded-xl bg-amber-50/80 p-3 text-xs space-y-1 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                            <div>
                                <span className="font-semibold">ยา:</span>{' '}
                                {rollbackModalItem.item?.name || rollbackModalItem.icode}
                            </div>
                            <div>
                                <span className="font-semibold">จำนวนที่จะคืนสต็อก:</span>{' '}
                                {rollbackModalItem.qty} {rollbackModalItem.item?.unit || 'หน่วย'}
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                                * ระบบจะคืนสต็อกจำนวนนี้กลับเข้าห้องยา OPD ทันที และกู้คืน Lot FEFO เดิม
                            </div>
                        </div>

                        <form onSubmit={handleSubmitRollback} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    ระบุเหตุผลในการกู้คืน (Audit Log):
                                </label>
                                <textarea
                                    value={rollbackReason}
                                    onChange={(e) => setRollbackReason(e.target.value)}
                                    rows={3}
                                    required
                                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                                    placeholder="เช่น ตัดจ่ายผิดใบสั่ง, ปรับลดยาใน HOSxP, ย้อนคืนสต็อก..."
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRollbackModalItem(null)}
                                    className="rounded-xl text-xs"
                                >
                                    ปิด
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isRollingBack}
                                    className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                >
                                    {isRollingBack ? 'กำลังกู้คืน...' : 'ยืนยันกู้คืนสต็อก'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ROLLBACK ALL HOSXP DISPENSES */}
            {showRollbackAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Undo2 className="h-5 w-5 text-amber-600" />
                                ยืนยันกู้คืนสต็อก HOSxP ทั้งหมด (Rollback All)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowRollbackAllModal(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800 space-y-2">
                            <div className="font-bold text-sm text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                                โปรดตรวจสอบอย่างละเอียดก่อนดำเนินการ:
                            </div>
                            <div>
                                ระบบจะทำการ<strong>กู้คืนสต็อกที่เคยถูกตัดจ่ายจาก HOSxP ทั้งหมด {stats.synced.toLocaleString()} รายการ</strong>{' '}
                                กลับคืนเข้าห้องยา OPD และ Lots FEFO ทันที และจะปรับสถานะรายการเป็น "กู้คืนแล้ว" (Reversed)
                            </div>
                            <div className="text-[11px] text-amber-800 dark:text-amber-300">
                                * ช่วยให้ยอดสต็อกห้องยา OPD กลับคืนสู่สถานะเดิมก่อนการตัดจ่าย เพื่อให้ท่านสามารถทดสอบและจำลองการตัดจ่ายได้อย่างแม่นยำ
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowRollbackAllModal(false)}
                                className="rounded-xl text-xs"
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirmRollbackAll}
                                disabled={isRollingBackAll}
                                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs"
                            >
                                {isRollingBackAll ? 'กำลังกู้คืนสต็อกทั้งหมด...' : `ยืนยันกู้คืนทั้ง ${stats.synced.toLocaleString()} รายการ`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
