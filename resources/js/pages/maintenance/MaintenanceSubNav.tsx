import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { ClipboardList, LayoutDashboard, Settings2, User, Wrench } from 'lucide-react';

export type MaintenanceTabKey =
    | 'maintenance.dashboard'
    | 'maintenance.requests.index'
    | 'maintenance.requests.my'
    | 'technician.work-orders.index'
    | 'maintenance.settings.index';

const tabs: { key: MaintenanceTabKey; label: string; hint: string; icon: typeof Wrench }[] = [
    { key: 'maintenance.dashboard', label: 'ภาพรวม', hint: 'เลือกหมวด/แจ้งซ่อม', icon: LayoutDashboard },
    { key: 'maintenance.requests.index', label: 'รายการแจ้งซ่อม', hint: 'อนุมัติ/ติดตาม', icon: ClipboardList },
    { key: 'maintenance.requests.my', label: 'ของฉัน', hint: 'รายการที่แจ้งไว้', icon: User },
    { key: 'technician.work-orders.index', label: 'ใบงานช่าง', hint: 'รับงาน/อัปเดต', icon: Wrench },
    { key: 'maintenance.settings.index', label: 'ตั้งค่า', hint: 'หมวด/ความสำคัญ', icon: Settings2 },
];

export default function MaintenanceSubNav({ active }: { active: MaintenanceTabKey }) {
    return (
        <nav className="rounded-3xl border border-orange-100/80 bg-white/90 p-2 shadow-xl shadow-orange-900/5 backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                    <Wrench className="h-3.5 w-3.5" />
                    Maintenance Workspace
                </div>
                <div className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-700">
                    ระบบแจ้งซ่อม
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
                                'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-900/10',
                                isActive
                                    ? 'border-orange-400 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white shadow-lg shadow-orange-900/20'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50/60 hover:text-slate-900',
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-xl transition',
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-orange-700 group-hover:bg-white',
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold">{tab.label}</span>
                                    <span className={cn('block text-[11px]', isActive ? 'text-orange-50' : 'text-slate-400')}>
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
