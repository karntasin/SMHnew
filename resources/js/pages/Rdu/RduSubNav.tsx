import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Activity, Building2, ClipboardList, Pill, Syringe } from 'lucide-react';
import PharmacySubNav from '@/pages/Pharmacy/PharmacySubNav';

type TabKey = 'rdu.index' | 'rdu.cases' | 'rdu.drugs' | 'rdu.drugs.antibiotics' | 'rdu.drugs.by-department';

const tabs: { key: TabKey; label: string; hint: string; icon: typeof Activity }[] = [
    { key: 'rdu.index', label: 'ตัวชี้วัด RDU', hint: 'ภาพรวมคุณภาพยา', icon: Activity },
    { key: 'rdu.cases', label: 'Case Audit', hint: 'ทบทวนรายเคส', icon: ClipboardList },
    { key: 'rdu.drugs', label: 'การใช้ยารวม', hint: 'Drug utilization', icon: Pill },
    { key: 'rdu.drugs.antibiotics', label: 'ยาปฏิชีวนะ', hint: 'Antibiotic focus', icon: Syringe },
    { key: 'rdu.drugs.by-department', label: 'ตามแผนก/แพทย์', hint: 'Department & doctor', icon: Building2 },
];

export default function RduSubNav({
    active,
    startDate,
    endDate,
    visitType,
}: {
    active: TabKey;
    startDate: string;
    endDate: string;
    visitType?: string | null;
}) {
    const params: Record<string, string> = { start_date: startDate, end_date: endDate };
    if (visitType) {
        params.visit_type = visitType;
    }

    return (
        <div className="space-y-3">
            <PharmacySubNav active={active} />

            <nav className="rounded-3xl border border-white/70 bg-white/85 p-2 shadow-xl shadow-emerald-900/5 backdrop-blur">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        RDU Quality Workspace
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                        เชื่อมข้อมูล HOSxP
                    </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = active === tab.key;

                        return (
                            <Link
                                key={tab.key}
                                href={route(tab.key, params)}
                                className={cn(
                                    'group relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-300',
                                    'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/10',
                                    isActive
                                        ? 'border-emerald-400 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-900/20'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-slate-900',
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={cn(
                                            'flex h-9 w-9 items-center justify-center rounded-xl transition',
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 text-emerald-700 group-hover:bg-white',
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">{tab.label}</span>
                                        <span className={cn('block text-[11px]', isActive ? 'text-emerald-50' : 'text-slate-400')}>
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
        </div>
    );
}
