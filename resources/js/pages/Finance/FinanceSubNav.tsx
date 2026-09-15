import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { LayoutDashboard, BarChart3 } from 'lucide-react';

const tabs: QualityTab[] = [
    { key: 'finance.dashboard', label: 'แดชบอร์ด BMS', hint: 'Finance Dashboard', icon: LayoutDashboard },
    { key: 'finance.revenue', label: 'รายได้ตามสิทธิ์การรักษา', hint: 'รายงานรายได้ HOSxP', icon: BarChart3 },
];

export default function FinanceSubNav({ active }: { active: string }) {
    return (
        <QualitySubNav
            tone="emerald"
            workspaceLabel="รายงานการเงิน"
            workspaceBadge="รายงานการเงิน"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2"
        />
    );
}

export const financeBreadcrumbs = (extra?: { title: string; href: string }) => [
    { title: 'รายงานการเงิน', href: route('finance.revenue') },
    ...(extra ? [extra] : []),
];
