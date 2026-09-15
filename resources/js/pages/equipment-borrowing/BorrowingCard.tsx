import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock, DoorOpen, MapPin, Package, User } from 'lucide-react';
import { STATUS_BADGE, STATUS_LABELS, fmtSchedule } from './shared';

interface BorrowingItem {
    id: number;
    borrowing_number: string;
    purpose?: string | null;
    quantity?: number;
    status: string;
    borrow_date?: string | null;
    borrow_time?: string | null;
    expected_return_date?: string | null;
    expected_return_time?: string | null;
    borrower?: { name: string } | null;
    equipment?: {
        id?: number;
        name?: string;
        asset_code?: string;
        location?: string | null;
        image_url?: string | null;
        category?: { name: string; color: string } | null;
    } | null;
}

export default function BorrowingCard({ borrowing, showBorrower = true }: { borrowing: BorrowingItem; showBorrower?: boolean }) {
    const categoryColor = borrowing.equipment?.category?.color || '#0f766e';

    return (
        <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/10">
            <div className="relative p-3 pb-0">
                <div
                    className="relative overflow-hidden rounded-2xl p-[3px]"
                    style={{
                        background: `linear-gradient(135deg, ${categoryColor} 0%, #99f6e4 55%, ${categoryColor}88 100%)`,
                    }}
                >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-slate-100">
                        {borrowing.equipment?.image_url ? (
                            <img
                                src={borrowing.equipment.image_url}
                                alt={borrowing.equipment.name || 'อุปกรณ์'}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-300">
                                <Package className="h-12 w-12" />
                                <span className="text-xs text-slate-400">ไม่มีรูปอุปกรณ์</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute left-3 top-3">
                            <Badge className={cn('border-0', STATUS_BADGE[borrowing.status] || 'bg-slate-500 text-white')}>
                                {STATUS_LABELS[borrowing.status] || borrowing.status}
                            </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="truncate text-lg font-bold text-white drop-shadow">
                                {borrowing.equipment?.name || 'อุปกรณ์'}
                            </h3>
                            <p className="text-xs text-white/85">{borrowing.borrowing_number}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 p-4">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-600">{borrowing.purpose || '-'}</p>

                <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-teal-600" />
                        <span>ยืม {fmtSchedule(borrowing.borrow_date, borrowing.borrow_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-teal-600" />
                        <span>คืน {fmtSchedule(borrowing.expected_return_date, borrowing.expected_return_time)}</span>
                    </div>
                    {showBorrower && (
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-teal-600" />
                            <span>ยืมโดย {borrowing.borrower?.name || '-'}</span>
                        </div>
                    )}
                    {borrowing.quantity ? (
                        <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-teal-600" />
                            <span>จำนวน {borrowing.quantity} ชิ้น</span>
                        </div>
                    ) : null}
                    {borrowing.equipment?.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-teal-600" />
                            <span className="truncate">{borrowing.equipment.location}</span>
                        </div>
                    )}
                </div>

                <Link href={route('equipment-borrowing.borrowings.show', borrowing.id)}>
                    <Button className="w-full rounded-xl bg-teal-600 hover:bg-teal-700">ดูรายละเอียด</Button>
                </Link>
            </div>
        </article>
    );
}
