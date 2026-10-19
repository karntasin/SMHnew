import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import {
    LayoutDashboard,
    Box,
    FileSpreadsheet,
    Wrench,
    AlertTriangle,
    Droplets,
    BookOpen,
} from 'lucide-react';

export type EnvTabKey =
    | 'env.index'
    | 'env.assets.index'
    | 'env.assets.report'
    | 'env.pm.index'
    | 'env.incidents.index'
    | 'env.utilities.index'
    | 'env.guide';

const tabs: QualityTab[] = [
    { key: 'env.index', label: 'Dashboard', hint: 'ภาพรวมครุภัณฑ์', icon: LayoutDashboard },
    { key: 'env.assets.index', label: 'ทะเบียนครุภัณฑ์', hint: 'บัญชีคุม สป.', icon: Box },
    { key: 'env.assets.report', label: 'รายงานแยกสาย', hint: 'สรุปตามสายงาน', icon: FileSpreadsheet },
    { key: 'env.utilities.index', label: 'สาธารณูปโภค', hint: 'ค่าใช้จ่ายรายเดือน', icon: Droplets },
    { key: 'env.pm.index', label: 'แผนบำรุงรักษา (PM)', hint: 'ติดตาม PM', icon: Wrench },
    { key: 'env.incidents.index', label: 'รายงานอุบัติการณ์', hint: 'ความปลอดภัย', icon: AlertTriangle },
    { key: 'env.guide', label: 'คู่มือใช้งาน', hint: 'วิธีใช้ระบบ ENV', icon: BookOpen },
];

export default function EnvSubNav({ active }: { active: EnvTabKey }) {
    return (
        <QualitySubNav
            tone="teal"
            workspaceLabel="สิ่งแวดล้อมและความปลอดภัย"
            workspaceBadge="สิ่งแวดล้อมและความปลอดภัย"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 lg:grid-cols-4"
        />
    );
}
