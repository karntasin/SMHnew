import { Link, usePage } from '@inertiajs/react';
import { FilePlus2, Mic, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
    { id: 'list', label: 'รายการหนังสือ', icon: Mic },
    { id: 'write', label: 'เขียนหนังสือ', icon: FilePlus2 },
    { id: 'settings', label: 'ตั้งค่าหัวกระดาษ', icon: Settings2 },
] as const;

export default function MemoSubNav() {
    const { url } = usePage();
    const path = url.split('?')[0];
    const active = path.includes('/settings') ? 'settings' : path.includes('/create') || path.includes('/edit') ? 'write' : 'list';

    const hrefs: Record<(typeof tabs)[number]['id'], string> = {
        list: route('admin-docs.memos.index'),
        write: route('admin-docs.memos.create'),
        settings: route('admin-docs.memos.settings'),
    };

    return (
        <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.id;
                return (
                    <Link
                        key={tab.id}
                        href={hrefs[tab.id]}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700',
                        )}
                    >
                        <Icon className="size-4" />
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
