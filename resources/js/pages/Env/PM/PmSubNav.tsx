import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const tabs = [
    { key: 'dashboard', label: 'แดชบอร์ด', routeName: 'env.pm.index' },
    { key: 'calendar', label: 'ปฏิทิน', routeName: 'env.pm.calendar' },
    { key: 'orders', label: 'ใบสั่งงาน', routeName: 'env.pm.work-orders.index' },
    { key: 'standards', label: 'แผนมาตรฐาน', routeName: 'env.pm.standards.index' },
    { key: 'parts', label: 'อะไหล่', routeName: 'env.pm.parts.index' },
] as const;

export function criticalityLabel(level?: string | null) {
    const map: Record<string, string> = {
        A: 'High',
        B: 'Medium',
        C: 'Low',
        N: 'ไม่ระบุ',
    };

    return map[level || 'N'] || level || 'ไม่ระบุ';
}

export default function PmSubNav({ active }: { active: (typeof tabs)[number]['key'] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={route(tab.routeName)}
                    className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium',
                        active === tab.key
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200',
                    )}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}
