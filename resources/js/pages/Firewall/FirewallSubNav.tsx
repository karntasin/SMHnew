import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { Activity, Globe, Radar, ShieldAlert, ScrollText } from 'lucide-react';

export type FirewallTabKey =
    | 'firewall.index'
    | 'firewall.web-watch'
    | 'firewall.threats'
    | 'firewall.threat-intel'
    | 'firewall.logs';

const tabs: QualityTab[] = [
    { key: 'firewall.index', label: 'แดชบอร์ด', hint: 'CPU · Memory · Sessions', icon: Activity },
    { key: 'firewall.web-watch', label: 'เฝ้าระวังเว็บ', hint: 'Deny / Watch list', icon: Globe },
    { key: 'firewall.threats', label: 'ภัยคุกคาม', hint: 'Virus · IPS · Port', icon: ShieldAlert },
    { key: 'firewall.threat-intel', label: 'Threat Intel', hint: 'Feeds · Blacklist', icon: Radar },
    { key: 'firewall.logs', label: 'บันทึกกิจกรรม', hint: 'Webfilter · App-Ctrl', icon: ScrollText },
];

export default function FirewallSubNav({ active }: { active: FirewallTabKey }) {
    return (
        <QualitySubNav
            tone="slate"
            workspaceLabel="FortiGate Firewall"
            workspaceBadge="F100 Monitor"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2 lg:grid-cols-5"
        />
    );
}

export const firewallBreadcrumbs = (extra?: { title: string; href: string }) => [
    { title: 'ไฟร์วอลล์ FortiGate', href: route('firewall.index') },
    ...(extra ? [extra] : []),
];
