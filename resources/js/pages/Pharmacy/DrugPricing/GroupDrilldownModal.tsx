import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
    X,
    Search,
    TrendingDown,
    TrendingUp,
    CheckCircle2,
    AlertTriangle,
    Eye,
    Table,
    Pill,
    ArrowRight,
    DollarSign,
} from 'lucide-react';
import { CatalogItem } from './Index';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    tone: 'rose' | 'amber' | 'emerald' | 'slate' | 'cyan' | 'teal';
    items: CatalogItem[];
    onSelectDrug: (icode: string) => void;
    onViewInTable: () => void;
}

export default function GroupDrilldownModal({
    isOpen,
    onClose,
    title,
    description,
    tone = 'teal',
    items = [],
    onSelectDrug,
    onViewInTable,
}: Props) {
    if (!isOpen) return null;

    const [modalSearch, setModalSearch] = useState('');

    const formatNumber = (num: number, decimals = 2) => {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(num);
    };

    const formatBaht = (num: number) => `฿${formatNumber(num, 2)}`;

    const filtered = useMemo(() => {
        if (!modalSearch) return items;
        const q = modalSearch.toLowerCase();
        return items.filter(
            (item) =>
                item.name.toLowerCase().includes(q) ||
                (item.generic_name && item.generic_name.toLowerCase().includes(q)) ||
                item.icode.toLowerCase().includes(q)
        );
    }, [items, modalSearch]);

    // Calculate totals for this group
    const totalCostSum = items.reduce((acc, i) => acc + (i.unitcost || 0), 0);
    const totalPriceSum = items.reduce((acc, i) => acc + (i.unitprice || 0), 0);
    const totalTierSum = items.reduce((acc, i) => acc + (i.tier_price || 0), 0);
    const totalDiffSum = items.reduce((acc, i) => acc + (i.diff_vs_tier || 0), 0);
    const totalFyQty = items.reduce((acc, i) => acc + (i.fy_qty || 0), 0);
    const totalFyRev = items.reduce((acc, i) => acc + (i.fy_revenue_actual || 0), 0);

    const toneClasses = {
        rose: {
            badge: 'bg-rose-50 text-rose-700 border-rose-200',
            border: 'border-rose-200',
            bg: 'bg-rose-50/50',
            iconBg: 'bg-rose-100 text-rose-700',
        },
        amber: {
            badge: 'bg-amber-50 text-amber-700 border-amber-200',
            border: 'border-amber-200',
            bg: 'bg-amber-50/50',
            iconBg: 'bg-amber-100 text-amber-700',
        },
        emerald: {
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            border: 'border-emerald-200',
            bg: 'bg-emerald-50/50',
            iconBg: 'bg-emerald-100 text-emerald-700',
        },
        slate: {
            badge: 'bg-slate-100 text-slate-700 border-slate-200',
            border: 'border-slate-200',
            bg: 'bg-slate-50',
            iconBg: 'bg-slate-200 text-slate-700',
        },
        cyan: {
            badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            border: 'border-cyan-200',
            bg: 'bg-cyan-50/50',
            iconBg: 'bg-cyan-100 text-cyan-700',
        },
        teal: {
            badge: 'bg-teal-50 text-teal-700 border-teal-200',
            border: 'border-teal-200',
            bg: 'bg-teal-50/50',
            iconBg: 'bg-teal-100 text-teal-700',
        },
    }[tone];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneClasses.iconBg)}>
                            {tone === 'rose' && <TrendingUp className="h-6 w-6" />}
                            {tone === 'amber' && <TrendingDown className="h-6 w-6" />}
                            {tone === 'emerald' && <CheckCircle2 className="h-6 w-6" />}
                            {tone !== 'rose' && tone !== 'amber' && tone !== 'emerald' && <Pill className="h-6 w-6" />}
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold border', toneClasses.badge)}>
                                    {items.length} รายการ
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Sub-header Summary Metrics */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                            <span className="text-slate-400">ทุนเฉลี่ย:</span>{' '}
                            <strong className="text-slate-700 font-mono">
                                {formatBaht(items.length > 0 ? totalCostSum / items.length : 0)}
                            </strong>
                        </div>
                        <div>
                            <span className="text-slate-400">ราคาขายเฉลี่ย:</span>{' '}
                            <strong className="text-slate-700 font-mono">
                                {formatBaht(items.length > 0 ? totalPriceSum / items.length : 0)}
                            </strong>
                        </div>
                        <div>
                            <span className="text-slate-400">เกณฑ์ ว.111 เฉลี่ย:</span>{' '}
                            <strong className="text-teal-700 font-mono">
                                {formatBaht(items.length > 0 ? totalTierSum / items.length : 0)}
                            </strong>
                        </div>
                        <div>
                            <span className="text-slate-400">ส่วนต่างรวม:</span>{' '}
                            <strong
                                className={cn(
                                    'font-mono font-bold',
                                    totalDiffSum > 0 ? 'text-rose-600' : totalDiffSum < 0 ? 'text-amber-600' : 'text-slate-700'
                                )}
                            >
                                {totalDiffSum > 0 ? '+' : ''}
                                {formatBaht(totalDiffSum)}
                            </strong>
                        </div>
                        {totalFyQty > 0 && (
                            <div>
                                <span className="text-slate-400">ปริมาณจ่ายปีงบ:</span>{' '}
                                <strong className="text-slate-800 font-mono">{formatNumber(totalFyQty, 0)} หน่วย</strong>
                            </div>
                        )}
                    </div>

                    {/* Search inside modal */}
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาในกลุ่มนี้..."
                            value={modalSearch}
                            onChange={(e) => setModalSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="p-6">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                                    <th className="py-2.5 px-3 font-semibold">ลำดับ</th>
                                    <th className="py-2.5 px-3 font-semibold">รหัส / ชื่อยา</th>
                                    <th className="py-2.5 px-2 font-semibold">บัญชียา</th>
                                    <th className="py-2.5 px-3 font-semibold text-right">ราคาทุน (Cost)</th>
                                    <th className="py-2.5 px-3 font-semibold text-right">ราคาขายปัจจุบัน</th>
                                    <th className="py-2.5 px-3 font-semibold text-right">ราคาเกณฑ์ ว.111</th>
                                    <th className="py-2.5 px-3 font-semibold text-right">ส่วนต่างเทียบเกณฑ์</th>
                                    <th className="py-2.5 px-3 font-semibold text-right">จ่ายปีงบ</th>
                                    <th className="py-2.5 px-3 font-semibold text-center">ดูสูตร & สถิติ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                                            ไม่พบรายการยาในกลุ่มนี้ที่ตรงกับคำค้นหา
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((drug, idx) => (
                                        <tr
                                            key={drug.icode}
                                            onClick={() => onSelectDrug(drug.icode)}
                                            className="hover:bg-teal-50/40 cursor-pointer transition group"
                                            title="คลิกเพื่อดูแจกแจงสูตรคำนวณ ว.111 และสถิติจ่าย 12 เดือน"
                                        >
                                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                            <td className="py-2.5 px-3 font-medium">
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
                                                        'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                                                        drug.is_ed
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                    )}
                                                >
                                                    {drug.drugaccount || (drug.is_ed ? 'ED' : 'NED')}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono">
                                                {formatBaht(drug.unitcost)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                                {formatBaht(drug.unitprice)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-teal-800 font-semibold">
                                                {formatBaht(drug.tier_price)}
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
                                                    {formatBaht(drug.diff_vs_tier)}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                                {formatNumber(drug.fy_qty || 0, 0)}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectDrug(drug.icode);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 transition"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    <span>เจาะลึก</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between rounded-b-3xl">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onViewInTable();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                    >
                        <Table className="h-3.5 w-3.5 text-teal-600" />
                        <span>ไปดูและกรองในตารางหลัก</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
}
