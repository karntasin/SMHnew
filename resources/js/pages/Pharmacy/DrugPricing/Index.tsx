import React, { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { cn } from '@/lib/utils';
import {
    Calculator,
    Download,
    Settings,
    TrendingDown,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Search,
    Filter,
    Percent,
    DollarSign,
    BarChart3,
    Layers,
    Info,
    RefreshCw,
    X,
    Plus,
    Trash2,
    Save,
    RotateCcw,
    Sparkles,
    ShieldAlert,
    Eye,
} from 'lucide-react';
import DrugDetailModal, { DrugDetailData } from './DrugDetailModal';
import GroupDrilldownModal from './GroupDrilldownModal';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

export interface DrugPricingTier {
    id?: number;
    tier_order: number;
    name: string;
    min_cost: number;
    max_cost: number | null;
    calc_type: 'fixed' | 'markup_excess' | 'multiplier_cost';
    base_price: number;
    base_cost: number;
    multiplier_percent: number;
    description?: string | null;
    is_active?: boolean;
}

export interface CatalogSummary {
    total_drugs: number;
    ed_count: number;
    ned_count: number;
    over_tier_count: number;
    under_tier_count: number;
    match_tier_count: number;
    no_cost_count: number;
    avg_cost: number;
    avg_price: number;
    avg_markup: number;
}

export interface CatalogItem {
    icode: string;
    name: string;
    generic_name: string | null;
    strength: string | null;
    units: string | null;
    dosageform: string | null;
    drugaccount: string | null;
    is_ed: boolean;
    unitcost: number;
    unitprice: number;
    tier_price: number;
    margin_baht: number;
    margin_percent: number;
    diff_vs_tier: number;
    status: 'over' | 'under' | 'match' | 'no_cost';
    fy_qty: number;
    fy_revenue_actual: number;
}

export interface ScenarioData {
    label: string;
    revenue: number;
    cost: number;
    margin: number;
    margin_percent: number;
}

export interface FiscalYearProjections {
    fiscal_year: number;
    period_label: string;
    discount: {
        percent: number;
        scope: string;
    };
    scenarios: {
        historical_actual: ScenarioData;
        current_price: ScenarioData;
        tier_w111: ScenarioData;
        discounted: ScenarioData;
    };
    impact: {
        diff_current_vs_actual: { baht: number; percent: number };
        diff_w111_vs_current: { baht: number; percent: number };
        diff_discount_vs_current: { baht: number; percent: number };
        diff_discount_vs_actual: { baht: number; percent: number };
    };
    account_stats: {
        name: string;
        count: number;
        revenue_actual: number;
        revenue_current: number;
        revenue_w111: number;
        revenue_discounted: number;
    }[];
    markup_distribution: {
        range: string;
        label: string;
        count: number;
        percent: number;
    }[];
    top_affected_drugs: {
        icode: string;
        name: string;
        units: string;
        is_ed: boolean;
        qty: number;
        price_before: number;
        price_after: number;
        revenue_before: number;
        revenue_after: number;
        diff_baht: number;
    }[];
    top_revenue_drugs: {
        icode: string;
        name: string;
        units: string;
        is_ed: boolean;
        qty: number;
        unitcost: number;
        unitprice: number;
        revenue_current: number;
        revenue_actual: number;
    }[];
    total_dispensed_items: number;
    total_qty_dispensed: number;
}

interface Props {
    available_years: { year: number; label: string; is_current: boolean; is_previous: boolean }[];
    selected_year: number;
    discount_percent: number;
    discount_scope: string;
    round_price: boolean;
    tiers: DrugPricingTier[];
    catalog_summary: CatalogSummary;
    catalog_items: CatalogItem[];
    projections: FiscalYearProjections;
}

export default function DrugPricingIndex({
    available_years = [],
    selected_year,
    discount_percent = 0,
    discount_scope = 'all',
    round_price = true,
    tiers = [],
    catalog_summary,
    catalog_items = [],
    projections,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'over' | 'match' | 'under' | 'ed' | 'ned' | 'active_fy'>('all');
    const [discountSlider, setDiscountSlider] = useState<number>(discount_percent);
    const [scopeSelector, setScopeSelector] = useState<string>(discount_scope);
    const [roundToggle, setRoundToggle] = useState<boolean>(round_price);
    const [isTierModalOpen, setIsTierModalOpen] = useState(false);
    const [editableTiers, setEditableTiers] = useState<DrugPricingTier[]>(tiers);
    const [isSavingTiers, setIsSavingTiers] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'drugs' | 'top'>('overview');
    const [chartViewMode, setChartViewMode] = useState<'stacked' | 'grouped'>('stacked');

    useEffect(() => {
        setDiscountSlider(discount_percent);
    }, [discount_percent]);

    useEffect(() => {
        setScopeSelector(discount_scope);
    }, [discount_scope]);

    useEffect(() => {
        setRoundToggle(round_price);
    }, [round_price]);

    // Drug Detail Drilldown Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailModalLoading, setDetailModalLoading] = useState(false);
    const [detailModalData, setDetailModalData] = useState<DrugDetailData | null>(null);

    // Group Summary Drilldown Modal State (สำหรับกดดูสรุปรายการยาของกลุ่มนั้นๆ เช่น ต่ำกว่าเกณฑ์ ว.111)
    const [groupModalState, setGroupModalState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        tone: 'rose' | 'amber' | 'emerald' | 'slate' | 'cyan' | 'teal';
        filterType: 'over' | 'under' | 'match' | 'no_cost' | 'ed' | 'ned' | 'active_fy';
    }>({
        isOpen: false,
        title: '',
        description: '',
        tone: 'amber',
        filterType: 'under',
    });

    const openGroupModal = (
        filterType: 'over' | 'under' | 'match' | 'no_cost' | 'ed' | 'ned' | 'active_fy',
        title: string,
        description: string,
        tone: 'rose' | 'amber' | 'emerald' | 'slate' | 'cyan' | 'teal' = 'teal'
    ) => {
        setGroupModalState({
            isOpen: true,
            title,
            description,
            tone,
            filterType,
        });
    };

    const groupModalItems = useMemo(() => {
        const ft = groupModalState.filterType;
        return catalog_items.filter((item) => {
            if (ft === 'over') return item.status === 'over';
            if (ft === 'under') return item.status === 'under';
            if (ft === 'match') return item.status === 'match';
            if (ft === 'no_cost') return item.status === 'no_cost';
            if (ft === 'ed') return item.is_ed || !(item as any).is_ned;
            if (ft === 'ned') return !item.is_ed || (item as any).is_ned;
            if (ft === 'active_fy') return (item.fy_qty ?? 0) > 0;
            return true;
        });
    }, [catalog_items, groupModalState.filterType]);

    const openDrugDetail = async (icode: string) => {
        setIsDetailModalOpen(true);
        setDetailModalLoading(true);
        setDetailModalData(null);

        try {
            const url = new URL(route('pharmacy.pricing.drug-detail'), window.location.origin);
            url.searchParams.set('icode', icode);
            url.searchParams.set('fy', String(selected_year));
            url.searchParams.set('discount', String(discountSlider));
            url.searchParams.set('scope', scopeSelector);
            url.searchParams.set('round', roundToggle ? '1' : '0');

            const res = await fetch(url.toString(), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!res.ok) {
                throw new Error('Failed to fetch drug detail');
            }

            const json = await res.json();
            setDetailModalData(json);
        } catch (err) {
            console.error('Error fetching drug detail:', err);
        } finally {
            setDetailModalLoading(false);
        }
    };

    // Quick formatting helpers
    const formatNumber = (num: number, decimals = 2) => {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(num);
    };

    const formatBaht = (num: number) => `฿${formatNumber(num, 2)}`;

    // Handle filter / query changes
    const applySimulation = (newDiscount: number, newScope: string, newRound: boolean) => {
        router.get(
            route('pharmacy.pricing.index'),
            {
                fy: selected_year,
                discount: newDiscount,
                scope: newScope,
                round: newRound ? 1 : 0,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleYearChange = (year: number) => {
        router.get(
            route('pharmacy.pricing.index'),
            {
                fy: year,
                discount: discountSlider,
                scope: scopeSelector,
                round: roundToggle ? 1 : 0,
            },
            {
                preserveScroll: true,
            }
        );
    };

    const handleExportExcel = () => {
        window.location.href = route('pharmacy.pricing.export', {
            fy: selected_year,
            discount: discountSlider,
            scope: scopeSelector,
            round: roundToggle ? 1 : 0,
        });
    };

    // Filter catalog items
    const filteredDrugs = useMemo(() => {
        return catalog_items.filter((item) => {
            const matchesSearch =
                !searchTerm ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.generic_name && item.generic_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                item.icode.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === 'all') return true;
            if (statusFilter === 'over') return item.status === 'over';
            if (statusFilter === 'match') return item.status === 'match';
            if (statusFilter === 'under') return item.status === 'under';
            if (statusFilter === 'no_cost') return item.status === 'no_cost';
            if (statusFilter === 'ed') return item.is_ed || !(item as any).is_ned;
            if (statusFilter === 'ned') return !item.is_ed || (item as any).is_ned;
            if (statusFilter === 'active_fy') return (item.fy_qty ?? 0) > 0;

            return true;
        });
    }, [catalog_items, searchTerm, statusFilter]);

    // Save Tier Changes
    const handleSaveTiers = () => {
        setIsSavingTiers(true);
        router.post(
            route('pharmacy.pricing.tiers.save'),
            { tiers: editableTiers },
            {
                onSuccess: () => {
                    setIsTierModalOpen(false);
                    setIsSavingTiers(false);
                },
                onError: () => {
                    setIsSavingTiers(false);
                },
            }
        );
    };

    // Reset Tiers to Default
    const handleResetTiers = () => {
        if (!confirm('ยืนยันคืนค่าเกณฑ์ราคา ว.111 เป็นค่ามาตรฐานกระทรวง?')) return;
        setIsSavingTiers(true);
        router.post(
            route('pharmacy.pricing.tiers.reset'),
            {},
            {
                onSuccess: () => {
                    setIsTierModalOpen(false);
                    setIsSavingTiers(false);
                },
                onError: () => {
                    setIsSavingTiers(false);
                },
            }
        );
    };

    // Tier editing helpers
    const handleAddTierRow = () => {
        const nextOrder = editableTiers.length + 1;
        setEditableTiers([
            ...editableTiers,
            {
                tier_order: nextOrder,
                name: `ช่วงราคาใหม่ #${nextOrder}`,
                min_cost: 0,
                max_cost: null,
                calc_type: 'markup_excess',
                base_price: 0,
                base_cost: 0,
                multiplier_percent: 100,
                description: '',
                is_active: true,
            },
        ]);
    };

    const handleRemoveTierRow = (index: number) => {
        setEditableTiers(editableTiers.filter((_, i) => i !== index));
    };

    const handleUpdateTierField = (index: number, field: keyof DrugPricingTier, val: any) => {
        const updated = [...editableTiers];
        updated[index] = { ...updated[index], [field]: val };
        setEditableTiers(updated);
    };

    // Safe fallbacks for scenarios & impact
    const scenarios = projections?.scenarios || {};
    const historicalActual = scenarios.historical_actual || (scenarios as any).actual || {
        label: '1. รายได้จริงปีงบก่อนหน้า',
        revenue: 0,
        cost: 0,
        margin: 0,
        margin_percent: 0,
    };
    const currentPrice = scenarios.current_price || (scenarios as any).current || {
        label: '2. ประมาณการจากราคาปัจจุบัน',
        revenue: 0,
        cost: 0,
        margin: 0,
        margin_percent: 0,
    };
    const tierW111 = scenarios.tier_w111 || (scenarios as any).tier_rule || {
        label: '3. ประมาณการตามเกณฑ์ ว.111',
        revenue: 0,
        cost: 0,
        margin: 0,
        margin_percent: 0,
    };
    const discounted = scenarios.discounted || {
        label: `4. จำลองลด ${discountSlider}%`,
        revenue: 0,
        cost: 0,
        margin: 0,
        margin_percent: 0,
    };

    const impact = projections?.impact || {
        diff_current_vs_actual: { baht: 0, percent: 0 },
        diff_w111_vs_current: { baht: 0, percent: 0 },
        diff_discount_vs_current: { baht: 0, percent: 0 },
        diff_discount_vs_actual: { baht: 0, percent: 0 },
    };

    // Chart data preparation: 4 Scenarios with rich metadata for both Stacked & Grouped views
    const chartScenarios = [
        {
            key: 'actual',
            name: '1. จริงปีงบก่อน',
            shortName: 'จริงปีงบก่อน',
            fullName: '1. รายได้จริงปีงบก่อนหน้า',
            badge: `ปีงบ ${selected_year}`,
            รายได้: historicalActual.revenue ?? 0,
            ต้นทุน: historicalActual.cost ?? 0,
            กำไรขั้นต้น: historicalActual.margin ?? 0,
            marginPercent: historicalActual.margin_percent ?? 0,
            deltaBaht: null,
            deltaPercent: null,
            deltaLabel: '',
            themeColor: '#64748b', // Slate
            bgClass: 'bg-slate-50',
            borderClass: 'border-slate-200',
            textClass: 'text-slate-800',
        },
        {
            key: 'current',
            name: '2. ราคาปัจจุบัน',
            shortName: 'ราคาปัจจุบัน',
            fullName: '2. ประมาณการตามราคาขายปัจจุบัน',
            badge: 'ฐานเปรียบเทียบ',
            รายได้: currentPrice.revenue ?? 0,
            ต้นทุน: currentPrice.cost ?? 0,
            กำไรขั้นต้น: currentPrice.margin ?? 0,
            marginPercent: currentPrice.margin_percent ?? 0,
            deltaBaht: impact.diff_current_vs_actual.baht,
            deltaPercent: impact.diff_current_vs_actual.percent,
            deltaLabel: 'เทียบจริงปีก่อน',
            themeColor: '#0284c7', // Sky
            bgClass: 'bg-sky-50/50',
            borderClass: 'border-sky-200',
            textClass: 'text-sky-900',
        },
        {
            key: 'tier_w111',
            name: '3. เกณฑ์ ว.111',
            shortName: 'เกณฑ์ ว.111',
            fullName: '3. ประมาณการตามเกณฑ์ ว.111 / ว.177',
            badge: 'ระเบียบกระทรวง',
            รายได้: tierW111.revenue ?? 0,
            ต้นทุน: tierW111.cost ?? 0,
            กำไรขั้นต้น: tierW111.margin ?? 0,
            marginPercent: tierW111.margin_percent ?? 0,
            deltaBaht: impact.diff_w111_vs_current.baht,
            deltaPercent: impact.diff_w111_vs_current.percent,
            deltaLabel: 'เทียบราคาปัจจุบัน',
            themeColor: '#0d9488', // Teal
            bgClass: 'bg-teal-50/50',
            borderClass: 'border-teal-200',
            textClass: 'text-teal-900',
        },
        {
            key: 'discounted',
            name: `4. จำลองลด ${discountSlider}%`,
            shortName: `จำลองลด ${discountSlider}%`,
            fullName: `4. ประมาณการหลังจำลองลด ${discountSlider}%`,
            badge: `ส่วนลด ${discountSlider}%`,
            รายได้: discounted.revenue ?? 0,
            ต้นทุน: discounted.cost ?? 0,
            กำไรขั้นต้น: discounted.margin ?? 0,
            marginPercent: discounted.margin_percent ?? 0,
            deltaBaht: impact.diff_discount_vs_current.baht,
            deltaPercent: impact.diff_discount_vs_current.percent,
            deltaLabel: 'เทียบราคาปัจจุบัน',
            themeColor: '#d97706', // Amber
            bgClass: 'bg-amber-50/50',
            borderClass: 'border-amber-200',
            textClass: 'text-amber-900',
        },
    ];

    const chartAccountBreakdown = (projections?.account_stats || []).map((acc) => ({
        name: acc.name,
        รายการ: acc.count ?? (acc as any).drugs ?? 0,
        รายได้ปัจจุบัน: acc.revenue_current ?? (acc as any).current_revenue ?? 0,
        เกณฑ์ว111: acc.revenue_w111 ?? (acc as any).tier_revenue ?? 0,
        จำลองลดราคา: acc.revenue_discounted ?? (acc as any).discounted_revenue ?? 0,
    }));

    return (
        <AppLayout breadcrumbs={pharmacyBreadcrumbs([{ title: 'วิเคราะห์ราคายา ว.111' }])}>
            <Head title="วิเคราะห์ราคายา ว.111 & ประมาณการรายได้ปีงบประมาณ" />

            <div className="relative min-h-screen overflow-hidden bg-slate-50/60 pb-16">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.08),_transparent_45%)]" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <PharmacySubNav active="pharmacy.pricing.index" />

                    {/* Header Banner */}
                    <header className="overflow-hidden rounded-[2rem] border border-teal-100 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-6 text-white shadow-xl shadow-teal-950/20 md:p-8">
                        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-medium text-teal-200 backdrop-blur">
                                    <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                                    โมดูลวิเคราะห์โครงสร้างราคายา · เกณฑ์ระเบียบ ว.111 / ว.177
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                                    วิเคราะห์ราคายา & ประมาณการรายได้ปีงบประมาณ
                                </h1>
                                <p className="max-w-3xl text-sm text-teal-100/80 md:text-base">
                                    เปรียบเทียบราคาขายกับต้นทุนตามเกณฑ์กระทรวงการคลัง (ว.111 / ว.177)
                                    พร้อมระบบจำลองส่วนลดราคายา และประมาณการผลกระทบต่อรายได้จากปริมาณจ่ายยาจริงในปีงบประมาณ {selected_year}
                                </p>
                            </div>

                            {/* Actions & Filters */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 p-1.5 backdrop-blur">
                                    <span className="pl-2 text-xs font-medium text-teal-200">ปีงบ:</span>
                                    <select
                                        value={selected_year}
                                        onChange={(e) => handleYearChange(Number(e.target.value))}
                                        className="rounded-xl border-none bg-slate-800/80 px-3 py-1.5 text-sm font-semibold text-white shadow focus:ring-2 focus:ring-teal-400"
                                    >
                                        {available_years.map((y) => (
                                            <option key={y.year} value={y.year} className="bg-slate-900 text-white">
                                                {y.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => {
                                        setEditableTiers([...tiers]);
                                        setIsTierModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 rounded-2xl border border-teal-400/30 bg-teal-800/40 px-4 py-2.5 text-sm font-medium text-teal-100 backdrop-blur transition hover:bg-teal-700/60"
                                >
                                    <Settings className="h-4 w-4" />
                                    <span>ตั้งค่าเกณฑ์ ว.111</span>
                                </button>

                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:from-emerald-500 hover:to-teal-500"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>ส่งออก Excel</span>
                                </button>
                            </div>
                        </div>

                        {/* Top Summary Metrics */}
                        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-teal-800/50 pt-5 sm:grid-cols-3 lg:grid-cols-6">
                            <div className="rounded-xl bg-white/5 p-3">
                                <div className="text-xs text-teal-200/70">ทะเบียนยาทั้งหมด</div>
                                <div className="mt-1 text-xl font-bold text-white">
                                    {formatNumber(catalog_summary?.total_drugs ?? 0, 0)} <span className="text-xs font-normal">รายการ</span>
                                </div>
                                <div className="mt-0.5 flex gap-2 text-[11px] text-teal-300/80">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openGroupModal(
                                                'ed',
                                                `รายการยาในบัญชียาหลักแห่งชาติ (ED - ${catalog_summary?.ed_count ?? 0} รายการ)`,
                                                'รายการยาที่อยู่ในบัญชียาหลักแห่งชาติของโรงพยาบาล',
                                                'emerald'
                                            )
                                        }
                                        className="hover:underline hover:text-white font-medium cursor-pointer"
                                        title="กดเพื่อดูรายการยาในบัญชี (ED)"
                                    >
                                        ED {catalog_summary?.ed_count ?? 0}
                                    </button>
                                    <span>·</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openGroupModal(
                                                'ned',
                                                `รายการยานอกบัญชียาหลักแห่งชาติ (NED - ${catalog_summary?.ned_count ?? 0} รายการ)`,
                                                'รายการยาที่อยู่นอกบัญชียาหลักแห่งชาติ (สามารถกำหนดนโยบายส่วนลดราคายาได้)',
                                                'rose'
                                            )
                                        }
                                        className="hover:underline hover:text-white font-medium cursor-pointer"
                                        title="กดเพื่อดูรายการยานอกบัญชี (NED)"
                                    >
                                        NED {catalog_summary?.ned_count ?? 0}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    openGroupModal(
                                        'active_fy',
                                        `รายการยาที่มีการสั่งจ่ายจริงในปีงบประมาณ ${selected_year} (${projections?.total_dispensed_items ?? 0} รายการ)`,
                                        'รายการยาที่บันทึกข้อมูลการจ่ายในระบบ HOSxP opitemrece ตลอด 12 เดือนของปีงบประมาณ',
                                        'teal'
                                    )
                                }
                                className="group rounded-xl bg-white/5 p-3 text-left transition hover:bg-white/10 hover:ring-1 hover:ring-teal-400/50 cursor-pointer"
                                title="กดเพื่อดูรายการยาที่มีการจ่ายในปีงบประมาณนี้"
                            >
                                <div className="text-xs text-teal-200/70 flex items-center justify-between">
                                    <span>ปริมาณจ่ายปีงบ {selected_year}</span>
                                    <Eye className="h-3 w-3 text-teal-300" />
                                </div>
                                <div className="mt-1 text-xl font-bold text-white">
                                    {formatNumber(projections?.total_qty_dispensed ?? 0, 0)}
                                </div>
                                <div className="mt-0.5 text-[11px] text-teal-300/80 group-hover:text-teal-200">
                                    จ่ายจริง {projections?.total_dispensed_items ?? 0} รายการ ➔
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    openGroupModal(
                                        'over',
                                        `รายการยาที่ราคาขายสูงกว่าเกณฑ์ ว.111 (${catalog_summary?.over_tier_count ?? 0} รายการ)`,
                                        'รายการยาที่มีราคาจำหน่ายปัจจุบันสูงกว่าเพดานราคาตามเกณฑ์ระเบียบ ว.111 / ว.177 (ควรพิจารณาปรับลดราคา)',
                                        'rose'
                                    )
                                }
                                className="group rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-left transition hover:bg-rose-500/20 hover:border-rose-400 cursor-pointer"
                                title="กดเพื่อดูรายการยาที่ราคาขายสูงกว่าเกณฑ์ ว.111"
                            >
                                <div className="flex items-center justify-between text-xs text-rose-300">
                                    <span>สูงกว่าเกณฑ์ ว.111</span>
                                    <AlertTriangle className="h-3 w-3 text-rose-400" />
                                </div>
                                <div className="mt-1 text-xl font-bold text-rose-200">
                                    {formatNumber(catalog_summary?.over_tier_count ?? 0, 0)} <span className="text-xs font-normal">รายการ</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-rose-300/80 group-hover:text-rose-200">
                                    {(((catalog_summary?.over_tier_count ?? 0) / (catalog_summary?.total_drugs || 1)) * 100).toFixed(1)}% ของทั้งหมด ➔
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    openGroupModal(
                                        'match',
                                        `รายการยาที่ราคาขายตรงตามเกณฑ์ ว.111 (${catalog_summary?.match_tier_count ?? 0} รายการ)`,
                                        'รายการยาที่มีราคาจำหน่ายเป็นไปตามอัตราส่วนเพิ่มและเกณฑ์ราคามาตรฐานกระทรวงการคลัง',
                                        'emerald'
                                    )
                                }
                                className="group rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-left transition hover:bg-emerald-500/20 hover:border-emerald-400 cursor-pointer"
                                title="กดเพื่อดูรายการยาที่ราคาตามเกณฑ์ ว.111"
                            >
                                <div className="flex items-center justify-between text-xs text-emerald-300">
                                    <span>ตามเกณฑ์ ว.111</span>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                </div>
                                <div className="mt-1 text-xl font-bold text-emerald-200">
                                    {formatNumber(catalog_summary?.match_tier_count ?? 0, 0)} <span className="text-xs font-normal">รายการ</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-emerald-300/80 group-hover:text-emerald-200">
                                    {(((catalog_summary?.match_tier_count ?? 0) / (catalog_summary?.total_drugs || 1)) * 100).toFixed(1)}% ตามระเบียบ ➔
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    openGroupModal(
                                        'under',
                                        `รายการยาที่ราคาขายต่ำกว่าเกณฑ์ ว.111 (${catalog_summary?.under_tier_count ?? 0} รายการ)`,
                                        'รายการยาที่มีราคาจำหน่ายปัจจุบันต่ำกว่าเพดานราคาที่ระเบียบกระทรวงการคลัง (ว.111 / ว.177) กำหนดไว้',
                                        'amber'
                                    )
                                }
                                className="group rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-left transition hover:bg-amber-500/20 hover:border-amber-400 cursor-pointer"
                                title="กดเพื่อดูรายการยาที่ราคาต่ำกว่าเกณฑ์ ว.111"
                            >
                                <div className="text-xs text-amber-300 flex items-center justify-between">
                                    <span>ต่ำกว่าเกณฑ์ ว.111</span>
                                    <Eye className="h-3 w-3 text-amber-300" />
                                </div>
                                <div className="mt-1 text-xl font-bold text-amber-200">
                                    {formatNumber(catalog_summary?.under_tier_count ?? 0, 0)} <span className="text-xs font-normal">รายการ</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-amber-300/80 group-hover:text-amber-200">
                                    ราคาขายต่ำกว่าเพดาน ➔
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('overview')}
                                className="group rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-left transition hover:bg-cyan-500/20 hover:border-cyan-400"
                                title="กดเพื่อดูการกระจายตัวของ Markup ในแท็บกราฟ"
                            >
                                <div className="text-xs text-cyan-300 flex items-center justify-between">
                                    <span>มาร์กอัปเฉลี่ย (Markup)</span>
                                    <BarChart3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition text-cyan-300" />
                                </div>
                                <div className="mt-1 text-xl font-bold text-cyan-200">
                                    +{formatNumber(catalog_summary?.avg_markup ?? 0, 1)}%
                                </div>
                                <div className="mt-0.5 text-[11px] text-cyan-300/80 group-hover:text-cyan-200">
                                    ทุนเฉลี่ย ฿{formatNumber(catalog_summary?.avg_cost ?? 0, 1)} ➔
                                </div>
                            </button>
                        </div>
                    </header>

                    {/* Section 1: Discount Simulation Control Box */}
                    <div className="rounded-[1.75rem] border border-teal-200/80 bg-white p-5 shadow-xl shadow-teal-900/5 md:p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                        <Percent className="h-4 w-4" />
                                    </span>
                                    <h2 className="text-lg font-bold text-slate-800">เครื่องคิดเลขจำลองส่วนลดราคายา (Discount Simulator)</h2>
                                </div>
                                <p className="text-xs text-slate-500">
                                    ปรับเปอร์เซ็นต์ส่วนลดและกลุ่มเป้าหมาย เพื่อประเมินผลกระทบต่อรายได้และกำไรขั้นต้นของโรงพยาบาลแบบเรียลไทม์
                                </p>
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-500 mr-1">ทางเลือกด่วน:</span>
                                {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => (
                                    <button
                                        key={pct}
                                        type="button"
                                        onClick={() => {
                                            setDiscountSlider(pct);
                                            applySimulation(pct, scopeSelector, roundToggle);
                                        }}
                                        className={cn(
                                            'rounded-xl px-2.5 py-1.5 text-xs font-semibold transition',
                                            discountSlider === pct
                                                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/20'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        )}
                                    >
                                        {pct === 0 ? 'ราคาเต็ม (0%)' : `ลด ${pct}%`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 md:grid-cols-12 md:items-center">
                            {/* Slider Box */}
                            <div className="md:col-span-5 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-slate-700">อัตราส่วนลดที่เลือก:</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                step="0.5"
                                                value={discountSlider}
                                                onChange={(e) => {
                                                    const val = Math.min(50, Math.max(0, Number(e.target.value)));
                                                    setDiscountSlider(val);
                                                }}
                                                onBlur={() => applySimulation(discountSlider, scopeSelector, roundToggle)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        applySimulation(discountSlider, scopeSelector, roundToggle);
                                                    }
                                                }}
                                                className="w-16 rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-right text-base font-bold text-amber-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-amber-700">%</span>
                                    </div>
                                </div>

                                <div className="relative py-1">
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        step="0.5"
                                        value={discountSlider}
                                        onChange={(e) => setDiscountSlider(Number(e.target.value))}
                                        onMouseUp={() => applySimulation(discountSlider, scopeSelector, roundToggle)}
                                        onTouchEnd={() => applySimulation(discountSlider, scopeSelector, roundToggle)}
                                        style={{
                                            background: `linear-gradient(to right, #d97706 0%, #d97706 ${(discountSlider / 50) * 100}%, #e2e8f0 ${(discountSlider / 50) * 100}%, #e2e8f0 100%)`,
                                        }}
                                        className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-amber-600 transition-all"
                                    />
                                </div>

                                {/* Accurately positioned marks: 0% at 0%, 10% at 20%, 25% at 50%, 50% at 100% */}
                                <div className="relative h-5 text-[11px] text-slate-400 select-none">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscountSlider(0);
                                            applySimulation(0, scopeSelector, roundToggle);
                                        }}
                                        className={cn(
                                            'absolute left-0 cursor-pointer font-medium transition hover:text-amber-700',
                                            discountSlider === 0 ? 'text-amber-700 font-bold' : ''
                                        )}
                                        title="ตั้งค่าส่วนลด 0% (ราคาเดิม)"
                                    >
                                        0% (ราคาเดิม)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscountSlider(10);
                                            applySimulation(10, scopeSelector, roundToggle);
                                        }}
                                        style={{ left: '20%' }}
                                        className={cn(
                                            'absolute -translate-x-1/2 cursor-pointer font-medium transition hover:text-amber-700',
                                            discountSlider === 10 ? 'text-amber-700 font-bold' : ''
                                        )}
                                        title="ตั้งค่าส่วนลด 10%"
                                    >
                                        10%
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscountSlider(25);
                                            applySimulation(25, scopeSelector, roundToggle);
                                        }}
                                        style={{ left: '50%' }}
                                        className={cn(
                                            'absolute -translate-x-1/2 cursor-pointer font-medium transition hover:text-amber-700',
                                            discountSlider === 25 ? 'text-amber-700 font-bold' : ''
                                        )}
                                        title="ตั้งค่าส่วนลด 25%"
                                    >
                                        25%
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscountSlider(50);
                                            applySimulation(50, scopeSelector, roundToggle);
                                        }}
                                        className={cn(
                                            'absolute right-0 cursor-pointer font-medium transition hover:text-amber-700',
                                            discountSlider === 50 ? 'text-amber-700 font-bold' : ''
                                        )}
                                        title="ตั้งค่าส่วนลด 50%"
                                    >
                                        50%
                                    </button>
                                </div>
                            </div>

                            {/* Scope Selector */}
                            <div className="md:col-span-4 space-y-2">
                                <label className="text-xs font-semibold text-slate-700">กลุ่มยาเป้าหมายในการลดราคา:</label>
                                <select
                                    value={scopeSelector}
                                    onChange={(e) => {
                                        const newScope = e.target.value;
                                        setScopeSelector(newScope);
                                        applySimulation(discountSlider, newScope, roundToggle);
                                    }}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                                >
                                    <option value="all">ทุกรายการยาในโรงพยาบาล (All Drugs)</option>
                                    <option value="ned">เฉพาะยานอกบัญชียาหลัก (NED Only)</option>
                                    <option value="ed">เฉพาะยาในบัญชียาหลัก (ED Only)</option>
                                    <option value="over_tier">เฉพาะยาที่ราคาขายสูงกว่าเกณฑ์ ว.111 (Over-tier only)</option>
                                </select>
                            </div>

                            {/* Rounding and Apply button */}
                            <div className="flex flex-col gap-2 md:col-span-3">
                                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={roundToggle}
                                        onChange={(e) => {
                                            const newRound = e.target.checked;
                                            setRoundToggle(newRound);
                                            applySimulation(discountSlider, scopeSelector, newRound);
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>ปัดเศษราคาขายตามมาตรฐาน รพ.</span>
                                </label>

                                <button
                                    type="button"
                                    onClick={() => applySimulation(discountSlider, scopeSelector, roundToggle)}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-teal-500"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>คำนวณแบบจำลอง</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: 4-Scenario KPI Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Scenario 1: Actual Historical */}
                        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Scenario 1
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                    ปีงบ {selected_year}
                                </span>
                            </div>
                            <h3 className="mt-1 text-sm font-bold text-slate-800">รายได้จริงปีก่อนหน้า</h3>
                            <div className="mt-3 text-2xl font-extrabold text-slate-900">
                                {formatBaht(historicalActual.revenue)}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2">
                                <div className="flex justify-between">
                                    <span>ต้นทุนจริง:</span>
                                    <span className="font-semibold text-slate-700">
                                        {formatBaht(historicalActual.cost)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>กำไรขั้นต้น:</span>
                                    <span className="font-semibold text-emerald-600">
                                        {formatBaht(historicalActual.margin)} ({historicalActual.margin_percent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 rounded-xl bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500">
                                * บันทึกจาก HOSxP opitemrece
                            </div>
                        </div>

                        {/* Scenario 2: Current Price */}
                        <div className="relative overflow-hidden rounded-3xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                                    Scenario 2
                                </span>
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                                    ราคาปัจจุบัน
                                </span>
                            </div>
                            <h3 className="mt-1 text-sm font-bold text-slate-800">คำนวณตามราคาขายปัจจุบัน</h3>
                            <div className="mt-3 text-2xl font-extrabold text-sky-950">
                                {formatBaht(currentPrice.revenue)}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-slate-500 border-t border-sky-100 pt-2">
                                <div className="flex justify-between">
                                    <span>ต้นทุนยา:</span>
                                    <span className="font-semibold text-slate-700">
                                        {formatBaht(currentPrice.cost)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>กำไรขั้นต้น:</span>
                                    <span className="font-semibold text-sky-700">
                                        {formatBaht(currentPrice.margin)} ({currentPrice.margin_percent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-sky-100/70 px-2.5 py-1 text-[11px] font-medium text-sky-800">
                                <span>เทียบรายได้จริงปีก่อน:</span>
                                <span className="font-bold">
                                    {impact.diff_current_vs_actual.baht >= 0 ? '+' : ''}
                                    {formatBaht(impact.diff_current_vs_actual.baht)} ({impact.diff_current_vs_actual.percent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>

                        {/* Scenario 3: W111 Tier Price */}
                        <div className="relative overflow-hidden rounded-3xl border border-teal-200 bg-teal-50/40 p-5 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                                    Scenario 3
                                </span>
                                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                                    เกณฑ์ ว.111
                                </span>
                            </div>
                            <h3 className="mt-1 text-sm font-bold text-slate-800">คำนวณตามเกณฑ์ ว.111 / ว.177</h3>
                            <div className="mt-3 text-2xl font-extrabold text-teal-950">
                                {formatBaht(tierW111.revenue)}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-slate-500 border-t border-teal-100 pt-2">
                                <div className="flex justify-between">
                                    <span>ต้นทุนยา:</span>
                                    <span className="font-semibold text-slate-700">
                                        {formatBaht(tierW111.cost)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>กำไรขั้นต้น:</span>
                                    <span className="font-semibold text-teal-700">
                                        {formatBaht(tierW111.margin)} ({tierW111.margin_percent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-teal-100/70 px-2.5 py-1 text-[11px] font-medium text-teal-800">
                                <span>เทียบราคาขายปัจจุบัน:</span>
                                <span className="font-bold">
                                    {impact.diff_w111_vs_current.baht >= 0 ? '+' : ''}
                                    {formatBaht(impact.diff_w111_vs_current.baht)} ({impact.diff_w111_vs_current.percent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>

                        {/* Scenario 4: Discounted Simulation */}
                        <div className="relative overflow-hidden rounded-3xl border border-amber-300 bg-amber-50/50 p-5 shadow-sm transition hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                                    Scenario 4
                                </span>
                                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                                    จำลองลด {discountSlider}%
                                </span>
                            </div>
                            <h3 className="mt-1 text-sm font-bold text-slate-800">รายได้หลังหักส่วนลดจำลอง</h3>
                            <div className="mt-3 text-2xl font-extrabold text-amber-950">
                                {formatBaht(discounted.revenue)}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-slate-500 border-t border-amber-200/60 pt-2">
                                <div className="flex justify-between">
                                    <span>ต้นทุนคงที่:</span>
                                    <span className="font-semibold text-slate-700">
                                        {formatBaht(discounted.cost)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>กำไรขั้นต้นคงเหลือ:</span>
                                    <span className="font-semibold text-amber-800">
                                        {formatBaht(discounted.margin)} ({discounted.margin_percent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                                <span>ผลกระทบ (รายได้เปลี่ยน):</span>
                                <span>
                                    {impact.diff_discount_vs_current.baht >= 0 ? '+' : ''}
                                    {formatBaht(impact.diff_discount_vs_current.baht)} ({impact.diff_discount_vs_current.percent.toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Navigation Tabs for In-depth Views */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className={cn(
                                'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition',
                                activeTab === 'overview'
                                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/10'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                        >
                            <BarChart3 className="h-4 w-4" />
                            <span>กราฟเปรียบเทียบ & การกระจาย</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('drugs')}
                            className={cn(
                                'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition',
                                activeTab === 'drugs'
                                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/10'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                        >
                            <Layers className="h-4 w-4" />
                            <span>ตารางวิเคราะห์รายการยาทั้งหมด ({catalog_items.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('top')}
                            className={cn(
                                'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition',
                                activeTab === 'top'
                                    ? 'bg-teal-600 text-white shadow-md shadow-teal-900/10'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                        >
                            <DollarSign className="h-4 w-4" />
                            <span>ยามูลค่าสูงสุด & ยาที่ได้รับผลกระทบ</span>
                        </button>
                    </div>

                    {/* Tab 1: Charts & Distribution */}
                    {activeTab === 'overview' && (
                        <div className="grid gap-6 lg:grid-cols-12">
                            {/* Scenario Comparison Chart */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-800">เปรียบเทียบ 4 สถานการณ์: รายได้และกำไรขั้นต้น</h3>
                                            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                                                หน่วย: บาท
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {chartViewMode === 'stacked'
                                                ? 'โครงสร้างแท่งซ้อน: ต้นทุนยาคงที่ (แถบล่างสีเทา) + กำไรขั้นต้น (แถบบนสีประจำสถานการณ์) = รายได้รวม'
                                                : 'โครงสร้างแท่งแยก: เปรียบเทียบรายได้รวมและกำไรขั้นต้นเคียงข้างกันในแต่ละสถานการณ์'}
                                        </p>
                                    </div>

                                    {/* View Mode Switcher */}
                                    <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setChartViewMode('stacked')}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer',
                                                chartViewMode === 'stacked'
                                                    ? 'bg-white text-teal-800 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            )}
                                        >
                                            <Layers className="h-3.5 w-3.5" />
                                            <span>แท่งซ้อน (ดูง่าย)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChartViewMode('grouped')}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer',
                                                chartViewMode === 'grouped'
                                                    ? 'bg-white text-teal-800 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            )}
                                        >
                                            <BarChart3 className="h-3.5 w-3.5" />
                                            <span>แท่งแยก (รายได้/กำไร)</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Legend */}
                                <div className="mb-3 flex flex-wrap items-center gap-4 text-xs border-b border-slate-100 pb-2.5 text-slate-600">
                                    {chartViewMode === 'stacked' ? (
                                        <>
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-3 w-3 rounded bg-slate-300" />
                                                <span>ต้นทุนยาคงที่ (Cost)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-3 w-3 rounded bg-teal-600" />
                                                <span>กำไรขั้นต้น (Gross Margin)</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 italic">
                                                * ความสูงรวมของแท่ง = รายได้รวม (Total Revenue)
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-3 w-3 rounded bg-sky-600" />
                                                <span>รายได้รวม (Revenue)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-3 w-3 rounded bg-teal-600" />
                                                <span>กำไรขั้นต้น (Gross Margin)</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartViewMode === 'stacked' ? (
                                            <BarChart data={chartScenarios} margin={{ top: 15, right: 10, left: 10, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                                                />
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload || !payload.length) return null;
                                                        const entry = payload[0]?.payload;
                                                        if (!entry) return null;
                                                        return (
                                                            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md text-xs space-y-2.5 min-w-[260px]">
                                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                    <span className="font-bold text-slate-800 text-sm">{entry.fullName}</span>
                                                                    <span
                                                                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                                                                        style={{ backgroundColor: entry.themeColor }}
                                                                    >
                                                                        {entry.badge}
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-1.5 pt-0.5">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium">รายได้รวม (Total Revenue):</span>
                                                                        <strong className="text-slate-900 font-mono text-sm">{formatBaht(entry.รายได้)}</strong>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium">ต้นทุนยาคงที่ (Total Cost):</span>
                                                                        <span className="text-slate-600 font-mono">{formatBaht(entry.ต้นทุน)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium">กำไรขั้นต้น (Gross Margin):</span>
                                                                        <strong className="text-emerald-700 font-mono text-xs">
                                                                            {formatBaht(entry.กำไรขั้นต้น)} ({entry.marginPercent.toFixed(1)}%)
                                                                        </strong>
                                                                    </div>
                                                                    {entry.deltaBaht !== null && (
                                                                        <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center text-[11px]">
                                                                            <span className="text-slate-400">{entry.deltaLabel}:</span>
                                                                            <span
                                                                                className={cn(
                                                                                    'font-bold font-mono',
                                                                                    entry.deltaBaht > 0 ? 'text-teal-700' : entry.deltaBaht < 0 ? 'text-rose-600' : 'text-slate-600'
                                                                                )}
                                                                            >
                                                                                {entry.deltaBaht > 0 ? '+' : ''}{formatBaht(entry.deltaBaht)} ({entry.deltaPercent > 0 ? '+' : ''}{entry.deltaPercent?.toFixed(1)}%)
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                {/* Stack 1: Cost on bottom */}
                                                <Bar
                                                    dataKey="ต้นทุน"
                                                    stackId="scenarioStack"
                                                    fill="#cbd5e1"
                                                    name="ต้นทุนยาคงที่"
                                                    radius={[0, 0, 4, 4]}
                                                />
                                                {/* Stack 2: Gross Profit on top with custom colors per scenario */}
                                                <Bar
                                                    dataKey="กำไรขั้นต้น"
                                                    stackId="scenarioStack"
                                                    name="กำไรขั้นต้น"
                                                    radius={[8, 8, 0, 0]}
                                                >
                                                    {chartScenarios.map((entry) => (
                                                        <Cell key={entry.key} fill={entry.themeColor} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        ) : (
                                            <BarChart data={chartScenarios} margin={{ top: 15, right: 10, left: 10, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                                                />
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload || !payload.length) return null;
                                                        const entry = payload[0]?.payload;
                                                        if (!entry) return null;
                                                        return (
                                                            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[250px]">
                                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                    <span className="font-bold text-slate-800 text-sm">{entry.fullName}</span>
                                                                    <span
                                                                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                                                                        style={{ backgroundColor: entry.themeColor }}
                                                                    >
                                                                        {entry.badge}
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-1.5 pt-0.5">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium">รายได้รวม:</span>
                                                                        <strong className="text-sky-700 font-mono text-sm">{formatBaht(entry.รายได้)}</strong>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 font-medium">กำไรขั้นต้น:</span>
                                                                        <strong className="text-teal-700 font-mono text-xs">
                                                                            {formatBaht(entry.กำไรขั้นต้น)} ({entry.marginPercent.toFixed(1)}%)
                                                                        </strong>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                                <Bar dataKey="รายได้" fill="#0284c7" name="รายได้รวม (Revenue)" radius={[6, 6, 0, 0]} />
                                                <Bar dataKey="กำไรขั้นต้น" fill="#0d9488" name="กำไรขั้นต้น (Margin)" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>

                                {/* Executive Summary Strip beneath the Chart */}
                                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4">
                                    {chartScenarios.map((s) => (
                                        <div
                                            key={s.key}
                                            className={cn(
                                                'rounded-2xl p-3 border transition hover:shadow-md cursor-default',
                                                s.borderClass,
                                                s.bgClass
                                            )}
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className={cn('font-bold truncate', s.textClass)}>{s.shortName}</span>
                                                <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-white/90 border border-slate-200 text-slate-700 shadow-xs">
                                                    {s.marginPercent.toFixed(1)}% กำไร
                                                </span>
                                            </div>
                                            <div className="mt-2 text-base font-extrabold text-slate-900">
                                                {formatBaht(s.รายได้)}
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                                                <span>กำไร:</span>
                                                <strong className="text-emerald-700 font-mono">{formatBaht(s.กำไรขั้นต้น)}</strong>
                                            </div>
                                            {s.deltaBaht !== null && (
                                                <div className="mt-1 border-t border-slate-200/60 pt-1 text-[10px] font-medium flex items-center justify-between">
                                                    <span className="text-slate-400">{s.deltaLabel}:</span>
                                                    <span
                                                        className={cn(
                                                            'font-bold font-mono',
                                                            s.deltaBaht > 0 ? 'text-teal-700' : s.deltaBaht < 0 ? 'text-rose-600' : 'text-slate-600'
                                                        )}
                                                    >
                                                        {s.deltaBaht > 0 ? '+' : ''}{formatBaht(s.deltaBaht)} ({s.deltaPercent > 0 ? '+' : ''}{s.deltaPercent?.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Markup Distribution */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-800">การกระจายตัวของ Markup (กำไร %)</h3>
                                    <p className="text-xs text-slate-500">
                                        สัดส่วนรายการยาแยกตามช่วงเปอร์เซ็นต์กำไรเทียบราคาทุน
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {(projections?.markup_distribution || []).map((m) => (
                                        <div key={m.range || m.label} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-medium text-slate-700">{m.label}</span>
                                                <span className="font-semibold text-slate-900">
                                                    {m.count} รายการ ({(m.percent ?? 0).toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-teal-500 transition-all duration-500"
                                                    style={{ width: `${Math.min(100, m.percent ?? 0)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 rounded-2xl bg-teal-50 p-3.5 text-xs text-teal-800">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <Info className="h-4 w-4 text-teal-600" />
                                        <span>ข้อสังเกตจากเกณฑ์ ว.111</span>
                                    </div>
                                    <p className="mt-1 leading-relaxed text-teal-700">
                                        เกณฑ์ ว.111 กำหนดอัตราส่วนเพิ่มแบบขั้นบันไดถอยหลัง (Regressive Markup) ยาต้นทุนต่ำจะมี % มาร์กอัปสูง (เพื่อชดเชยค่าบริการเภสัชกรรม) ส่วนยาต้นทุนสูงจะมี % มาร์กอัปต่ำ เพื่อควบคุมราคายาไม่ให้เป็นภาระต่อผู้ป่วย
                                    </p>
                                </div>
                            </div>

                            {/* Drug Account Breakdown */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-12">
                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-800">เปรียบเทียบรายได้แยกตามบัญชียา (ED vs NED)</h3>
                                    <p className="text-xs text-slate-500">
                                        สัดส่วนการสร้างรายได้และการเปลี่ยนแปลงหลังหักส่วนลด
                                    </p>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartAccountBreakdown} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                                            />
                                            <Tooltip
                                                formatter={(val: any) => [`฿${formatNumber(Number(val))}`, '']}
                                                contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            <Bar dataKey="รายได้ปัจจุบัน" fill="#0284c7" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="เกณฑ์ว111" fill="#0d9488" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="จำลองลดราคา" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: All Drug Items Catalog Table */}
                    {activeTab === 'drugs' && (
                        <div id="drugs-table-section" className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden scroll-mt-6">
                            {/* Filter Bar */}
                            <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="relative flex-1 sm:max-w-md">
                                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาชื่อยา, generic name, หรือรหัสยา..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-200"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                                        <Filter className="h-3.5 w-3.5" /> กรอง:
                                    </span>
                                    {[
                                        { key: 'all', label: `ทั้งหมด (${catalog_items.length})` },
                                        { key: 'over', label: `เกินเกณฑ์ ว.111 (${catalog_summary?.over_tier_count ?? 0})`, badge: 'text-rose-700 bg-rose-50' },
                                        { key: 'match', label: `ตามเกณฑ์ (${catalog_summary?.match_tier_count ?? 0})`, badge: 'text-emerald-700 bg-emerald-50' },
                                        { key: 'under', label: `ต่ำกว่าเกณฑ์ (${catalog_summary?.under_tier_count ?? 0})`, badge: 'text-amber-700 bg-amber-50' },
                                        { key: 'no_cost', label: `ไม่มีทุน (${catalog_summary?.no_cost_count ?? 0})` },
                                        { key: 'ed', label: `ยาในบัญชี (ED - ${catalog_summary?.ed_count ?? 0})` },
                                        { key: 'ned', label: `ยานอกบัญชี (NED - ${catalog_summary?.ned_count ?? 0})` },
                                        { key: 'active_fy', label: `มีการจ่ายปีงบ ${selected_year}` },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setStatusFilter(tab.key as any)}
                                            className={cn(
                                                'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                                                statusFilter === tab.key
                                                    ? 'bg-teal-600 text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                                            <th className="py-3 px-4 font-semibold">รหัส / ชื่อยา</th>
                                            <th className="py-3 px-2 font-semibold">บัญชียา</th>
                                            <th className="py-3 px-3 font-semibold text-right">ราคาทุน (Cost)</th>
                                            <th className="py-3 px-3 font-semibold text-right">ราคาขายปัจจุบัน</th>
                                            <th className="py-3 px-3 font-semibold text-right">ราคาเกณฑ์ ว.111</th>
                                            <th className="py-3 px-3 font-semibold text-right">ส่วนต่างเทียบเกณฑ์</th>
                                            <th className="py-3 px-3 font-semibold text-center">สถานะเทียบ ว.111</th>
                                            <th className="py-3 px-3 font-semibold text-right">ราคาจำลอง (-{discountSlider}%)</th>
                                            <th className="py-3 px-3 font-semibold text-right">จ่ายปี {selected_year}</th>
                                            <th className="py-3 px-4 font-semibold text-right">รายได้จำลอง</th>
                                            <th className="py-3 px-3 font-semibold text-center">เจาะลึก</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {filteredDrugs.length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="py-12 text-center text-slate-400">
                                                    ไม่พบรายการยาที่ตรงกับเงื่อนไขการค้นหา
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDrugs.slice(0, 100).map((drug) => {
                                                const shouldApplyDiscount =
                                                    discountSlider > 0 &&
                                                    (scopeSelector === 'all' ||
                                                        (scopeSelector === 'ned' && !drug.is_ed) ||
                                                        (scopeSelector === 'ed' && drug.is_ed) ||
                                                        (scopeSelector === 'over_tier' && drug.status === 'over'));

                                                const simPrice = shouldApplyDiscount
                                                    ? Math.max(0, drug.unitprice * (1 - discountSlider / 100))
                                                    : drug.unitprice;

                                                const simRevenue = drug.fy_qty * simPrice;

                                                return (
                                                    <tr
                                                        key={drug.icode}
                                                        onClick={() => openDrugDetail(drug.icode)}
                                                        className="hover:bg-teal-50/50 cursor-pointer transition group"
                                                        title="คลิกเพื่อดูรายละเอียดสูตรคำนวณ ว.111 และสถิติจ่ายรายเดือน"
                                                    >
                                                        <td className="py-2.5 px-4 font-medium">
                                                            <div className="text-slate-900 font-semibold group-hover:text-teal-700 transition">
                                                                {drug.name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400">
                                                                {drug.icode} {drug.units ? `· ${drug.units}` : ''} {drug.strength ? `· ${drug.strength}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-2">
                                                            <span
                                                                className={cn(
                                                                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                                                    drug.is_ed
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                )}
                                                            >
                                                                {drug.drugaccount || (drug.is_ed ? 'ED' : 'NED')}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono">
                                                            ฿{formatNumber(drug.unitcost, 2)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                                            ฿{formatNumber(drug.unitprice, 2)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-teal-800 font-semibold">
                                                            ฿{formatNumber(drug.tier_price, 2)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono">
                                                            <span
                                                                className={cn(
                                                                    'font-semibold',
                                                                    drug.diff_vs_tier > 0
                                                                        ? 'text-rose-600'
                                                                        : drug.diff_vs_tier < 0
                                                                        ? 'text-amber-600'
                                                                        : 'text-slate-500'
                                                                )}
                                                            >
                                                                {drug.diff_vs_tier > 0 ? '+' : ''}
                                                                ฿{formatNumber(drug.diff_vs_tier, 2)}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            {drug.status === 'over' && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                                                    <TrendingUp className="h-3 w-3" /> เกินเกณฑ์ ว.111
                                                                </span>
                                                            )}
                                                            {drug.status === 'match' && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                                                    <CheckCircle2 className="h-3 w-3" /> ตามเกณฑ์
                                                                </span>
                                                            )}
                                                            {drug.status === 'under' && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                                                    <TrendingDown className="h-3 w-3" /> ต่ำกว่าเกณฑ์
                                                                </span>
                                                            )}
                                                            {drug.status === 'no_cost' && (
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                                                    ไม่มีข้อมูลทุน
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                                                            ฿{formatNumber(simPrice, 2)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                                            {formatNumber(drug.fy_qty, 0)}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                                            ฿{formatNumber(simRevenue, 2)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDrugDetail(drug.icode);
                                                                }}
                                                                className="rounded-lg p-1.5 text-slate-400 group-hover:text-teal-700 group-hover:bg-teal-100/60 transition"
                                                                title="คลิกดูรายละเอียดเชิงลึก"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredDrugs.length > 100 && (
                                <div className="border-t border-slate-100 bg-slate-50 p-3 text-center text-xs text-slate-500">
                                    แสดง 100 รายการแรกจากทั้งหมด {filteredDrugs.length} รายการ (ส่งออก Excel เพื่อดูรายการทั้งหมด)
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Top Impact & Top Revenue Drugs */}
                    {activeTab === 'top' && (
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Top Affected Drugs */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                            <Percent className="h-4 w-4" />
                                        </span>
                                        <h3 className="font-bold text-slate-800">ยาที่รายได้กระทบสูงสุดจากการลดราคา ({discountSlider}%)</h3>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        รายการยาที่ทำให้รายได้รวมลดลงมากที่สุดตามนโยบายส่วนลดที่เลือก
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {(projections?.top_affected_drugs || []).length === 0 ? (
                                        <div className="py-8 text-center text-xs text-slate-400">
                                            ยังไม่มีรายการที่ได้รับผลกระทบ (ตั้งส่วนลด &gt; 0% เพื่อจำลองผลลัพธ์)
                                        </div>
                                    ) : (
                                        (projections?.top_affected_drugs || []).slice(0, 10).map((item, idx) => {
                                            const priceBefore = item.price_before ?? (item as any).unitprice ?? 0;
                                            const priceAfter = item.price_after ?? (item as any).discounted_price ?? 0;
                                            const revBefore = item.revenue_before ?? (item as any).current_revenue ?? 0;
                                            const diffBaht = item.diff_baht ?? (item as any).delta_vs_current ?? 0;

                                            return (
                                                <div
                                                    key={item.icode}
                                                    onClick={() => openDrugDetail(item.icode)}
                                                    className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs cursor-pointer transition hover:border-amber-300 hover:bg-amber-50/40 hover:shadow-sm"
                                                    title="คลิกเพื่อดูรายละเอียดเชิงลึกและสูตรคำนวณ ว.111"
                                                >
                                                    <div className="space-y-0.5">
                                                        <div className="font-bold text-slate-900 group-hover:text-amber-800 transition flex items-center gap-1.5">
                                                            <span>{idx + 1}. {item.name}</span>
                                                            <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition text-amber-600" />
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            จ่าย {formatNumber(item.qty, 0)} {item.units} · ราคา ฿{formatNumber(priceBefore)} ➔ ฿{formatNumber(priceAfter)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-rose-600">
                                                            -฿{formatNumber(Math.abs(diffBaht), 2)}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            ลดลง {((Math.abs(diffBaht) / (revBefore || 1)) * 100).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Top Revenue Drugs */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                                            <DollarSign className="h-4 w-4" />
                                        </span>
                                        <h3 className="font-bold text-slate-800">10 ยามูลค่าการจ่ายสูงสุด (ปีงบ {selected_year})</h3>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        รายการยาที่มีมูลค่าการจ่ายยาในโรงพยาบาลสูงสุด
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {(projections?.top_revenue_drugs || []).slice(0, 10).map((item, idx) => (
                                        <div
                                            key={item.icode}
                                            onClick={() => openDrugDetail(item.icode)}
                                            className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs cursor-pointer transition hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-sm"
                                            title="คลิกเพื่อดูรายละเอียดเชิงลึกและสูตรคำนวณ ว.111"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="font-bold text-slate-900 group-hover:text-teal-800 transition flex items-center gap-1.5">
                                                    <span>{idx + 1}. {item.name}</span>
                                                    <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition text-teal-600" />
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    จ่าย {formatNumber(item.qty, 0)} {item.units} · ทุน ฿{formatNumber(item.unitcost)} · ขาย ฿{formatNumber(item.unitprice)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-900">
                                                    ฿{formatNumber((item as any).revenue_current ?? (item as any).current_revenue ?? 0, 2)}
                                                </div>
                                                <div className="text-[11px] text-emerald-600 font-semibold">
                                                    กำไร ฿{formatNumber(((item as any).revenue_current ?? (item as any).current_revenue ?? 0) - item.qty * item.unitcost, 2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Tiers Configuration Dialog */}
            {isTierModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    ตั้งค่าเกณฑ์ช่วงราคา ว.111 / ว.177 (Drug Pricing Tiers)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    กำหนดสูตรคิดราคาขายตามช่วงราคาทุน สามารถแก้ไขช่วงราคา มาร์กอัป หรืออัตราคูณได้ตามระเบียบล่าสุด
                                </p>
                            </div>
                            <button
                                onClick={() => setIsTierModalOpen(false)}
                                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                            <th className="py-2.5 px-3">ลำดับ</th>
                                            <th className="py-2.5 px-3">ชื่อช่วง</th>
                                            <th className="py-2.5 px-3">ทุนต่ำสุด (฿)</th>
                                            <th className="py-2.5 px-3">ทุนสูงสุด (฿)</th>
                                            <th className="py-2.5 px-3">รูปแบบคำนวณ</th>
                                            <th className="py-2.5 px-3">ราคาฐาน (฿)</th>
                                            <th className="py-2.5 px-3">ทุนฐาน (฿)</th>
                                            <th className="py-2.5 px-3">อัตราคูณ (%)</th>
                                            <th className="py-2.5 px-2 text-center">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-800">
                                        {editableTiers.map((t, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="py-2 px-3 font-semibold">{idx + 1}</td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="text"
                                                        value={t.name}
                                                        onChange={(e) => handleUpdateTierField(idx, 'name', e.target.value)}
                                                        className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={t.min_cost}
                                                        onChange={(e) => handleUpdateTierField(idx, 'min_cost', parseFloat(e.target.value) || 0)}
                                                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="ไม่จำกัด"
                                                        value={t.max_cost === null ? '' : t.max_cost}
                                                        onChange={(e) => handleUpdateTierField(idx, 'max_cost', e.target.value === '' ? null : parseFloat(e.target.value))}
                                                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <select
                                                        value={t.calc_type}
                                                        onChange={(e) => handleUpdateTierField(idx, 'calc_type', e.target.value)}
                                                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                    >
                                                        <option value="fixed">ราคาคงที่ (Fixed)</option>
                                                        <option value="markup_excess">บวกส่วนเกิน (Base + % Excess)</option>
                                                        <option value="multiplier_cost">คูณตรง (% of Cost)</option>
                                                    </select>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={t.base_price}
                                                        onChange={(e) => handleUpdateTierField(idx, 'base_price', parseFloat(e.target.value) || 0)}
                                                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={t.base_cost}
                                                        onChange={(e) => handleUpdateTierField(idx, 'base_cost', parseFloat(e.target.value) || 0)}
                                                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        value={t.multiplier_percent}
                                                        onChange={(e) => handleUpdateTierField(idx, 'multiplier_percent', parseFloat(e.target.value) || 0)}
                                                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveTierRow(idx)}
                                                        className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddTierRow}
                                className="flex items-center gap-1.5 rounded-xl border border-dashed border-teal-300 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                            >
                                <Plus className="h-4 w-4" />
                                <span>เพิ่มช่วงราคา</span>
                            </button>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                            <button
                                type="button"
                                onClick={handleResetTiers}
                                disabled={isSavingTiers}
                                className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                            >
                                <RotateCcw className="h-4 w-4" />
                                <span>คืนค่าเริ่มต้น ว.111</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTierModalOpen(false)}
                                    className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTiers}
                                    disabled={isSavingTiers}
                                    className="flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-teal-500 disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" />
                                    <span>{isSavingTiers ? 'กำลังบันทึก...' : 'บันทึกเกณฑ์ราคา'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Group Summary Drill-Down (เช่น รายการยาที่ต่ำกว่าเกณฑ์ ว.111, สูงกว่าเกณฑ์, ฯลฯ) */}
            <GroupDrilldownModal
                isOpen={groupModalState.isOpen}
                onClose={() => setGroupModalState((prev) => ({ ...prev, isOpen: false }))}
                title={groupModalState.title}
                description={groupModalState.description}
                tone={groupModalState.tone}
                items={groupModalItems}
                onSelectDrug={(icode) => {
                    openDrugDetail(icode);
                }}
                onViewInTable={() => {
                    setStatusFilter(groupModalState.filterType);
                    setActiveTab('drugs');
                    setTimeout(() => {
                        document.getElementById('drugs-table-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }}
            />

            {/* Modal: Drug Detail Drill-Down (แสดงสูตรคำนวณ ว.111 และสถิติจ่าย 12 เดือน) */}
            <DrugDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                isLoading={detailModalLoading}
                data={detailModalData}
            />
        </AppLayout>
    );
}
