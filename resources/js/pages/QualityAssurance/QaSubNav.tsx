import { TONES } from '@/components/quality/quality-ui';
import { cn } from '@/lib/utils';

/** QA uses a single route with in-page tabs — this renders the workspace strip only. */
export default function QaSubNav() {
    const t = TONES.violet;
    return (
        <nav className={cn('rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl backdrop-blur', t.shadow)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={cn('text-xs font-semibold uppercase tracking-[0.2em]', t.navLabel)}>การติดตามทบทวนคุณภาพ</div>
                <div className={cn('rounded-full px-3 py-1 text-[11px] font-medium', t.navBadge)}>การติดตามทบทวน</div>
            </div>
        </nav>
    );
}

export const qaBreadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'Quality Assurance', href: route('quality-assurance.index') },
];
