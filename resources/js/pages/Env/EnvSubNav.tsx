import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { LayoutDashboard, Box, Wrench, AlertTriangle, Activity } from 'lucide-react';

export type EnvTabKey =
    | 'env.index'
    | 'env.assets.index'
    | 'env.pm.index'
    | 'env.incidents.index'
    | 'env.utility.index';

const tabs: QualityTab[] = [
    { key: 'env.index', label: 'ภาพรวม', hint: 'ENV Dashboard', icon: LayoutDashboard },
    { key: 'env.assets.index', label: 'จัดการทรัพย์สิน', hint: 'ทะเบียนครุภัณฑ์', icon: Box },
    { key: 'env.pm.index', label: 'แผนบำรุงรักษา (PM)', hint: 'ติดตาม PM', icon: Wrench },
    { key: 'env.incidents.index', label: 'รายงานอุบัติการณ์', hint: 'ความปลอดภัย', icon: AlertTriangle },
    { key: 'env.utility.index', label: 'ตรวจสอบระบบ', hint: 'สาธารณูปโภค', icon: Activity },
];

export default function EnvSubNav({ active }: { active: EnvTabKey }) {
    return (
        <QualitySubNav
            tone="teal"
            workspaceLabel="สิ่งแวดล้อมและความปลอดภัย"
            workspaceBadge="สิ่งแวดล้อมและความปลอดภัย"
            tabs={tabs}
            active={active}
        />
    );
}
