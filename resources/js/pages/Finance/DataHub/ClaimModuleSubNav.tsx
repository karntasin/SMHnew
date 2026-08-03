import { Link } from '@inertiajs/react';
import { FileCheck2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    dashboardUrl: string;
    importUrl: string;
    importLabel?: string;
    active: 'dashboard' | 'import';
    disabledImport?: boolean;
}

export default function ClaimModuleSubNav({
    dashboardUrl,
    importUrl,
    importLabel = 'นำเข้าไฟล์',
    active,
    disabledImport = false,
}: Props) {
    const items = [
        {
            key: 'dashboard' as const,
            label: 'ตรวจสอบ',
            hint: 'เปรียบเทียบกับ HOSxP',
            href: dashboardUrl,
            icon: FileCheck2,
            disabled: false,
        },
        {
            key: 'import' as const,
            label: importLabel,
            hint: 'อัปโหลดเฉพาะสิทธิ์นี้',
            href: importUrl,
            icon: Upload,
            disabled: disabledImport,
        },
    ];

    return (
        <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-2">
            {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                const className = cn(
                    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
                    isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                    item.disabled && !isActive && 'pointer-events-none opacity-50',
                );

                if (item.disabled && !isActive) {
                    return (
                        <span key={item.key} className={className} title="กำลังเตรียมระบบ">
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </span>
                    );
                }

                return (
                    <Link key={item.key} href={item.href} className={className}>
                        <Icon className="h-4 w-4" />
                        <span>
                            {item.label}
                            <span className={cn('ml-1 text-[11px] font-normal', isActive ? 'text-emerald-100' : 'text-slate-400')}>
                                {item.hint}
                            </span>
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
