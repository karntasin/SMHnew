import React from 'react';
import RcmLayout from './RcmLayout';
import { Link } from '@inertiajs/react';
import {
    Wallet,
    CheckCircle2,
    Clock,
    AlertOctagon,
    ArrowUpRight,
    Pill,
    BedDouble,
    ShieldAlert,
    TrendingUp,
    FileSpreadsheet,
    FileText,
    Database,
    RotateCcw,
    Banknote,
    Sparkles,
    Building2,
} from 'lucide-react';

interface DashboardProps {
    filters: {
        start_date: string;
        end_date: string;
    };
    smt_summary?: {
        total_all: number;
        total_lgo: number;
        total_uc: number;
        total_ckd: number;
        count_all: number;
        count_lgo: number;
        count_uc: number;
        count_ckd: number;
        last_synced_at: string | null;
    };
    stats: {
        total_claimed: number;
        total_approved: number;
        total_shortfall: number;
        total_pending: number;
        csop_claimed: number;
        cipn_claimed: number;
        clean_claim_rate: number;
        appeal_pending_cases: number;
        appeal_recovered_amount: number;
    };
    recent_batches: Array<{
        id: number;
        batch_no: string;
        claim_type: string;
        scheme_code: string;
        total_cases: number;
        total_claim_amount: number;
        clean_claim_rate: number;
        status: string;
        created_at: string;
    }>;
    hosxp_ready: boolean;
}

