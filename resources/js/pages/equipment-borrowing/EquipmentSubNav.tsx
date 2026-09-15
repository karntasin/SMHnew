import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { ClipboardList, LayoutGrid, Package, Settings2, Stethoscope, User } from 'lucide-react';

export type EquipmentTabKey =
    | 'equipment-borrowing.dashboard'
    | 'equipment-borrowing.borrowings.index'
    | 'equipment-borrowing.borrowings.my'
    | 'equipment-borrowing.equipment.index'
    | 'equipment-borrowing.settings.index';

const tabs: { key: EquipmentTabKey; label: string; hint: string; icon: typeof LayoutGrid }[] = [
    { key: 'equipment-borrowing.dashboard', label: 'เลือกอุปกรณ์', hint: 'ยืมจากรูปอุปกรณ์', icon: LayoutGrid },
    { key: 'equipment-borrowing.borrowings.index', label: 'รายการยืม', hint: 'อนุมัติ/ติดตาม', icon: ClipboardList },
    { key: 'equipment-borrowing.borrowings.my', label: 'ของฉัน', hint: 'การยืมของฉัน', icon: User },
    { key: 'equipment-borrowing.equipment.index', label: 'จัดการอุปกรณ์', hint: 'รูป/สต็อก', icon: Package },
    { key: 'equipment-borrowing.settings.index', label: 'ตั้งค่า', hint: 'หมวดหมู่', icon: Settings2 },
];

export default function EquipmentSubNav({ active }: { active: EquipmentTabKey }) {
    return (
        <nav className="rounded-3xl border border-teal-100/80 bg-white/90 p-2 shadow-xl shadow-teal-900/5 backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Medical Equipment Workspace
                </div>
                <div className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-medium text-teal-700">
                    ยืมอุปกรณ์แพทย์
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
                                'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-900/10',
                                isActive
                                    ? 'border-teal-400 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 text-white shadow-lg shadow-teal-900/20'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50/60 hover:text-slate-900',
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-xl transition',
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-teal-700 group-hover:bg-white',
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold">{tab.label}</span>
                                    <span className={cn('block text-[11px]', isActive ? 'text-teal-50' : 'text-slate-400')}>
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
