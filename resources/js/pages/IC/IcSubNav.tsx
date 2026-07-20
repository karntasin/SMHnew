import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import {
    LayoutDashboard,
    Activity,
    AlertTriangle,
    Hand,
    Calendar,
    Pill,
    Siren,
    Microscope,
    GraduationCap,
    FileBarChart,
} from 'lucide-react';

export type IcTabKey =
    | 'ic.index'
    | 'ic.surveillance'
    | 'ic.incidents'
    | 'ic.hand-hygiene'
    | 'ic.device-days'
    | 'ic.antibiotic'
    | 'ic.outbreak'
    | 'ic.environment'
    | 'ic.education'
    | 'ic.reports';

const tabs: QualityTab[] = [
    { key: 'ic.index', label: 'ภาพรวม', hint: 'IC Dashboard', icon: LayoutDashboard },
    { key: 'ic.surveillance', label: 'เฝ้าระวัง', hint: 'HAI Surveillance', icon: Activity },
    { key: 'ic.incidents', label: 'อุบัติการณ์', hint: 'Needle Stick', icon: AlertTriangle },
    { key: 'ic.hand-hygiene', label: 'ล้างมือ', hint: 'Hand Hygiene', icon: Hand },
    { key: 'ic.device-days', label: 'Device Days', hint: 'HAI Denominator', icon: Calendar },
    { key: 'ic.antibiotic', label: 'ยาปฏิชีวนะ', hint: 'Stewardship', icon: Pill },
    { key: 'ic.outbreak', label: 'ระบาด', hint: 'Outbreak Control', icon: Siren },
    { key: 'ic.environment', label: 'สิ่งแวดล้อม', hint: 'Environment Check', icon: Microscope },
    { key: 'ic.education', label: 'อบรม', hint: 'IC Training', icon: GraduationCap },
    { key: 'ic.reports', label: 'รายงาน', hint: 'Reports', icon: FileBarChart },
];

export default function IcSubNav({ active }: { active: IcTabKey }) {
    return (
        <QualitySubNav
            tone="rose"
            workspaceLabel="ป้องกันและควบคุมการติดเชื้อ"
            workspaceBadge="ป้องกันและควบคุมการติดเชื้อ"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        />
    );
}
