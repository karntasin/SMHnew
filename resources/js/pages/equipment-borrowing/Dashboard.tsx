import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Plus, Search, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import EquipmentSubNav from './EquipmentSubNav';
import EquipmentCatalogCard, { EquipmentItem } from './EquipmentCatalogCard';
import BorrowingCard from './BorrowingCard';

interface DashboardProps {
    stats: {
        equipment_total: number;
        equipment_units_total: number;
        equipment_available: number;
        equipment_borrowed: number;
        borrowings_total: number;
        pending: number;
        borrowed: number;
        overdue: number;
        returned: number;
    };
    recentBorrowings: any[];
    pendingBorrowings: any[];
    equipmentCatalog: EquipmentItem[];
}

export default function Dashboard({ stats, recentBorrowings, pendingBorrowings, equipmentCatalog }: DashboardProps) {
    const [search, setSearch] = useState('');
    const [scheduleTab, setScheduleTab] = useState<'recent' | 'pending'>('recent');

    const filteredEquipment = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return equipmentCatalog;
        return equipmentCatalog.filter((item) =>
            [item.name, item.asset_code, item.brand, item.location, item.category?.name]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
        );
    }, [equipmentCatalog, search]);

    const scheduleItems = scheduleTab === 'pending' ? pendingBorrowings : recentBorrowings;

    const borrowEquipment = (equipmentId: number) => {
        router.visit(route('equipment-borrowing.borrowings.create', { equipment_id: equipmentId }));
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'ยืมอุปกรณ์แพทย์', href: route('equipment-borrowing.dashboard') }]}>
            <Head title="ยืมอุปกรณ์แพทย์" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.12),_transparent_45%)]" />
                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <EquipmentSubNav active="equipment-borrowing.dashboard" />

                    <section className="overflow-hidden rounded-[2rem] border border-teal-100 bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-900 p-6 text-white shadow-2xl shadow-teal-900/20 md:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100 backdrop-blur">
                                    <Stethoscope className="h-3.5 w-3.5" />
                                    ระบบยืมอุปกรณ์ทางการแพทย์
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">เบิก-คืน อุปกรณ์เครื่องมือแพทย์</h1>
                                <p className="text-sm text-teal-100/80 md:text-base">
                                    รายการตามแบบฟอร์มเบิก/คืน 22 รายการ · สต็อกเริ่มต้นอย่างละ 5 ชิ้นหรือชุด · เลือกจากรูปแล้วขอยืมได้ทันที
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <a href={route('equipment-borrowing.borrowings.export')}>
                                    <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export
                                    </Button>
                                </a>
                                <Link href={route('equipment-borrowing.borrowings.create')}>
                                    <Button className="bg-emerald-400 text-slate-900 hover:bg-emerald-300">
                                        <Plus className="mr-2 h-4 w-4" />
                                        ขอยืมอุปกรณ์
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            {[
                                { label: 'รายการอุปกรณ์', value: stats?.equipment_total ?? 0 },
                                { label: 'คงเหลือ', value: stats?.equipment_available ?? 0 },
                                { label: 'ยืมอยู่', value: stats?.equipment_borrowed ?? 0 },
                                { label: 'รออนุมัติ', value: stats?.pending ?? 0 },
                                { label: 'เลยกำหนด', value: stats?.overdue ?? 0 },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                    <div className="text-2xl font-bold">{item.value}</div>
                                    <div className="text-xs text-teal-100/70">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">อุปกรณ์ทั้งหมด</h2>
                                <p className="text-sm text-slate-500">เลือกจากรูปแล้วกดขอยืมได้เลย</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="ค้นหาชื่อ / รหัส / หมวด..."
                                    className="rounded-xl border-teal-100 bg-white/90 pl-9 shadow-sm"
                                />
                            </div>
                        </div>

                        {filteredEquipment.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500">
                                ยังไม่มีอุปกรณ์ในระบบ
                                <div className="mt-4">
                                    <Link href={route('equipment-borrowing.equipment.index')}>
                                        <Button>ไปจัดการอุปกรณ์</Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {filteredEquipment.map((item) => (
                                    <EquipmentCatalogCard key={item.id} item={item} onBorrow={borrowEquipment} />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur md:p-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">รายการยืมล่าสุด</h2>
                                <p className="text-sm text-slate-500">ติดตามสถานะการยืม-คืนอุปกรณ์</p>
                            </div>
                            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setScheduleTab('recent')}
                                    className={cn(
                                        'rounded-xl px-4 py-2 text-sm font-medium transition',
                                        scheduleTab === 'recent' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500',
                                    )}
                                >
                                    ล่าสุด
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduleTab('pending')}
                                    className={cn(
                                        'rounded-xl px-4 py-2 text-sm font-medium transition',
                                        scheduleTab === 'pending' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500',
                                    )}
                                >
                                    รออนุมัติ ({stats?.pending ?? 0})
                                </button>
                            </div>
                        </div>

                        {scheduleItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
                                ยังไม่มีรายการในช่วงนี้
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {scheduleItems.map((borrowing) => (
                                    <BorrowingCard key={borrowing.id} borrowing={borrowing} />
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link href={route('equipment-borrowing.borrowings.index')}>
                                <Button variant="outline" className="rounded-xl">ดูรายการยืมทั้งหมด</Button>
                            </Link>
                            <Link href={route('equipment-borrowing.borrowings.my')}>
                                <Button variant="outline" className="rounded-xl">การยืมของฉัน</Button>
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
