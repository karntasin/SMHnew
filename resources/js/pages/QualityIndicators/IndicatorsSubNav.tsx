import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { BookOpen, LayoutDashboard, List, Upload } from 'lucide-react';

const tabs: QualityTab[] = [
    { key: 'quality-indicators.index', label: 'รายการตัวชี้วัด', hint: 'จัดการ KPI', icon: List },
    { key: 'quality-indicators.dashboard', label: 'ภาพรวม', hint: 'สถานะตัวชี้วัด', icon: LayoutDashboard },
    { key: 'quality-indicators.import.index', label: 'นำเข้า Excel', hint: 'เทมเพลต + ยืนยัน', icon: Upload },
    { key: 'quality-indicators.guide', label: 'คู่มือใช้งาน', hint: 'วิธีใช้ระบบ', icon: BookOpen },
];

export default function IndicatorsSubNav({ active }: { active: string }) {
    return (
        <QualitySubNav
            tone="emerald"
            workspaceLabel="ตัวชี้วัดคุณภาพ"
            workspaceBadge="ตัวชี้วัดคุณภาพ"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 lg:grid-cols-4"
        />
    );
}
