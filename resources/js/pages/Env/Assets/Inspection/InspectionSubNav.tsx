import { Link } from '@inertiajs/react';
import { ClipboardList, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InspectionTabKey = 'catalog' | 'cycles';

const tabs: { key: InspectionTabKey; label: string; hint: string; icon: typeof ClipboardList; routeName: string }[] = [
    {
        key: 'catalog',
        label: 'รายการที่ต้องสอบเทียบ',
        hint: 'ครุภัณฑ์ที่กำหนดให้สอบเทียบ',
        icon: ClipboardList,
        routeName: 'env.assets.inspection',
    },
    {
        key: 'cycles',
        label: 'วงรอบการสอบเทียบ',
        hint: 'ลงทะเบียน · นัดสอบเทียบ · บันทึกผล · PDF',
        icon: CalendarRange,
        routeName: 'env.assets.inspection.cycles',
    },
];

export default function InspectionSubNav({ active }: { active: InspectionTabKey }) {
    return (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.key;

                return (
                    <Link
                        key={tab.key}
                        href={route(tab.routeName)}
                        className={cn(
                            'flex items-start gap-3 rounded-2xl border px-4 py-3 transition',
                            isActive
                                ? 'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-700/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/60',
                        )}
                    >
                        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-violet-700')} />
                        <div>
                            <div className="text-sm font-semibold">{tab.label}</div>
                            <div className={cn('text-xs', isActive ? 'text-violet-50' : 'text-slate-500')}>{tab.hint}</div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
