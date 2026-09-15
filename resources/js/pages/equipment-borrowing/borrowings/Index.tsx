import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { Download, Plus } from 'lucide-react';
import EquipmentSubNav from '../EquipmentSubNav';
import BorrowingCard from '../BorrowingCard';

interface Props {
    borrowings: { data: any[]; links: any[] };
    filters: { status?: string; search?: string; start_date?: string; end_date?: string };
    statusOptions: Record<string, string>;
}

export default function BorrowingsIndex({ borrowings, filters, statusOptions }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(filters.end_date || new Date().toISOString().slice(0, 10));

    const exportUrl = route('equipment-borrowing.borrowings.export', {
        start_date: startDate,
        end_date: endDate,
        status: filters.status || undefined,
        search: filters.search || undefined,
    });

    const applyFilters = (extra: Record<string, string | undefined> = {}) => {
        router.get(
            route('equipment-borrowing.borrowings.index'),
            { ...filters, start_date: startDate, end_date: endDate, ...extra },
            { preserveState: true },
        );
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ยืมอุปกรณ์แพทย์', href: route('equipment-borrowing.dashboard') },
            { title: 'รายการยืมทั้งหมด', href: '#' },
        ]}>
            <Head title="รายการยืมทั้งหมด" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <EquipmentSubNav active="equipment-borrowing.borrowings.index" />

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">รายการยืมทั้งหมด</h1>
                        <p className="text-sm text-slate-500">อนุมัติและติดตามการยืม-คืนอุปกรณ์</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a href={exportUrl}>
                            <Button variant="outline" className="rounded-xl"><Download className="mr-2 h-4 w-4" />Export Excel</Button>
                        </a>
                        <Link href={route('equipment-borrowing.borrowings.create')}>
                            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700"><Plus className="mr-2 h-4 w-4" />ขอยืมใหม่</Button>
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white/90 p-4">
                    <div>
                        <label className="text-xs text-muted-foreground">ตั้งแต่</label>
                        <ThaiDatePicker value={startDate} onChange={setStartDate} />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground">ถึง</label>
                        <ThaiDatePicker value={endDate} onChange={setEndDate} />
                    </div>
                    <Button variant="secondary" className="rounded-xl" onClick={() => applyFilters()}>กรอง</Button>
                    <Input
                        placeholder="ค้นหา..."
                        defaultValue={filters.search}
                        className="max-w-xs rounded-xl"
                        onKeyDown={(e) =>
                            e.key === 'Enter' &&
                            applyFilters({ search: (e.target as HTMLInputElement).value })
                        }
                    />
                    <Select
                        value={filters.status || 'all'}
                        onValueChange={(v) => applyFilters({ status: v === 'all' ? '' : v })}
                    >
                        <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="สถานะ" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ทุกสถานะ</SelectItem>
                            {Object.entries(statusOptions).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {borrowings.data.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                        ไม่พบรายการยืม
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {borrowings.data.map((b) => (
                            <BorrowingCard key={b.id} borrowing={b} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
