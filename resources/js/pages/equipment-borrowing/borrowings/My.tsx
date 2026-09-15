import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import EquipmentSubNav from '../EquipmentSubNav';
import BorrowingCard from '../BorrowingCard';

interface Props {
    borrowings: { data: any[] };
    filters: { status?: string };
    statusOptions: Record<string, string>;
}

export default function MyBorrowings({ borrowings, filters, statusOptions }: Props) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'ยืมอุปกรณ์แพทย์', href: route('equipment-borrowing.dashboard') },
            { title: 'การยืมของฉัน', href: '#' },
        ]}>
            <Head title="การยืมของฉัน" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <EquipmentSubNav active="equipment-borrowing.borrowings.my" />

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">การยืมของฉัน</h1>
                        <p className="text-sm text-slate-500">ติดตามสถานะการยืมอุปกรณ์ของคุณ</p>
                    </div>
                    <Link href={route('equipment-borrowing.borrowings.create')}>
                        <Button className="rounded-xl bg-teal-600 hover:bg-teal-700"><Plus className="mr-2 h-4 w-4" />ขอยืมใหม่</Button>
                    </Link>
                </div>

                <Select
                    value={filters.status || 'all'}
                    onValueChange={(v) =>
                        router.get(route('equipment-borrowing.borrowings.my'), { status: v === 'all' ? '' : v }, { preserveState: true })
                    }
                >
                    <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="สถานะ" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ทุกสถานะ</SelectItem>
                        {Object.entries(statusOptions).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {borrowings.data.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                        ยังไม่มีรายการยืม
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {borrowings.data.map((b) => (
                            <BorrowingCard key={b.id} borrowing={b} showBorrower={false} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
