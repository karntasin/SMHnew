import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { BookOpen, LayoutDashboard, List, Trash2, Upload } from 'lucide-react';

export default function IndicatorsSubNav({
    active,
    trashCount,
}: {
    active: string;
    trashCount?: number;
}) {
    const tabs: QualityTab[] = [
        { key: 'quality-indicators.index', label: 'รายการตัวชี้วัด', hint: 'จัดการ KPI', icon: List },
        { key: 'quality-indicators.dashboard', label: 'ภาพรวม', hint: 'สถานะตัวชี้วัด', icon: LayoutDashboard },
        { key: 'quality-indicators.import.index', label: 'นำเข้า Excel', hint: 'เทมเพลต + ยืนยัน', icon: Upload },
        {
            key: 'quality-indicators.trash',
            label: 'ถังขยะ',
            hint: trashCount && trashCount > 0 ? `${trashCount} รายการที่ถูกลบ` : 'กู้คืนตัวชี้วัด',
            icon: Trash2,
            href: route('quality-indicators.index', { view: 'trash' }),
        },
        { key: 'quality-indicators.guide', label: 'คู่มือใช้งาน', hint: 'วิธีใช้ระบบ', icon: BookOpen },
    ];

    return (
        <QualitySubNav
            tone="emerald"
            workspaceLabel="ตัวชี้วัดคุณภาพ"
            workspaceBadge="ตัวชี้วัดคุณภาพ"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        />
    );
}
