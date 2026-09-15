import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { LayoutDashboard, ClipboardList } from 'lucide-react';
import PharmacySubNav from '@/pages/Pharmacy/PharmacySubNav';

const tabs: QualityTab[] = [
    { key: 'drug-usage.index', label: 'ภาพรวม', hint: 'Dashboard การใช้ยา', icon: LayoutDashboard },
    { key: 'drug-usage.report', label: 'รายงานรายการยา', hint: 'ตารางข้อมูลยา', icon: ClipboardList },
];

export default function DrugUsageSubNav({ active }: { active: string }) {
    return (
        <div className="space-y-3">
            <PharmacySubNav active={active} />
            <QualitySubNav
                tone="cyan"
                workspaceLabel="รายงานยาและการใช้ยา"
                workspaceBadge="ข้อมูลจาก HOSxP"
                tabs={tabs}
                active={active}
                columnsClass="sm:grid-cols-2"
            />
        </div>
    );
}

export const drugUsageBreadcrumbs = (extra?: { title: string; href: string }) => [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'เภสัชกรรม', href: route('pharmacy.index') },
    { title: 'รายงานยาและการใช้ยา', href: route('drug-usage.index') },
    ...(extra ? [extra] : []),
];
