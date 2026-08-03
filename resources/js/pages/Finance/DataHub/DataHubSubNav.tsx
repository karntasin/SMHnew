import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { LayoutDashboard, ClipboardList, Building2, Shield, Heart } from 'lucide-react';

const tabs: QualityTab[] = [
    { key: 'finance.data-hub', label: 'ภาพรวม', hint: 'Financial Data Hub', icon: LayoutDashboard },
    { key: 'finance.cgd.dashboard', label: 'จ่ายตรง', hint: 'กรมบัญชีกลาง', icon: ClipboardList },
    { key: 'finance.lgo.dashboard', label: 'อปท.', hint: 'ท้องถิ่น', icon: Building2 },
    { key: 'finance.sso.dashboard', label: 'ประกันสังคม', hint: 'SSO', icon: Shield },
    { key: 'finance.uc.dashboard', label: 'บัตรทอง', hint: 'UC', icon: Heart },
];

export default function DataHubSubNav({ active }: { active: string }) {
    return (
        <QualitySubNav
            tone="emerald"
            workspaceLabel="ศูนย์ข้อมูลการเงิน"
            workspaceBadge="Financial Data Hub"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 lg:grid-cols-5"
        />
    );
}

export const dataHubBreadcrumbs = (extra?: { title: string; href: string }) => [
    { title: 'Financial Data Hub', href: route('finance.data-hub') },
    ...(extra ? [extra] : []),
];
