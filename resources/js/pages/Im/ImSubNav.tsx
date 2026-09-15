import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Target,
    ShieldAlert,
    Lock,
    Headset,
    ClipboardCheck,
    FileCheck,
    Code2,
    Server,
    BookOpen,
} from 'lucide-react';

export type ImTabKey =
    | 'im.index'
    | 'im.master-plan'
    | 'im.risk'
    | 'im.security'
    | 'im.service-desk'
    | 'im.service-desk.evaluation'
    | 'im.medical-record'
    | 'im.software-qa'
    | 'im.resource'
    | 'im.manual';

const tabs: { key: ImTabKey; label: string; hint: string; icon: typeof Target }[] = [
    { key: 'im.index', label: 'ภาพรวม', hint: 'IM Dashboard', icon: LayoutDashboard },
    { key: 'im.master-plan', label: 'แผนแม่บท IT', hint: 'หมวด 1 · Strategy', icon: Target },
    { key: 'im.risk', label: 'ความเสี่ยง IT', hint: 'หมวด 2 · Risk', icon: ShieldAlert },
    { key: 'im.security', label: 'ความปลอดภัย/PDPA', hint: 'หมวด 3 · BCP/DRP', icon: Lock },
    { key: 'im.service-desk', label: 'Service Desk', hint: 'หมวด 4 · Incident', icon: Headset },
    { key: 'im.service-desk.evaluation', label: 'ประเมิน IT', hint: 'หมวด 4 · Evaluation', icon: ClipboardCheck },
    { key: 'im.medical-record', label: 'เวชระเบียน', hint: 'หมวด 5 · MR Audit', icon: FileCheck },
    { key: 'im.software-qa', label: 'พัฒนาโปรแกรม', hint: 'หมวด 6 · SDLC', icon: Code2 },
    { key: 'im.resource', label: 'ทรัพยากร/Change', hint: 'หมวด 7 · Resource', icon: Server },
    { key: 'im.manual', label: 'คู่มือ', hint: 'User Manual', icon: BookOpen },
];

export default function ImSubNav({ active }: { active: ImTabKey }) {
    return (
        <nav className="rounded-3xl border border-white/70 bg-white/85 p-2 shadow-xl shadow-sky-900/5 backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    IT Management Workspace
                </div>
                <div className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                    มาตรฐาน HAIT
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                                    ? 'border-sky-400 bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-sky-900/20'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50/50 hover:text-slate-900',
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition',
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-sky-700 group-hover:bg-white',
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold">{tab.label}</span>
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
