import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { MapPin, Package, Plus } from 'lucide-react';
import { stockBadgeClass } from './shared';

export interface EquipmentItem {
    id: number;
    name: string;
    asset_code: string;
    brand?: string | null;
    location?: string | null;
    image_url?: string | null;
    category?: { name: string; color: string } | null;
    status?: string;
    quantity_total: number;
    quantity_borrowed: number;
    quantity_available: number;
    borrowed_percent: number;
    stock_label: string;
    unit?: string | null;
}

interface Props {
    item: EquipmentItem;
    mode?: 'borrow' | 'manage';
    onBorrow?: (id: number) => void;
    onEdit?: (item: EquipmentItem) => void;
    historyHref?: string;
}

export default function EquipmentCatalogCard({ item, mode = 'borrow', onBorrow, onEdit, historyHref }: Props) {
    const categoryColor = item.category?.color || '#0f766e';
    const canBorrow = item.quantity_available > 0 && item.stock_label !== 'หมดสต็อก';
    const unit = item.unit || 'ชิ้น';

    return (
        <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/10">
            <div className="relative p-3 pb-0">
                <div
                    className="relative overflow-hidden rounded-2xl p-[3px]"
                    style={{
                        background: `linear-gradient(135deg, ${categoryColor} 0%, #99f6e4 55%, ${categoryColor}88 100%)`,
                    }}
                >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-gradient-to-br from-slate-50 via-white to-teal-50">
                        {item.image_url ? (
                            <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-300">
                                <Package className="h-12 w-12" />
                                <span className="text-xs text-slate-400">ยังไม่มีรูป</span>
                            </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                            {item.category && (
                                <Badge className="border-0 bg-white/90 text-slate-800 hover:bg-white">{item.category.name}</Badge>
                            )}
                            <Badge variant="outline" className={cn('border bg-white/90 text-[10px]', stockBadgeClass(item.stock_label))}>
                                {item.stock_label}
                            </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="truncate text-lg font-bold text-white drop-shadow">{item.name}</h3>
                            <p className="text-xs text-white/85">{item.asset_code}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 py-2">
                        <p className="text-slate-400">ทั้งหมด</p>
                        <p className="text-lg font-bold text-slate-800">{item.quantity_total}</p>
                        <p className="text-[10px] text-slate-400">{unit}</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 py-2">
                        <p className="text-violet-500">ยืมอยู่</p>
                        <p className="text-lg font-bold text-violet-700">{item.quantity_borrowed}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 py-2">
                        <p className="text-emerald-600">คงเหลือ</p>
                        <p className="text-lg font-bold text-emerald-700">{item.quantity_available}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>อัตราการยืม</span>
                        <span>{item.borrowed_percent}%</span>
                    </div>
                    <Progress value={item.borrowed_percent} className="h-2" />
                </div>
                {item.location && (
                    <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                    </p>
                )}

                {mode === 'borrow' ? (
                    <Button
                        className="w-full rounded-xl bg-teal-600 hover:bg-teal-700"
                        disabled={!canBorrow}
                        onClick={() => onBorrow?.(item.id)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {canBorrow ? 'ขอยืมอุปกรณ์' : 'สต็อกไม่พอ'}
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onEdit?.(item)}>
                            แก้ไข
                        </Button>
                        {historyHref && (
                            <Link href={historyHref} className="flex-1">
                                <Button variant="outline" className="w-full rounded-xl">
                                    ประวัติ
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
