import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { CalendarDays, ClipboardList, DoorOpen, LayoutGrid, Settings2, User } from 'lucide-react';

type TabKey = 'rooms.index' | 'rooms.bookings' | 'rooms.my' | 'rooms.calendar' | 'rooms.settings';

const tabs: { key: TabKey; label: string; hint: string; icon: typeof LayoutGrid }[] = [
    { key: 'rooms.index', label: 'เลือกห้อง', hint: 'จองจากรูปห้อง', icon: LayoutGrid },
    { key: 'rooms.bookings', label: 'รายการจอง', hint: 'อนุมัติ/ติดตาม', icon: ClipboardList },
    { key: 'rooms.my', label: 'ของฉัน', hint: 'การจองของฉัน', icon: User },
    { key: 'rooms.calendar', label: 'ปฏิทิน', hint: 'ตารางใช้ห้อง', icon: CalendarDays },
    { key: 'rooms.settings', label: 'ตั้งค่าห้อง', hint: 'รูป/อุปกรณ์', icon: Settings2 },
];

export default function RoomSubNav({ active }: { active: TabKey }) {
    return (
        <nav className="rounded-3xl border border-sky-100/80 bg-white/90 p-2 shadow-xl shadow-sky-900/5 backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    <DoorOpen className="h-3.5 w-3.5" />
                    Meeting Room Workspace
                </div>
                <div className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                    งานธุรการ · จองห้องประชุม
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = active === tab.key;

                    return (
                        <Link
                            key={tab.key}
                            href={route(tab.key)}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-300',
                                'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-900/10',
                                isActive
                                    ? 'border-sky-400 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 text-white shadow-lg shadow-sky-900/20'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50/60 hover:text-slate-900',
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-xl transition',
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-sky-700 group-hover:bg-white',
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold">{tab.label}</span>
                                    <span className={cn('block text-[11px]', isActive ? 'text-sky-50' : 'text-slate-400')}>
                                        {tab.hint}
                                    </span>
                                </span>
                            </div>
                            {isActive && <span className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/15" />}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
