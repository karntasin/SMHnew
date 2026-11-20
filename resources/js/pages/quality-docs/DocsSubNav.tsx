import React from 'react';
import { usePage } from '@inertiajs/react';
import { QualitySubNav, QualityTab } from '@/components/quality/quality-ui';
import { FilePlus, Search, Settings2 } from 'lucide-react';

interface AuthUser {
    roles?: string[];
    [key: string]: any;
}

const SETTINGS_ALLOWED_ROLES = [
    'admin', 'Admin', 'Super Admin', 'ผู้ดูแลระบบ',
    'superuser', 'superUser', 'SuperUser',
    'header', 'Header',
    'boss', 'Boss'
];

export default function DocsSubNav({ active }: { active: string }) {
    const { auth } = usePage().props as unknown as { auth?: { user?: AuthUser } };
    const userRoles = auth?.user?.roles || [];

    const canManageSettings = userRoles.some(role =>
        SETTINGS_ALLOWED_ROLES.some(allowed => allowed.toLowerCase() === role.toLowerCase())
    );

    const tabs: QualityTab[] = [
        { key: 'quality-docs.index', label: 'ค้นหาเอกสาร', hint: 'รายการและค้นหา', icon: Search },
        { key: 'quality-docs.create', label: 'สร้างเอกสารใหม่', hint: 'เพิ่มเอกสาร HA/JCI', icon: FilePlus },
    ];

    if (canManageSettings) {
        tabs.push({
            key: 'quality-docs.settings',
            label: 'ตั้งค่าหมวดหมู่',
            hint: 'มาตรฐาน & ประเภทเอกสาร',
            icon: Settings2,
        });
    }

    return (
        <QualitySubNav
            tone="blue"
            workspaceLabel="คลังเอกสารคุณภาพ"
            workspaceBadge="คลังเอกสารคุณภาพ"
            tabs={tabs}
            active={active}
            columnsClass={canManageSettings ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}
        />
    );
}
