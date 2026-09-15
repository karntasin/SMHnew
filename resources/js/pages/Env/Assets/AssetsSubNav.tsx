import { Link } from '@inertiajs/react';
import { Box, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AssetsTabKey = 'list' | 'risk' | 'inspection';

const tabs: { key: AssetsTabKey; label: string; hint: string; icon: typeof Box; routeName: string }[] = [
    {
        key: 'list',
        label: 'รายการครุภัณฑ์',
        hint: 'บัญชีคุมทั้งหมด',
        icon: Box,
        routeName: 'env.assets.index',
    },
    {
        key: 'risk',
        label: 'ครุภัณฑ์ที่เสี่ยง',
        hint: 'ความเสี่ยง สูง / กลาง / ต่ำ',
        icon: ShieldAlert,
        routeName: 'env.assets.risk',
    },
    {
        key: 'inspection',
        label: 'การสอบเทียบครุภัณฑ์',
        hint: 'รายการที่ต้องสอบเทียบ · วงรอบ · รายงาน',
        icon: ClipboardCheck,
        routeName: 'env.assets.inspection',
    },
];

export default function AssetsSubNav({ active }: { active: AssetsTabKey }) {
    return (
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
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
                                ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-700/20'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/60',
                        )}
                    >
                        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-teal-700')} />
                        <div>
                            <div className="text-sm font-semibold">{tab.label}</div>
                            <div className={cn('text-xs', isActive ? 'text-teal-50' : 'text-slate-500')}>{tab.hint}</div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
