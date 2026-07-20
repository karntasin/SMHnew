import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { LayoutDashboard, FileText, Upload, GraduationCap } from 'lucide-react';

export type KmTabKey =
    | 'km.dashboard'
    | 'km.assets.index'
    | 'km.assets.create'
    | '/km/learn/dashboard';

const tabs: QualityTab[] = [
    { key: 'km.dashboard', label: 'ภาพรวม', hint: 'KM Dashboard', icon: LayoutDashboard },
    { key: 'km.assets.index', label: 'คลังความรู้', hint: 'Knowledge Assets', icon: FileText },
    { key: 'km.assets.create', label: 'เพิ่มความรู้', hint: 'อัปโหลดเอกสาร', icon: Upload },
    { key: '/km/learn/dashboard', label: 'E-Learning', hint: 'หลักสูตรออนไลน์', icon: GraduationCap },
];

export default function KmSubNav({ active }: { active: KmTabKey }) {
    return (
        <QualitySubNav
            tone="amber"
            workspaceLabel="การจัดการความรู้"
            workspaceBadge="การจัดการความรู้"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 xl:grid-cols-4"
        />
    );
}
