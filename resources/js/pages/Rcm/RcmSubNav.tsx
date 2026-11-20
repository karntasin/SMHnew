import React from 'react';
import { Link } from '@inertiajs/react';
import {
    LayoutDashboard,
    ShieldCheck,
    Pill,
    BedDouble,
    Receipt,
    Banknote,
    Scale,
    FileEdit,
    Activity,
    Heart,
    FolderDown,
    Building2,
} from 'lucide-react';

interface RcmSubNavProps {
    active: 'dashboard' | 'scrubber' | 'csop' | 'cipn' | 'reconcile' | 'import' | 'smt' | 'monthly' | 'dialysis' | 'uc' | 'uc-hospital' | 'file-patch';
}

export default function RcmSubNav({ active }: RcmSubNavProps) {
    const navItems = [
        {
            key: 'dashboard',
            label: 'ภาพรวม',
            href: route('rcm.dashboard'),
            icon: LayoutDashboard,
        },
        {
            key: 'import',
            label: 'นำเข้าข้อมูล',
            href: route('rcm.import.index'),
            icon: FolderDown,
        },
        {
            key: 'scrubber',
            label: 'ตรวจก่อนเบิก',
            href: route('rcm.scrubber'),
            icon: ShieldCheck,
        },
        {
            key: 'csop',
            label: 'CSOP (OPD)',
            href: route('rcm.csop.index'),
            icon: Pill,
        },
        {
            key: 'cipn',
            label: 'CIPN (IPD)',
            href: route('rcm.cipn.index'),
            icon: BedDouble,
        },
        {
            key: 'reconcile',
            label: 'กระทบยอด STM',
            href: route('rcm.reconcile.index'),
            icon: Receipt,
        },
        {
            key: 'monthly',
            label: 'เปรียบเทียบ 3 ฝ่าย',
            href: route('rcm.monthly.index'),
            icon: Scale,
        },
        {
            key: 'dialysis',
            label: 'ไตเทียม (HD / SMT)',
            href: route('rcm.dialysis.index'),
            icon: Activity,
        },
        {
            key: 'uc',
            label: 'บัตรทอง (UC)',
            href: route('rcm.uc.index'),
            icon: Heart,
        },
        {
            key: 'uc-hospital',
            label: 'บัตรทอง รพ',
            href: route('rcm.uc-hospital.index'),
            icon: Building2,
        },
        {
            key: 'smt',
            label: 'จ่ายเงิน SMT',
            href: route('rcm.smt.index'),
            icon: Banknote,
        },
        {
            key: 'file-patch',
            label: 'ปรับปรุงแฟ้ม',
            href: route('rcm.file-patch.index'),
            icon: FileEdit,
        },
    ];

    return (
        <div className="bg-white border-b border-slate-200/80 shadow-2xs mb-5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* Compact Title Area */}
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-lg text-white shadow-2xs">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-slate-800 tracking-tight">ระบบบริหารวงจรรายได้ (RCM)</h1>
                            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                CSOP / CIPN / STM
                            </span>
                        </div>
                    </div>

                    {/* Compact Segmented Navigation Control */}
                    <nav className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 shadow-2xs">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = active === item.key;
                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200/80 font-bold'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </div>
    );
}
