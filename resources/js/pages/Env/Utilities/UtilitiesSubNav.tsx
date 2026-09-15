import { Link } from '@inertiajs/react';
import { LayoutDashboard, Droplets, LockKeyhole } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UtilitiesTabKey = 'overview' | 'sp3';

const tabs: { key: UtilitiesTabKey; label: string; hint: string; icon: typeof LayoutDashboard; href: () => string }[] = [
    {
        key: 'overview',
        label: 'ภาพรวมค่าใช้จ่าย',
        hint: 'รวมมิเตอร์แอร์ · ไม่รวม สป.3',
        icon: LayoutDashboard,
        href: () => route('env.utilities.index'),
    },
    {
        key: 'sp3',
        label: 'สป.3',
        hint: 'ใส่รหัสทุกครั้งที่เข้าดู',
        icon: LockKeyhole,
        href: () => route('env.utilities.sp3'),
    },
];

export default function UtilitiesSubNav({ active }: { active: UtilitiesTabKey }) {
    return (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.key;
                return (
                    <Link
                        key={tab.key}
                        href={tab.href()}
                        className={cn(
                            'flex items-start gap-3 rounded-2xl border px-4 py-3 transition',
                            isActive
                                ? 'border-cyan-600 bg-cyan-600 text-white shadow-md shadow-cyan-700/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/60',
                        )}
                    >
                        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-cyan-700')} />
                        <div>
                            <div className="text-sm font-semibold">{tab.label}</div>
                            <div className={cn('text-xs', isActive ? 'text-cyan-50' : 'text-slate-500')}>{tab.hint}</div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

export function UtilitiesHint() {
    return (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/50 px-3 py-2 text-xs text-cyan-900">
            <Droplets className="h-4 w-4 shrink-0" />
            มิเตอร์แอร์รวมในภาพรวมแล้ว · สป.3 ไม่แสดง — เข้าเมนู สป.3 และใส่รหัสทุกครั้งที่เข้าดู
        </div>
    );
}
