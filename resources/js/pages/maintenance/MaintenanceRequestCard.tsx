import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarDays, MapPin, User, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const MAINT_STATUS_LABELS: Record<string, string> = {
    pending: 'รอดำเนินการ',
    assigned: 'มอบหมายแล้ว',
    in_progress: 'กำลังดำเนินการ',
    maintenance_completed: 'ซ่อมเสร็จ (รอตรวจ)',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
};

export const MAINT_STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-400 text-slate-900',
    assigned: 'bg-sky-500 text-white',
    in_progress: 'bg-violet-500 text-white',
    maintenance_completed: 'bg-lime-500 text-white',
    completed: 'bg-emerald-500 text-white',
    cancelled: 'bg-slate-400 text-white',
};

interface RequestItem {
    id: number;
    ticket_number: string;
    title: string;
    description?: string;
    location?: string;
    status: string;
    created_at: string;
    category?: { name: string; color?: string } | null;
    priority?: { name: string; color?: string } | null;
    requester?: { name: string } | null;
    images?: { image_path: string }[];
}

function imageUrl(path?: string) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `/storage/${path.replace(/^\//, '')}`;
}

export default function MaintenanceRequestCard({
    request,
    showRequester = true,
}: {
    request: RequestItem;
    showRequester?: boolean;
}) {
    const color = request.category?.color || request.priority?.color || '#f97316';
    const firstImage = imageUrl(request.images?.[0]?.image_path);

    return (
        <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/10">
            <div className="relative p-3 pb-0">
                <div
                    className="relative overflow-hidden rounded-2xl p-[3px]"
                    style={{ background: `linear-gradient(135deg, ${color} 0%, #fdba74 55%, ${color}88 100%)` }}
                >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-slate-100">
                        {firstImage ? (
                            <img
                                src={firstImage}
                                alt={request.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-300">
                                <Wrench className="h-12 w-12" />
                                <span className="text-xs text-slate-400">ไม่มีรูปประกอบ</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute left-3 top-3">
                            <Badge className={cn('border-0', MAINT_STATUS_BADGE[request.status] || 'bg-slate-500 text-white')}>
                                {MAINT_STATUS_LABELS[request.status] || request.status}
                            </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="line-clamp-1 text-lg font-bold text-white drop-shadow">{request.title}</h3>
                            <p className="text-xs text-white/85">{request.ticket_number}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3 p-4">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-600">{request.description || '-'}</p>
                <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                    {request.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-orange-600" />
                            <span className="truncate">{request.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-orange-600" />
                        <span>{format(new Date(request.created_at), 'd MMM yyyy HH:mm', { locale: th })}</span>
                    </div>
                    {showRequester && (
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-orange-600" />
                            <span>แจ้งโดย {request.requester?.name || '-'}</span>
                        </div>
                    )}
                    {request.category && (
                        <Badge variant="outline" className="rounded-full">
                            {request.category.name}
                        </Badge>
                    )}
                </div>
                <Link href={route('maintenance.requests.show', request.id)}>
                    <Button className="w-full rounded-xl bg-orange-600 hover:bg-orange-700">ดูรายละเอียด</Button>
                </Link>
            </div>
        </article>
    );
}
