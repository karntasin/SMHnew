import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { AlertTriangle, LayoutDashboard, Pill, ClipboardList, Warehouse } from 'lucide-react';

export type PharmacyChannel =
    | 'pharmacy.index'
    | 'pharmacy.inventory.index'
    | 'pharmacy.drug-alerts'
    | 'rdu.index'
    | 'drug-usage.index';

const channels: {
    key: PharmacyChannel;
    label: string;
    hint: string;
    icon: typeof Pill;
    matchPrefixes: string[];
}[] = [
    {
        key: 'pharmacy.index',
        label: 'ภาพรวมเภสัชกรรม',
        hint: 'เลือกช่องทางงาน',
        icon: LayoutDashboard,
        matchPrefixes: ['pharmacy.index'],
    },
    {
        key: 'pharmacy.inventory.index',
        label: 'คลังยา / ห้องยา',
        hint: 'สต็อก · lot · QR',
        icon: Warehouse,
        matchPrefixes: ['pharmacy.inventory.'],
    },
    {
        key: 'pharmacy.drug-alerts',
        label: 'แจ้งเตือนการใช้ยา',
        hint: 'eGFR × ยาเบาหวาน',
        icon: AlertTriangle,
        matchPrefixes: ['pharmacy.drug-alerts'],
    },
    {
        key: 'rdu.index',
        label: 'รายงาน RDU',
        hint: 'Rational Drug Use',
        icon: Pill,
        matchPrefixes: ['rdu.'],
    },
    {
        key: 'drug-usage.index',
        label: 'รายงานยาและการใช้ยา',
        hint: 'Drug utilization',
        icon: ClipboardList,
        matchPrefixes: ['drug-usage.'],
    },
];

function isChannelActive(channel: (typeof channels)[number], active: string): boolean {
    return channel.matchPrefixes.some((p) => active === p || active.startsWith(p));
}

export default function PharmacySubNav({ active }: { active: string }) {
    return (
        <nav className="rounded-3xl border border-teal-100/80 bg-white/90 p-2 shadow-xl shadow-teal-900/5 backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                    Pharmacy Workspace
                </div>
                <div className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-medium text-teal-700">
                    เภสัชกรรม · ศูนย์พัฒนาคุณภาพ
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {channels.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = isChannelActive(tab, active);

                    return (
                        <Link
                            key={tab.key}
                            href={route(tab.key)}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-300',
                                'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-900/10',
                                isActive
                                    ? 'border-teal-400 bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-600 text-white shadow-lg shadow-teal-900/20'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50/50 hover:text-slate-900',
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-xl transition',
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-teal-50 text-teal-700 group-hover:bg-teal-100',
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <div className={cn('truncate text-sm font-semibold', isActive ? 'text-white' : 'text-slate-800')}>
                                        {tab.label}
                                    </div>
                                    <div className={cn('truncate text-[11px]', isActive ? 'text-teal-50/90' : 'text-slate-500')}>
                                        {tab.hint}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export function pharmacyBreadcrumbs(extra: { title: string; href?: string }[] = []) {
    return [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: route('quality.index') },
        { title: 'เภสัชกรรม', href: route('pharmacy.index') },
        ...extra,
    ];
}
