import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { LayoutDashboard, List } from 'lucide-react';

const tabs: QualityTab[] = [
    { key: 'quality-indicators.index', label: 'รายการตัวชี้วัด', hint: 'จัดการ KPI', icon: List },
    { key: 'quality-indicators.dashboard', label: 'ภาพรวม', hint: 'สถานะตัวชี้วัด', icon: LayoutDashboard },
];

export default function IndicatorsSubNav({ active }: { active: string }) {
    return (
        <QualitySubNav
            tone="emerald"
            workspaceLabel="ตัวชี้วัดคุณภาพ"
            workspaceBadge="ตัวชี้วัดคุณภาพ"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2"
        />
    );
}
