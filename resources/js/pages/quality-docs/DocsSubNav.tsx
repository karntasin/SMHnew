import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { FilePlus, Search } from 'lucide-react';

const tabs: QualityTab[] = [
    { key: 'quality-docs.index', label: 'ค้นหาเอกสาร', hint: 'รายการและค้นหา', icon: Search },
    { key: 'quality-docs.create', label: 'สร้างเอกสารใหม่', hint: 'เพิ่มเอกสาร HA/JCI', icon: FilePlus },
];

export default function DocsSubNav({ active }: { active: string }) {
    return (
        <QualitySubNav
            tone="blue"
            workspaceLabel="คลังเอกสารคุณภาพ"
            workspaceBadge="คลังเอกสารคุณภาพ"
            tabs={tabs}
            active={active}
            columnsClass="sm:grid-cols-2"
        />
    );
}
