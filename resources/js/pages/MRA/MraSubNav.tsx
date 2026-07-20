import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { LayoutDashboard, ClipboardList, Plus, BarChart3, Settings } from 'lucide-react';

const tabs: QualityTab[] = [
    { key: 'mra.dashboard', label: 'ภาพรวม', hint: 'MRA Dashboard', icon: LayoutDashboard },
    { key: 'mra.index', label: 'รายการตรวจ', hint: 'รายการตรวจสอบ', icon: ClipboardList },
    { key: 'mra.create', label: 'สร้างการตรวจใหม่', hint: 'เริ่มตรวจเวชระเบียน', icon: Plus },
    { key: 'mra.reports', label: 'รายงาน', hint: 'สรุปผลการตรวจ', icon: BarChart3 },
    { key: 'mra.settings', label: 'ตั้งค่า', hint: 'เกณฑ์ สรพ. 2563', icon: Settings },
];

export default function MraSubNav({ active }: { active: string }) {
    return (
        <QualitySubNav
            tone="indigo"
            workspaceLabel="ตรวจสอบเวชระเบียน"
            workspaceBadge="ความสมบูรณ์เวชระเบียน"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        />
    );
}

export const mraBreadcrumbs = (extra?: { title: string; href: string }) => [
    { title: 'ศูนย์คุณภาพ', href: '/quality' },
    { title: 'MRA', href: route('mra.index') },
    ...(extra ? [extra] : []),
];
