import { FormEvent, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    BellRing,
    Boxes,
    Building2,
    Check,
    CheckCircle2,
    Database,
    Download,
    Edit,
    ExternalLink,
    FileSpreadsheet,
    Flame,
    Info,
    Layers,
    Package,
    Plus,
    Printer,
    RefreshCw,
    Save,
    Send,
    ShieldAlert,
    Sliders,
    Snowflake,
    Sparkles,
    Trash2,
    Upload,
    X,
} from 'lucide-react';

type Location = {
    id: number;
    code: string;
    name: string;
    type: 'warehouse' | 'pharmacy';
    sort_order: number;
    is_active: boolean;
    notes?: string | null;
    balances_count?: number;
};

type Setting = {
    id: number;
    key: string;
    value?: string | null;
    type: string;
    label?: string | null;
    group: string;
    description?: string | null;
};

type PackagingType = {
    id: number;
    code: string;
    name: string;
    sort_order: number;
    is_active: boolean;
};

export default function Settings({
    locations,
    settings,
    packagingTypes = [],
}: {
    locations: Location[];
    settings: Setting[];
    packagingTypes: PackagingType[];
}) {
    const [activeTab, setActiveTab] = useState<'alerts' | 'ha' | 'hosxp' | 'labels' | 'locations' | 'packaging' | 'stock_import'>('alerts');

    // Excel Stock Import state
    const [importScope, setImportScope] = useState<'all' | 'drug' | 'nondrug'>('all');
    const [templateLocationId, setTemplateLocationId] = useState<number>(locations[0]?.id ?? 1);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importLocationId, setImportLocationId] = useState<number>(locations[0]?.id ?? 1);
    const [importMode, setImportMode] = useState<'replace' | 'add'>('replace');
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState<{
        token: string;
        filename: string;
        stats: {
            total_rows: number;
            valid_count: number;
            skipped_count: number;
            error_count: number;
            total_qty: number;
            total_value: number;
        };
        preview_items: Array<{
            row: number;
            item_id: number;
            icode: string;
            item_name: string;
            item_type: string;
            item_type_label: string;
            strength: string | null;
            unit: string;
            location_code: string;
            location_name: string;
            counted_qty: number;
            lot_no: string | null;
            expires_at: string | null;
            unit_price: number | null;
            reorder_level: number | null;
            notes: string | null;
            line_value: number;
        }>;
        errors: Array<{
            row: number;
            icode: string;
            name: string;
            message: string;
        }>;
        skipped: Array<{
            row: number;
            icode: string;
            name: string;
            reason: string;
        }>;
    } | null>(null);
    const [isCommitting, setIsCommitting] = useState(false);
    const [commitSuccess, setCommitSuccess] = useState<{
        message: string;
        imported_count: number;
        total_qty: number;
    } | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // State for Settings form values dictionary
    const [settingValues, setSettingValues] = useState<Record<string, string>>(() => {
        const dict: Record<string, string> = {};
        settings.forEach((s) => {
            dict[s.key] = s.value ?? '';
        });
        return dict;
    });

    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Location Modals state
    const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);

    // Packaging Type Modals state
    const [isAddPackagingOpen, setIsAddPackagingOpen] = useState(false);
    const [editingPackaging, setEditingPackaging] = useState<PackagingType | null>(null);
    const [deletingPackaging, setDeletingPackaging] = useState<PackagingType | null>(null);

    const handleSettingChange = (key: string, value: string) => {
        setSettingValues((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = (e: FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);
        router.post(
            route('pharmacy.inventory.settings.values.batch'),
            { settings: settingValues },
            {
                preserveScroll: true,
                onFinish: () => setIsSavingSettings(false),
            },
        );
    };

    // Location Form Handlers
    const handleStoreLocation = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        router.post(
            route('pharmacy.inventory.settings.locations.store'),
            Object.fromEntries(formData.entries()),
            {
                preserveScroll: true,
                onSuccess: () => setIsAddLocationOpen(false),
            },
        );
    };

    const handleUpdateLocation = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingLocation) return;
        const formData = new FormData(e.currentTarget);
        router.patch(
            route('pharmacy.inventory.settings.locations.update', editingLocation.id),
            {
                code: formData.get('code'),
                name: formData.get('name'),
                type: formData.get('type'),
                sort_order: parseInt(formData.get('sort_order') as string) || 0,
                is_active: formData.get('is_active') === '1',
                notes: formData.get('notes'),
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingLocation(null),
            },
        );
    };

    const handleDeleteLocation = () => {
        if (!deletingLocation) return;
        router.delete(
            route('pharmacy.inventory.settings.locations.destroy', deletingLocation.id),
            {
                preserveScroll: true,
                onSuccess: () => setDeletingLocation(null),
            },
        );
    };

    // Packaging Type Form Handlers
    const handleStorePackaging = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        router.post(
            route('pharmacy.inventory.settings.packaging-types.store'),
            Object.fromEntries(formData.entries()),
            {
                preserveScroll: true,
                onSuccess: () => setIsAddPackagingOpen(false),
            },
        );
    };

    const handleUpdatePackaging = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingPackaging) return;
        const formData = new FormData(e.currentTarget);
        router.patch(
            route('pharmacy.inventory.settings.packaging-types.update', editingPackaging.id),
            {
                code: formData.get('code'),
                name: formData.get('name'),
                sort_order: parseInt(formData.get('sort_order') as string) || 0,
                is_active: formData.get('is_active') === '1',
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingPackaging(null),
            },
        );
    };

    const handleDeletePackaging = () => {
        if (!deletingPackaging) return;
        router.delete(
            route('pharmacy.inventory.settings.packaging-types.destroy', deletingPackaging.id),
            {
                preserveScroll: true,
                onSuccess: () => setDeletingPackaging(null),
            },
        );
    };

    // Excel Stock Import Handlers
    const handleDownloadTemplate = () => {
        const url = route('pharmacy.inventory.settings.stock-template', {
            location_id: templateLocationId,
            scope: importScope,
        });
        window.location.href = url;
    };

    const handleUploadPreview = async (e: FormEvent) => {
        e.preventDefault();
        if (!importFile) return;

        setIsPreviewing(true);
        setUploadError(null);
        setCommitSuccess(null);

        const formData = new FormData();
        formData.append('file', importFile);
        if (importLocationId) {
            formData.append('fallback_location_id', String(importLocationId));
        }

        try {
            const response = await fetch(route('pharmacy.inventory.settings.stock-import.preview'), {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์');
            }

            setPreviewData(data);
        } catch (err: any) {
            setUploadError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel');
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleCommitImport = async () => {
        if (!previewData?.token) return;

        setIsCommitting(true);
        setUploadError(null);

        try {
            const response = await fetch(route('pharmacy.inventory.settings.stock-import.commit'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    token: previewData.token,
                    mode: importMode,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'เกิดข้อผิดพลาดในการบันทึกนำเข้าสต็อก');
            }

            setCommitSuccess({
                message: data.message,
                imported_count: data.data.imported_count,
                total_qty: data.data.total_qty,
            });
            setPreviewData(null);
            setImportFile(null);
        } catch (err: any) {
            setUploadError(err.message || 'เกิดข้อผิดพลาดในการบันทึกนำเข้า');
        } finally {
            setIsCommitting(false);
        }
    };

    const tabs = [
        { id: 'alerts', label: 'เกณฑ์สต็อก & แจ้งเตือน', icon: BellRing, count: null },
        { id: 'ha', label: 'มาตรฐานความปลอดภัย HA', icon: ShieldAlert, count: null },
        { id: 'hosxp', label: 'การเชื่อมต่อ HOSxP', icon: Database, count: null },
        { id: 'labels', label: 'ฉลากยา & สติ๊กเกอร์', icon: Printer, count: null },
        { id: 'locations', label: 'สถานที่จัดเก็บ / คลัง', icon: Building2, count: locations.length },
        { id: 'packaging', label: 'ประเภทบรรจุภัณฑ์', icon: Layers, count: packagingTypes.length },
        { id: 'stock_import', label: 'นำเข้ายอดยกมา (Excel)', icon: FileSpreadsheet, count: null },
    ] as const;

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: 'คลังยา / ห้องยา', href: route('pharmacy.inventory.index') },
                { title: 'ตั้งค่าระบบคลังยา' },
            ])}
        >
            <Head title="ตั้งค่าระบบคลังยาและห้องยา" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active="pharmacy.inventory.index" />

                {/* Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-xl">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-300">
                            <Sliders className="h-4 w-4" />
                            Inventory Configuration Suite
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">ตั้งค่าระบบคลังยาและห้องยา</h1>
                        <p className="text-sm text-violet-200/80 max-w-2xl">
                            ควบคุมเกณฑ์แจ้งเตือนสต็อก · มาตรฐานยาความเสี่ยงสูง HA · การซิงก์ตัดจ่าย HOSxP · สติ๊กเกอร์ · และโครงสร้างคลัง
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-xs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                                    isActive
                                        ? 'bg-violet-700 text-white shadow-xs'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                                {tab.count !== null && (
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: Alerts & Stock Control Thresholds */}
                {activeTab === 'alerts' && (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    เกณฑ์วันแจ้งเตือนยาใกล้หมดอายุ (Near-Expiry Thresholds)
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    กำหนดจำนวนวันล่วงหน้าก่อนถึงวันหมดอายุ (EXP) เพื่อแบ่งระดับการเตือนในระบบและรายงาน
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-950 dark:bg-rose-950/20 space-y-2">
                                    <Label className="text-rose-800 dark:text-rose-200 font-bold flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                                        ระยะวิกฤต (สีแดง)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={settingValues['expiry_alert_critical_days'] ?? '30'}
                                            onChange={(e) => handleSettingChange('expiry_alert_critical_days', e.target.value)}
                                            className="font-bold text-lg"
                                        />
                                        <span className="text-xs font-medium text-muted-foreground">วัน</span>
                                    </div>
                                    <p className="text-[11px] text-rose-700/80">ยาใกล้หมดอายุในระยะเร่งด่วนที่สุด</p>
                                </div>

                                <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 dark:border-orange-950 dark:bg-orange-950/20 space-y-2">
                                    <Label className="text-orange-800 dark:text-orange-200 font-bold flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                                        ระยะเฝ้าระวัง (สีส้ม)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={settingValues['expiry_alert_warning_days'] ?? '90'}
                                            onChange={(e) => handleSettingChange('expiry_alert_warning_days', e.target.value)}
                                            className="font-bold text-lg"
                                        />
                                        <span className="text-xs font-medium text-muted-foreground">วัน</span>
                                    </div>
                                    <p className="text-[11px] text-orange-700/80">เฝ้าระวังและเร่งหมุนเวียนจ่ายก่อน</p>
                                </div>

                                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-950 dark:bg-amber-950/20 space-y-2">
                                    <Label className="text-amber-800 dark:text-amber-200 font-bold flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        ระยะวางแผนระบาย (สีเหลือง)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={settingValues['expiry_alert_notice_days'] ?? '180'}
                                            onChange={(e) => handleSettingChange('expiry_alert_notice_days', e.target.value)}
                                            className="font-bold text-lg"
                                        />
                                        <span className="text-xs font-medium text-muted-foreground">วัน</span>
                                    </div>
                                    <p className="text-[11px] text-amber-700/80">วางแผนเปลี่ยนหรือส่งคืนบริษัทล่วงหน้า</p>
                                </div>
                            </div>

                            <hr className="border-border" />

                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-emerald-600" />
                                    เกณฑ์ดัชนีวันคงเหลือสต็อก (Days of Supply Thresholds)
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    คำนวณจากอัตราการใช้ยาเฉลี่ยรายวัน (ADU 90 วัน) เพื่อบอกระยะเวลาที่สต็อกจะพอจ่าย
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">วิกฤตสต็อกขาด (น้อยกว่า)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={settingValues['dos_critical_days'] ?? '7'}
                                            onChange={(e) => handleSettingChange('dos_critical_days', e.target.value)}
                                            className="font-bold"
                                        />
                                        <span className="text-xs text-muted-foreground">วัน</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">ระดับวิกฤตที่ต้องรีบจัดหาด่วน</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">ขั้นต่ำที่ต้องสั่งซื้อ Reorder (น้อยกว่า)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={settingValues['dos_reorder_days'] ?? '15'}
                                            onChange={(e) => handleSettingChange('dos_reorder_days', e.target.value)}
                                            className="font-bold"
                                        />
                                        <span className="text-xs text-muted-foreground">วัน</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">ถึงเกณฑ์ทำใบสั่งซื้อยาเติมคลัง</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">สต็อกเกิน Overstock (มากกว่า)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={30}
                                            value={settingValues['dos_overstock_days'] ?? '180'}
                                            onChange={(e) => handleSettingChange('dos_overstock_days', e.target.value)}
                                            className="font-bold"
                                        />
                                        <span className="text-xs text-muted-foreground">วัน</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">สต็อกค้างเกินไป ทุนจม</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">ประเมิน Dead Stock (ไม่เคลื่อนไหว)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={30}
                                            value={settingValues['dead_stock_days'] ?? '90'}
                                            onChange={(e) => handleSettingChange('dead_stock_days', e.target.value)}
                                            className="font-bold"
                                        />
                                        <span className="text-xs text-muted-foreground">วัน</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">จำนวนวันที่ไม่มีการใช้ยาเลย</p>
                                </div>
                            </div>

                            <hr className="border-border" />

                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Send className="h-5 w-5 text-sky-500" />
                                    การแจ้งเตือนผ่าน Telegram Bot อัตโนมัติ
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    ส่งรายงานสรุปยาเหลือน้อยและยาใกล้หมดอายุเข้ากลุ่ม Telegram งานคลังยาตามกำหนดเวลา
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="telegram_stock_alerts_enabled"
                                        checked={settingValues['telegram_stock_alerts_enabled'] === '1'}
                                        onChange={(e) => handleSettingChange('telegram_stock_alerts_enabled', e.target.checked ? '1' : '0')}
                                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <Label htmlFor="telegram_stock_alerts_enabled" className="text-sm font-semibold cursor-pointer">
                                        เปิดใช้งานการส่งแจ้งเตือนสต็อกอัตโนมัติผ่าน Telegram
                                    </Label>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Telegram Bot Token</Label>
                                        <Input
                                            type="password"
                                            placeholder="เช่น 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                                            value={settingValues['telegram_bot_token'] ?? ''}
                                            onChange={(e) => handleSettingChange('telegram_bot_token', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Chat ID / Group ID</Label>
                                        <Input
                                            placeholder="เช่น -1001234567890"
                                            value={settingValues['telegram_chat_id'] ?? ''}
                                            onChange={(e) => handleSettingChange('telegram_chat_id', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSavingSettings} className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white">
                                <Save className="mr-1.5 h-4 w-4" />
                                {isSavingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าเกณฑ์สต็อก'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* TAB 2: HA Patient Safety Standards */}
                {activeTab === 'ha' && (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                                    มาตรฐานยากลุ่มเสี่ยงสูง (High Alert Drugs - HAD)
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    ข้อกำหนดตามเกณฑ์มาตรฐานโรงพยาบาลและบริการสุขภาพ (HA) สำหรับยาที่มีความเสี่ยงสูง
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">ข้อความเตือนมาตรฐานสำหรับยา HAD</Label>
                                    <Input
                                        value={settingValues['had_default_warning'] ?? ''}
                                        onChange={(e) => handleSettingChange('had_default_warning', e.target.value)}
                                        placeholder="เช่น High Alert Drug: ยาความเสี่ยงสูง ต้องตรวจสอบซ้ำ (Double Check)"
                                    />
                                    <p className="text-[11px] text-muted-foreground">ข้อความนี้จะแสดงบนแถบสีแดงในหน้ารับเข้า, เบิกยา, บัตรคุมยา, และฉลากยา</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="had_double_check_required"
                                        checked={settingValues['had_double_check_required'] === '1'}
                                        onChange={(e) => handleSettingChange('had_double_check_required', e.target.checked ? '1' : '0')}
                                        className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                                    />
                                    <Label htmlFor="had_double_check_required" className="text-sm font-semibold cursor-pointer">
                                        บังคับระบบแจ้งเตือนให้มีผู้ตรวจสอบซ้ำ 2 คน (Double Check) เมื่อเบิกจ่ายยา HAD
                                    </Label>
                                </div>
                            </div>

                            <hr className="border-border" />

                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Snowflake className="h-5 w-5 text-sky-500" />
                                    มาตรฐานยาควบคุมอุณหภูมิ (Cold Chain Management)
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    ช่วงอุณหภูมิควบคุมสำหรับยาชีววัตถุ วัคซีน และยาที่ต้องเก็บในตู้เย็นหรือช่องแช่แข็ง
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">อุณหภูมิตู้เย็นยาแช่เย็นทั่วไป (Cold Chain)</Label>
                                    <Input
                                        value={settingValues['cold_chain_default_temp'] ?? '2-8°C'}
                                        onChange={(e) => handleSettingChange('cold_chain_default_temp', e.target.value)}
                                        placeholder="เช่น 2-8°C"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">อุณหภูมิตู้แช่แข็งยา (Freezer Storage)</Label>
                                    <Input
                                        value={settingValues['cold_chain_freezer_temp'] ?? '-20°C'}
                                        onChange={(e) => handleSettingChange('cold_chain_freezer_temp', e.target.value)}
                                        placeholder="เช่น -20°C หรือต่ำกว่า"
                                    />
                                </div>
                            </div>

                            <hr className="border-border" />

                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Flame className="h-5 w-5 text-purple-600" />
                                    มาตรฐานยาเสพติดและวัตถุออกฤทธิ์ (Narcotics & Psychotropics)
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    ข้อบังคับทางกฎหมายในการควบคุมคลังยาเสพติดให้โทษและวัตถุที่ออกฤทธิ์ต่อจิตและประสาท
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="narcotic_shift_count_required"
                                    checked={settingValues['narcotic_shift_count_required'] === '1'}
                                    onChange={(e) => handleSettingChange('narcotic_shift_count_required', e.target.checked ? '1' : '0')}
                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                <Label htmlFor="narcotic_shift_count_required" className="text-sm font-semibold cursor-pointer">
                                    เปิดระบบแจ้งเตือนตรวจนับยอดคงเหลือยาเสพติดทุกสิ้นกะ / สิ้นผลัดเวร
                                </Label>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSavingSettings} className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white">
                                <Save className="mr-1.5 h-4 w-4" />
                                {isSavingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่ามาตรฐาน HA'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* TAB 3: HOSxP Dispense & Sync Integration */}
                {activeTab === 'hosxp' && (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Database className="h-5 w-5 text-violet-600" />
                                    การเชื่อมต่อ HOSxP และการตัดจ่ายอัตโนมัติ
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    กำหนดห้องยาหลักที่ใช้ตัดสต็อก นโยบายเมื่อยาไม่พอ และช่วงข้อมูลที่ดึงจากตาราง opitemrece
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">ห้องยาหลักที่ใช้ตัดสต็อก (Default Pharmacy)</Label>
                                    <select
                                        value={settingValues['default_dispense_location_id'] ?? ''}
                                        onChange={(e) => handleSettingChange('default_dispense_location_id', e.target.value)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="">-- เลือกห้องยาหลัก --</option>
                                        {locations.filter((l) => l.type === 'pharmacy').map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name} ({loc.code})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-muted-foreground">สต็อกในห้องยานี้จะถูกตัดอัตโนมัติตามใบสั่งยา HOSxP</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">นโยบายเมื่อสต็อกในห้องยาไม่พอ (Insufficient Policy)</Label>
                                    <select
                                        value={settingValues['dispense_insufficient_policy'] ?? 'queue'}
                                        onChange={(e) => handleSettingChange('dispense_insufficient_policy', e.target.value)}
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option value="queue">เข้าคิวรอตัดใหม่ (Queue for Retry - แนะนำ)</option>
                                        <option value="block">บล็อกการตัดจ่ายและบันทึกข้อผิดพลาด (Block)</option>
                                        <option value="negative">ยอมให้สต็อกติดลบชั่วคราว (Allow Negative)</option>
                                    </select>
                                    <p className="text-[11px] text-muted-foreground">โหมด Queue จะช่วยให้กดปุ่ม Retry ได้ทันทีเมื่อเติมยา</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">จำนวนดึงใบสั่งยาสูงสุดต่อรอบ (Query Batch Limit)</Label>
                                    <Input
                                        type="number"
                                        min={500}
                                        max={20000}
                                        step={500}
                                        value={settingValues['hosxp_query_limit'] ?? '3000'}
                                        onChange={(e) => handleSettingChange('hosxp_query_limit', e.target.value)}
                                    />
                                    <p className="text-[11px] text-muted-foreground">จำกัดจำนวนแถวที่อ่านจาก HOSxP ป้องกันฐานข้อมูลทำงานหนัก</p>
                                </div>

                                <div className="flex items-center gap-3 pt-6">
                                    <input
                                        type="checkbox"
                                        id="auto_dispense_sync_enabled"
                                        checked={settingValues['auto_dispense_sync_enabled'] === '1'}
                                        onChange={(e) => handleSettingChange('auto_dispense_sync_enabled', e.target.checked ? '1' : '0')}
                                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <Label htmlFor="auto_dispense_sync_enabled" className="text-sm font-semibold cursor-pointer">
                                        เปิดระบบซิงก์ตัดจ่ายอัตโนมัติตาม Schedule (ทุก 5 นาที)
                                    </Label>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                                <div className="text-xs font-bold text-foreground">ขอบเขตแผนกที่นำมาตัดสต็อก (Department Scope)</div>
                                <div className="flex flex-wrap gap-6">
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settingValues['dispense_scope_opd'] === '1'}
                                            onChange={(e) => handleSettingChange('dispense_scope_opd', e.target.checked ? '1' : '0')}
                                            className="h-4 w-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span>ใบสั่งยาผู้ป่วยนอก (OPD)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settingValues['dispense_scope_ipd'] === '1'}
                                            onChange={(e) => handleSettingChange('dispense_scope_ipd', e.target.checked ? '1' : '0')}
                                            className="h-4 w-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span>ใบสั่งยาผู้ป่วยใน (IPD)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSavingSettings} className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white">
                                <Save className="mr-1.5 h-4 w-4" />
                                {isSavingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า HOSxP'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* TAB 4: Labels & Barcode Printing */}
                {activeTab === 'labels' && (
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-6">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Printer className="h-5 w-5 text-indigo-600" />
                                    การพิมพ์ฉลากยาและสติ๊กเกอร์บาร์โค้ด
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    กำหนดหัวเอกสาร รูปแบบเริ่มต้น และข้อมูลที่ต้องการให้พิมพ์ลงบนสติ๊กเกอร์ยา
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">ข้อความหัวสติ๊กเกอร์ (Hospital Header Text)</Label>
                                    <Input
                                        value={settingValues['hospital_label_header'] ?? 'โรงพยาบาลค่ายสุรสิงหนาท'}
                                        onChange={(e) => handleSettingChange('hospital_label_header', e.target.value)}
                                        placeholder="เช่น โรงพยาบาลค่ายสุรสิงหนาท..."
                                    />
                                    <p className="text-[11px] text-muted-foreground">แสดงเป็นแถวบนสุดของสติ๊กเกอร์ทุกดวง</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">รูปแบบสติ๊กเกอร์เริ่มต้น</Label>
                                        <select
                                            value={settingValues['default_label_format'] ?? 'thermal'}
                                            onChange={(e) => handleSettingChange('default_label_format', e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="thermal">ม้วนความร้อน (Thermal 50x30mm)</option>
                                            <option value="a4">สติ๊กเกอร์แผ่น A4 (3 คอลัมน์ x 8 แถว = 24 ดวง)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">คำนำหน้า QR Token ประจำ Lot</Label>
                                        <Input
                                            value={settingValues['barcode_qr_prefix'] ?? 'PHARMLOT:'}
                                            onChange={(e) => handleSettingChange('barcode_qr_prefix', e.target.value)}
                                            placeholder="เช่น PHARMLOT:"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                                    <div className="text-xs font-bold text-foreground">ข้อมูลพิเศษที่ต้องการพิมพ์บนสติ๊กเกอร์</div>
                                    <div className="flex flex-wrap gap-6">
                                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settingValues['show_had_on_label'] === '1'}
                                                onChange={(e) => handleSettingChange('show_had_on_label', e.target.checked ? '1' : '0')}
                                                className="h-4 w-4 rounded border-gray-300 text-rose-600"
                                            />
                                            <span>พิมพ์ป้ายเตือน HAD บนฉลากยาความเสี่ยงสูง</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settingValues['show_cold_chain_on_label'] === '1'}
                                                onChange={(e) => handleSettingChange('show_cold_chain_on_label', e.target.checked ? '1' : '0')}
                                                className="h-4 w-4 rounded border-gray-300 text-sky-600"
                                            />
                                            <span>พิมพ์อุณหภูมิควบคุมบนฉลากยาแช่เย็น (2-8°C)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSavingSettings} className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white">
                                <Save className="mr-1.5 h-4 w-4" />
                                {isSavingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าฉลากยา'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* TAB 5: Locations Management */}
                {activeTab === 'locations' && (
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-violet-600" />
                                        สถานที่จัดเก็บและคลังยา ({locations.length})
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        จัดการคลังใหญ่ คลังย่อย ห้องยา OPD/IPD หรือตู้พักยาประจำตึก
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => setIsAddLocationOpen(true)}
                                    className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    เพิ่มสถานที่จัดเก็บ
                                </Button>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-border">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">รหัส (Code)</th>
                                            <th className="px-4 py-3 font-semibold">ชื่อสถานที่ / คลัง</th>
                                            <th className="px-4 py-3 font-semibold">ประเภท</th>
                                            <th className="px-4 py-3 font-semibold text-center">จำนวน SKUs ในสต็อก</th>
                                            <th className="px-4 py-3 font-semibold text-center">ลำดับ</th>
                                            <th className="px-4 py-3 font-semibold text-center">สถานะ</th>
                                            <th className="px-4 py-3 font-semibold text-center">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {locations.map((loc) => (
                                            <tr key={loc.id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-mono font-bold text-xs">{loc.code}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-foreground">{loc.name}</div>
                                                    {loc.notes && <div className="text-xs text-muted-foreground">{loc.notes}</div>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                                        loc.type === 'warehouse'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                    }`}>
                                                        {loc.type === 'warehouse' ? 'คลังยาใหญ่' : 'ห้องยา / จุดจ่าย'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-foreground">
                                                    {loc.balances_count ?? 0}
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono text-xs">{loc.sort_order}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {loc.is_active ? (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                            เปิดใช้งาน
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                            ปิด
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditingLocation(loc)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeletingLocation(loc)}
                                                            disabled={(loc.balances_count ?? 0) > 0}
                                                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                                                            title={(loc.balances_count ?? 0) > 0 ? 'มียาคงเหลือในคลัง ไม่สามารถลบได้' : 'ลบสถานที่'}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 6: Packaging Types Management */}
                {activeTab === 'packaging' && (
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <Layers className="h-5 w-5 text-violet-600" />
                                        ประเภทบรรจุภัณฑ์ยา ({packagingTypes.length})
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        ประเภทบรรจุภัณฑ์มาตรฐานที่ใช้สร้างโครงสร้างหลายชั้น (กล่อง, แผง, ขวด, ลัง, ซอง ฯลฯ)
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => setIsAddPackagingOpen(true)}
                                    className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    เพิ่มประเภทบรรจุภัณฑ์
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                {packagingTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        className={`flex flex-col justify-between rounded-2xl border p-3 text-sm transition ${
                                            type.is_active ? 'border-border bg-card hover:border-violet-300' : 'border-dashed border-border bg-muted/20 opacity-60'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-[10px] text-muted-foreground uppercase">{type.code}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingPackaging(type)}
                                                    className="text-muted-foreground hover:text-violet-700"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <div className="font-bold text-foreground text-base">{type.name}</div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                                            <span>ลำดับ: {type.sort_order}</span>
                                            <span className={type.is_active ? 'text-emerald-600' : 'text-slate-400'}>
                                                {type.is_active ? 'ใช้งาน' : 'ปิด'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 7: Stock Import via Excel */}
                {activeTab === 'stock_import' && (
                    <div className="space-y-6">
                        {/* Success Notification Banner */}
                        {commitSuccess && (
                            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl bg-emerald-500 p-2.5 text-white shadow-sm">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                                                นำเข้าสต็อกสำเร็จเรียบร้อย!
                                            </h3>
                                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                                {commitSuccess.message} — ได้สร้าง Lot พร้อม QR Code สำหรับสแกนหรือพิมพ์ฉลากแล้ว
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => router.visit(route('pharmacy.inventory.stock'))}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl text-xs gap-1.5"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            ดูรายงานสต็อกคงเหลือ
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCommitSuccess(null)}
                                            className="rounded-xl text-xs"
                                        >
                                            ปิดการแจ้งเตือน
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Alert */}
                        {uploadError && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/40">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                                    <div className="space-y-1 flex-1">
                                        <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">เกิดข้อผิดพลาด</h4>
                                        <p className="text-xs text-rose-700 dark:text-rose-300">{uploadError}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setUploadError(null)}
                                        className="text-rose-500 hover:text-rose-700 p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Grid: 2 Steps (Step 1 Download Template & Step 2 Upload File) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* STEP 1: Download Template */}
                            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-5 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 font-bold text-base shadow-xs">
                                            1
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                                <Download className="h-4 w-4 text-violet-600" />
                                                ดาวน์โหลด Template Excel
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                ดึงรายการยาและเวชภัณฑ์จากระบบและ HOSxP ใส่ลงไฟล์ให้อัตโนมัติ
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 text-xs text-violet-900 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-200 space-y-2">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                                            ระบบเตรียมข้อมูลให้พร้อมแล้ว
                                        </div>
                                        <p className="leading-relaxed text-muted-foreground">
                                            ใน Template จะมีรหัส <code className="text-violet-700 dark:text-violet-300">icode</code>, ชื่อยา/เวชภัณฑ์มิใช่ยา, ความแรง, หน่วยนับ, คลังจัดเก็บ และราคาต้นทุนดึงจาก HOSxP ให้อัตโนมัติ 
                                            ท่านเพียงเปิดไฟล์แล้วกรอกเฉพาะ <b>"จำนวนคงเหลือจริง (คอลัมน์ H)"</b> สำหรับหมายเลข Lot สามารถเว้นว่างไว้เพื่อสแกนเข้าภายหลังได้ และระบุขั้นต่ำที่ต้องสั่งซื้อ (คอลัมน์ L) ตามต้องการ
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">สถานที่จัดเก็บ / คลังที่ต้องการตรวจนับ</Label>
                                            <select
                                                value={templateLocationId}
                                                onChange={(e) => setTemplateLocationId(Number(e.target.value))}
                                                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                                            >
                                                {locations.map((loc) => (
                                                    <option key={loc.id} value={loc.id}>
                                                        {loc.name} ({loc.code}) — {loc.type === 'warehouse' ? 'คลังยาใหญ่' : 'ห้องยา'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">ขอบเขตหมวดหมู่รายการ</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setImportScope('all')}
                                                    className={`rounded-xl border p-2.5 text-center text-xs font-medium transition ${
                                                        importScope === 'all'
                                                            ? 'border-violet-600 bg-violet-50 text-violet-700 font-bold dark:bg-violet-950/40 dark:text-violet-300'
                                                            : 'border-border hover:bg-muted/50 text-muted-foreground'
                                                    }`}
                                                >
                                                    ทั้งหมด (ยา + เวชภัณฑ์)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setImportScope('drug')}
                                                    className={`rounded-xl border p-2.5 text-center text-xs font-medium transition ${
                                                        importScope === 'drug'
                                                            ? 'border-violet-600 bg-violet-50 text-violet-700 font-bold dark:bg-violet-950/40 dark:text-violet-300'
                                                            : 'border-border hover:bg-muted/50 text-muted-foreground'
                                                    }`}
                                                >
                                                    เฉพาะยา (Drugs)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setImportScope('nondrug')}
                                                    className={`rounded-xl border p-2.5 text-center text-xs font-medium transition ${
                                                        importScope === 'nondrug'
                                                            ? 'border-violet-600 bg-violet-50 text-violet-700 font-bold dark:bg-violet-950/40 dark:text-violet-300'
                                                            : 'border-border hover:bg-muted/50 text-muted-foreground'
                                                    }`}
                                                >
                                                    เวชภัณฑ์มิใช่ยา (05)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="w-full bg-violet-700 hover:bg-violet-800 text-white rounded-xl py-5 shadow-xs font-semibold text-sm gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    ดาวน์โหลดแบบฟอร์ม Template Excel (.xlsx)
                                </Button>
                            </div>

                            {/* STEP 2: Upload & Preview */}
                            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-5 flex flex-col justify-between">
                                <form onSubmit={handleUploadPreview} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-base shadow-xs">
                                            2
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                                <Upload className="h-4 w-4 text-indigo-600" />
                                                อัปโหลดไฟล์และตรวจสอบข้อมูล
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                เลือกไฟล์ Excel ที่กรอกยอดตรวจนับแล้ว เพื่อพรีวิวก่อนบันทึกจริง
                                            </p>
                                        </div>
                                    </div>

                                    {/* File Input Box */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">ไฟล์ Excel (.xlsx, .xls) *</Label>
                                        <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-5 text-center hover:border-indigo-400 transition cursor-pointer">
                                            <FileSpreadsheet className="h-8 w-8 text-indigo-500 mb-2" />
                                            {importFile ? (
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-foreground">{importFile.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        ขนาด {(importFile.size / 1024).toFixed(1)} KB
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-foreground">
                                                        คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">รองรับไฟล์นามสกุล .xlsx หรือ .xls (ขนาดไม่เกิน 20MB)</p>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) setImportFile(f);
                                                }}
                                                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Import Mode Radio */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold">โหมดการบันทึกสต็อก (Import Mode)</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <label
                                                className={`flex items-start gap-2.5 rounded-2xl border p-3 cursor-pointer transition ${
                                                    importMode === 'replace'
                                                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                                                        : 'border-border hover:bg-muted/40'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="import_mode"
                                                    value="replace"
                                                    checked={importMode === 'replace'}
                                                    onChange={() => setImportMode('replace')}
                                                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="space-y-0.5 text-xs">
                                                    <div className="font-bold text-foreground">แทนที่ยอดคงเหลือ (Replace)</div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        ปรับยอดคงเหลือในคลังให้ตรงกับจำนวนที่ตรวจนับได้จริง (แนะนำสำหรับนับยอดยกมา)
                                                    </p>
                                                </div>
                                            </label>

                                            <label
                                                className={`flex items-start gap-2.5 rounded-2xl border p-3 cursor-pointer transition ${
                                                    importMode === 'add'
                                                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                                                        : 'border-border hover:bg-muted/40'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="import_mode"
                                                    value="add"
                                                    checked={importMode === 'add'}
                                                    onChange={() => setImportMode('add')}
                                                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="space-y-0.5 text-xs">
                                                    <div className="font-bold text-foreground">บวกเพิ่มจากสต็อกเดิม (Add)</div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                        นำจำนวนในไฟล์ไปบวกเพิ่มจากยอดคงเหลือปัจจุบัน
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Fallback Location */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">คลังสำรอง (กรณีในไฟล์ไม่ได้ระบุรหัสคลัง)</Label>
                                        <select
                                            value={importLocationId}
                                            onChange={(e) => setImportLocationId(Number(e.target.value))}
                                            className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {locations.map((loc) => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name} ({loc.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={!importFile || isPreviewing}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-5 shadow-xs font-semibold text-sm gap-2 disabled:opacity-50"
                                    >
                                        {isPreviewing ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                กำลังอ่านและตรวจสอบไฟล์ Excel...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="h-4 w-4" />
                                                อ่านและตรวจสอบไฟล์ (Preview & Validate)
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </div>

                        {/* STEP 3: Preview & Confirm Commit */}
                        {previewData && (
                            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                                    <div className="space-y-1">
                                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                            ผลการตรวจสอบไฟล์: {previewData.filename}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            โปรดตรวจสอบความถูกต้องของรายการและยอดตรวจนับก่อนกดยืนยันบันทึกจริง
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setPreviewData(null)}
                                            className="rounded-xl text-xs"
                                        >
                                            ยกเลิก
                                        </Button>
                                        <Button
                                            type="button"
                                            disabled={isCommitting || previewData.stats.valid_count === 0}
                                            onClick={handleCommitImport}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5 shadow-sm font-bold"
                                        >
                                            {isCommitting ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                    กำลังบันทึกนำเข้า...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="h-4 w-4" />
                                                    ยืนยันนำเข้าสต็อก {previewData.stats.valid_count} รายการ (โหมด: {importMode === 'replace' ? 'แทนที่' : 'บวกเพิ่ม'})
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* KPI Summary Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-1">
                                        <div className="text-[11px] text-muted-foreground font-medium">รายการในไฟล์ทั้งหมด</div>
                                        <div className="text-xl font-bold text-foreground">{previewData.stats.total_rows.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1 dark:border-emerald-950 dark:bg-emerald-950/20">
                                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">พร้อมนำเข้า</div>
                                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{previewData.stats.valid_count.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-1 dark:border-slate-800 dark:bg-slate-900/20">
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">ข้าม (เว้นว่างไม่นับ)</div>
                                        <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{previewData.stats.skipped_count.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-1 dark:border-rose-950 dark:bg-rose-950/20">
                                        <div className="text-[11px] text-rose-700 dark:text-rose-300 font-bold">ข้อผิดพลาด</div>
                                        <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{previewData.stats.error_count.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1 dark:border-indigo-950 dark:bg-indigo-950/20">
                                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold">ยอดตรวจนับรวม</div>
                                        <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{previewData.stats.total_qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-1 dark:border-amber-950 dark:bg-amber-950/20">
                                        <div className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">มูลค่าสต็อกรวม (บาท)</div>
                                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">฿{previewData.stats.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </div>
                                </div>

                                {/* Errors Table if any */}
                                {previewData.errors.length > 0 && (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-2 dark:border-rose-950 dark:bg-rose-950/20">
                                        <h4 className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                                            <AlertTriangle className="h-4 w-4" />
                                            รายการที่พบข้อผิดพลาด ({previewData.errors.length} รายการ — จะไม่ถูกนำเข้า)
                                        </h4>
                                        <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                                            {previewData.errors.map((err, i) => (
                                                <div key={i} className="flex items-center justify-between py-1 border-b border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
                                                    <span>แถวที่ {err.row}: <b>{err.name || err.icode}</b></span>
                                                    <span className="text-rose-600 dark:text-rose-400 font-medium">{err.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Preview Items Table */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>ตัวอย่างรายการที่จะนำเข้า (แสดง {previewData.preview_items.length} จากทั้งหมด {previewData.stats.valid_count} รายการ)</span>
                                        <span className="font-medium text-emerald-600">ทุก Lot จะได้รับ QR Code อัตโนมัติ</span>
                                    </div>

                                    <div className="overflow-x-auto rounded-2xl border border-border">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-muted/50 text-muted-foreground">
                                                <tr>
                                                    <th className="py-2.5 px-3">แถว</th>
                                                    <th className="py-2.5 px-3">รหัส icode</th>
                                                    <th className="py-2.5 px-3">ชื่อรายการยา / เวชภัณฑ์</th>
                                                    <th className="py-2.5 px-3">ประเภท</th>
                                                    <th className="py-2.5 px-3 text-right">จำนวนคงเหลือ</th>
                                                    <th className="py-2.5 px-3">หน่วย</th>
                                                    <th className="py-2.5 px-3">หมายเลข Lot</th>
                                                    <th className="py-2.5 px-3">วันหมดอายุ</th>
                                                    <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                                                    <th className="py-2.5 px-3 text-right">มูลค่ารวม</th>
                                                    <th className="py-2.5 px-3 text-right">ขั้นต่ำสั่งซื้อ</th>
                                                    <th className="py-2.5 px-3">คลัง</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {previewData.preview_items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-muted/30 transition">
                                                        <td className="py-2 px-3 text-muted-foreground font-mono">{item.row}</td>
                                                        <td className="py-2 px-3 font-mono font-bold text-violet-700 dark:text-violet-400">{item.icode}</td>
                                                        <td className="py-2 px-3 font-medium text-foreground max-w-[240px] truncate" title={item.item_name}>
                                                            {item.item_name}
                                                            {item.strength && <span className="ml-1 text-[11px] text-muted-foreground">({item.strength})</span>}
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                                item.item_type === 'nondrug'
                                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                            }`}>
                                                                {item.item_type_label}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                                                            {item.counted_qty.toLocaleString()}
                                                        </td>
                                                        <td className="py-2 px-3 text-muted-foreground">{item.unit}</td>
                                                        <td className="py-2 px-3 font-mono text-[11px]">
                                                            {item.lot_no || <span className="text-muted-foreground italic">(ไม่ระบุ)</span>}
                                                        </td>
                                                        <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                                                            {item.expires_at || '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                                                            {item.unit_price !== null ? `฿${item.unit_price.toFixed(2)}` : '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-mono font-medium text-foreground">
                                                            {item.line_value > 0 ? `฿${item.line_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                                                            {item.reorder_level !== null ? item.reorder_level.toLocaleString() : '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-muted-foreground text-[11px]">
                                                            {item.location_name}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: เพิ่มสถานที่ใหม่ */}
            <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>เพิ่มสถานที่จัดเก็บ / คลังยา</DialogTitle>
                        <DialogDescription>ระบุรหัสและชื่อสถานที่จัดเก็บยา</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleStoreLocation} className="space-y-3">
                        <div className="space-y-1">
                            <Label>รหัสสถานที่ (Code) *</Label>
                            <Input name="code" placeholder="เช่น WH-02 หรือ PHARM-OPD" required />
                        </div>
                        <div className="space-y-1">
                            <Label>ชื่อสถานที่จัดเก็บ *</Label>
                            <Input name="name" placeholder="เช่น คลังยาชั้น 2 หรือ ห้องยาผู้ป่วยนอก" required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>ประเภท *</Label>
                                <select name="type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                    <option value="warehouse">คลังยาใหญ่ (Warehouse)</option>
                                    <option value="pharmacy">ห้องยา / จุดจ่าย (Pharmacy)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>ลำดับแสดงผล</Label>
                                <Input name="sort_order" type="number" min={0} defaultValue={0} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>หมายเหตุ</Label>
                            <Input name="notes" placeholder="เช่น บริเวณตึกผู้ป่วยนอก ชั้น 1" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddLocationOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" className="bg-violet-700 text-white">บันทึกสถานที่</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: แก้ไขสถานที่ */}
            <Dialog open={Boolean(editingLocation)} onOpenChange={(open) => !open && setEditingLocation(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>แก้ไขสถานที่จัดเก็บ</DialogTitle>
                    </DialogHeader>
                    {editingLocation && (
                        <form onSubmit={handleUpdateLocation} className="space-y-3">
                            <div className="space-y-1">
                                <Label>รหัสสถานที่ (Code) *</Label>
                                <Input name="code" defaultValue={editingLocation.code} required />
                            </div>
                            <div className="space-y-1">
                                <Label>ชื่อสถานที่จัดเก็บ *</Label>
                                <Input name="name" defaultValue={editingLocation.name} required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>ประเภท *</Label>
                                    <select name="type" defaultValue={editingLocation.type} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                        <option value="warehouse">คลังยาใหญ่</option>
                                        <option value="pharmacy">ห้องยา / จุดจ่าย</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>ลำดับ</Label>
                                    <Input name="sort_order" type="number" min={0} defaultValue={editingLocation.sort_order} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>สถานะการใช้งาน</Label>
                                <select name="is_active" defaultValue={editingLocation.is_active ? '1' : '0'} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                    <option value="1">เปิดใช้งาน</option>
                                    <option value="0">ปิดการใช้งาน</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>หมายเหตุ</Label>
                                <Input name="notes" defaultValue={editingLocation.notes ?? ''} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingLocation(null)}>ยกเลิก</Button>
                                <Button type="submit" className="bg-violet-700 text-white">บันทึกการแก้ไข</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: ยืนยันลบสถานที่ */}
            <Dialog open={Boolean(deletingLocation)} onOpenChange={(open) => !open && setDeletingLocation(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-rose-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            ยืนยันการลบสถานที่จัดเก็บ
                        </DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบสถานที่ <b>{deletingLocation?.name}</b> ({deletingLocation?.code})?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeletingLocation(null)}>ยกเลิก</Button>
                        <Button type="button" variant="destructive" onClick={handleDeleteLocation}>ยืนยันลบ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: เพิ่มประเภทบรรจุภัณฑ์ */}
            <Dialog open={isAddPackagingOpen} onOpenChange={setIsAddPackagingOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>เพิ่มประเภทบรรจุภัณฑ์ใหม่</DialogTitle>
                        <DialogDescription>ระบุชื่อและรหัสประเภทบรรจุภัณฑ์</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleStorePackaging} className="space-y-3">
                        <div className="space-y-1">
                            <Label>ชื่อประเภทบรรจุภัณฑ์ (ไทย) *</Label>
                            <Input name="name" placeholder="เช่น ซองฟอยล์ หรือ ตลับยา" required />
                        </div>
                        <div className="space-y-1">
                            <Label>รหัสประเภท (อังกฤษ/ตัวเลข) *</Label>
                            <Input name="code" placeholder="เช่น foil_pouch หรือ pill_box" required />
                        </div>
                        <div className="space-y-1">
                            <Label>ลำดับแสดงผล</Label>
                            <Input name="sort_order" type="number" min={0} defaultValue={200} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddPackagingOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" className="bg-violet-700 text-white">บันทึกประเภท</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: แก้ไขประเภทบรรจุภัณฑ์ */}
            <Dialog open={Boolean(editingPackaging)} onOpenChange={(open) => !open && setEditingPackaging(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>แก้ไขประเภทบรรจุภัณฑ์</DialogTitle>
                    </DialogHeader>
                    {editingPackaging && (
                        <form onSubmit={handleUpdatePackaging} className="space-y-3">
                            <div className="space-y-1">
                                <Label>ชื่อประเภทบรรจุภัณฑ์ (ไทย) *</Label>
                                <Input name="name" defaultValue={editingPackaging.name} required />
                            </div>
                            <div className="space-y-1">
                                <Label>รหัสประเภท (อังกฤษ/ตัวเลข) *</Label>
                                <Input name="code" defaultValue={editingPackaging.code} required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>ลำดับ</Label>
                                    <Input name="sort_order" type="number" min={0} defaultValue={editingPackaging.sort_order} />
                                </div>
                                <div className="space-y-1">
                                    <Label>สถานะ</Label>
                                    <select name="is_active" defaultValue={editingPackaging.is_active ? '1' : '0'} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                        <option value="1">เปิดใช้งาน</option>
                                        <option value="0">ปิดการใช้งาน</option>
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingPackaging(null)}>ยกเลิก</Button>
                                <Button type="submit" className="bg-violet-700 text-white">บันทึกการแก้ไข</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