export default function Dashboard({ stats, recent_batches, hosxp_ready, smt_summary }: DashboardProps) {
    const formatMoney = (val: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);

    return (
        <RcmLayout title="ภาพรวมวงจรรายได้ (RCM Overview)" active="dashboard">
            {/* HOSxP Status Banner */}
            {!hosxp_ready && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertOctagon className="w-5 h-5 text-amber-600" />
                        <div>
                            <span className="font-semibold">ฐานข้อมูล HOSxP ออฟไลน์</span>: ไม่สามารถเชื่อมต่อ hosxp
                            connection ได้ ระบบจะแสดงผลจากฐานข้อมูลแคชภายใน
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* 1. ยอดตั้งเบิกสะสม */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-500">ยอดตั้งเบิกสะสม (Claimed)</span>
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mb-1">
                        {formatMoney(stats.total_claimed)}
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-1.5">
                        <span className="text-blue-600 font-semibold flex items-center">
                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> CSOP + CIPN
                        </span>
                        <span>รวมทุกสิทธิเบิกจ่ายตรง</span>
                    </div>
                </div>

                {/* 2. ยอดเงินชดเชยที่ได้รับจริง */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-500">ยอดชดเชยที่ได้รับ (Approved)</span>
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mb-1">
                        {formatMoney(stats.total_approved)}
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-1.5">
                        <span className="text-emerald-600 font-semibold">
                            {stats.total_claimed > 0
                                ? ((stats.total_approved / stats.total_claimed) * 100).toFixed(1)
                                : '0.0'}
                            %
                        </span>
                        <span>อัตราการชดเชยเฉลี่ย (Recovery Rate)</span>
                    </div>
                </div>

                {/* 3. ยอดส่วนต่างขาดหาย (Shortfall) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-500">ส่วนต่างขาดหาย (Shortfall)</span>
                        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                            <AlertOctagon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-rose-600 mb-1">
                        {formatMoney(stats.total_shortfall)}
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-1.5">
                        <Link
                            href={route('rcm.reconcile.index')}
                            className="text-rose-600 font-semibold hover:underline flex items-center"
                        >
                            ดูเคสที่ถูกตัดเงิน <ArrowUpRight className="w-3 h-3 ml-0.5" />
                        </Link>
                    </div>
                </div>

                {/* 4. อัตราความสมบูรณ์ของเคลม (Clean Claim Rate) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-500">อัตราเคลมสมบูรณ์ (Clean Rate)</span>
                        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                        {stats.clean_claim_rate}%
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-1.5">
                        <span className="text-purple-600 font-semibold">Pre-audit Scrubber</span>
                        <span>ผ่านเกณฑ์พร้อมส่งเบิก</span>
                    </div>
                </div>
            </div>

            {/* SMT NHSO Smart Money Transfer Quick Panel */}
            <div className="mb-8 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                            <Banknote className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">
                                    การจ่ายเงินจริง สปสช. (Smart Money Transfer - SMT)
                                </h3>
                                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                                    เชื่อมต่อระบบ สปสช. อัตโนมัติ
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                รายงานเงินโอนจริงเข้าบัญชี รพ. แยกตามกองทุน อปท. (LGO), กองทุนไตวายเรื้อรัง (CKD), บัตรทอง (UC) เขต 6 ระยอง / สระแก้ว (14689)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('rcm.smt.index')}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl shadow-xs transition"
                        >
                            <Sparkles className="w-4 h-4" /> ดูรายงาน SMT & ดึงข้อมูลสด
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase text-blue-700">อปท. (LGO ท้องถิ่น)</span>
                            <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="mt-2 text-xl font-bold text-blue-950">
                            {formatMoney(smt_summary?.total_lgo || 0)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                            {smt_summary?.count_lgo || 0} งวดโอน
                        </div>
                    </div>

                    <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase text-purple-700">กองทุนไตวายเรื้อรัง (CKD)</span>
                            <Sparkles className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="mt-2 text-xl font-bold text-purple-950">
                            {formatMoney(smt_summary?.total_ckd || 0)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-purple-600 font-medium">
                            {smt_summary?.count_ckd || 0} งวดโอน (แยกเด็ดขาด)
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase text-amber-700">บัตรทอง (UC ทั่วไป)</span>
                            <Wallet className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="mt-2 text-xl font-bold text-amber-950">
                            {formatMoney(smt_summary?.total_uc || 0)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                            {smt_summary?.count_uc || 0} งวดโอน (ไม่รวมไต)
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase text-slate-500">ยอดเงินโอนรวมทุกกองทุน</span>
                            <Banknote className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2 text-xl font-bold text-slate-900">
                            {formatMoney(smt_summary?.total_all || 0)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                            {smt_summary?.count_all || 0} งวดโอน
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section: CSOP vs CIPN Comparison & Quick Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* CSOP OPD Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                                <Pill className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">CSOP - ค่ายาผู้ป่วยนอก</h3>
                                <p className="text-xs text-slate-500">สิทธิเบิกจ่ายตรง กรมบัญชีกลาง / อปท.</p>
                            </div>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">ยอดตั้งเบิกสะสม</span>
                                <span className="font-semibold text-slate-800">
                                    {formatMoney(stats.csop_claimed)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">จุดเน้นการ Audit</span>
                                <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                                    TMT 24 หลัก & ยา NED
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('rcm.csop.index')}
                            className="flex-1 text-center py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl transition"
                        >
                            จัดการ CSOP
                        </Link>
                        <Link
                            href={route('rcm.csop.summary-excel')}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            title="Export Excel"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* CIPN IPD Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <BedDouble className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">CIPN - ผู้ป่วยใน 16 หมวด</h3>
                                <p className="text-xs text-slate-500">DRG, AdjRW, ค่าห้อง & อุปกรณ์อวัยวะเทียม</p>
                            </div>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">ยอดตั้งเบิกสะสม</span>
                                <span className="font-semibold text-slate-800">
                                    {formatMoney(stats.cipn_claimed)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">จุดเน้นการ Audit</span>
                                <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                                    AdjRW=0 & เพดานค่าห้อง
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('rcm.cipn.index')}
                            className="flex-1 text-center py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition"
                        >
                            จัดการ CIPN
                        </Link>
                        <Link
                            href={route('rcm.cipn.summary-excel')}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            title="Export Excel"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Appeals & Recovery Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <RotateCcw className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">การอุทธรณ์เงินชดเชย</h3>
                                <p className="text-xs text-slate-500">กู้คืนรายได้จากเคสที่ถูกปฏิเสธจ่าย / C-Deny</p>
                            </div>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">เคสรอผลการอุทธรณ์</span>
                                <span className="font-semibold text-amber-600">
                                    {stats.appeal_pending_cases} เคส
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">เงินที่กู้คืนได้สำเร็จ</span>
                                <span className="font-semibold text-emerald-600">
                                    {formatMoney(stats.appeal_recovered_amount)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Link
                        href={route('rcm.reconcile.index')}
                        className="w-full text-center py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl transition"
                    >
                        ระบบอุทธรณ์ One-Click Appeal
                    </Link>
                </div>
            </div>

            {/* Bottom Section: Recent Batches */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800">ชุดส่งเบิกและสถานะล่าสุด (Recent Claim Batches)</h3>
                        <p className="text-xs text-slate-500">ประวัติการรวมชุดส่งออกเคลม CSOP / CIPN</p>
                    </div>
                    <Link
                        href={route('rcm.scrubber')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                        <ShieldAlert className="w-4 h-4" /> ตรวจสอบเคสใหม่ (Smart Scrubber)
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500">
                                <th className="py-3 px-4">เลขชุดเบิก (Batch No)</th>
                                <th className="py-3 px-4">ประเภท</th>
                                <th className="py-3 px-4">สิทธิ</th>
                                <th className="py-3 px-4 text-center">จำนวนเคส</th>
                                <th className="py-3 px-4 text-right">ยอดตั้งเบิก</th>
                                <th className="py-3 px-4 text-center">Clean Rate</th>
                                <th className="py-3 px-4 text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {recent_batches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">
                                        ยังไม่มีประวัติการส่งออกชุดเบิกในระบบ สามารถเริ่มตรวจสอบและรวมชุดได้ที่หน้า Smart Scrubber
                                    </td>
                                </tr>
                            ) : (
                                recent_batches.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                                        <td className="py-3 px-4 font-mono font-medium text-emerald-700">
                                            {b.batch_no}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                                    b.claim_type === 'CSOP'
                                                        ? 'bg-teal-100 text-teal-800'
                                                        : 'bg-indigo-100 text-indigo-800'
                                                }`}
                                            >
                                                {b.claim_type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-medium">{b.scheme_code}</td>
                                        <td className="py-3 px-4 text-center">{b.total_cases}</td>
                                        <td className="py-3 px-4 text-right font-medium">
                                            {formatMoney(b.total_claim_amount)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="font-semibold text-emerald-600">
                                                {b.clean_claim_rate}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {b.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </RcmLayout>
    );
}
