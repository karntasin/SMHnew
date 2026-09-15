const ACTION_LABELS: Record<string, string> = {
    view: 'ดู',
    dashboard: 'แดชบอร์ด',
    create: 'สร้าง',
    edit: 'แก้ไข',
    update: 'แก้ไข',
    delete: 'ลบ',
    export: 'ส่งออก',
    import: 'นำเข้า',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    manage: 'จัดการ',
    settings: 'ตั้งค่า',
    report: 'รายงาน',
    reports: 'รายงาน',
    index: 'รายการ',
    show: 'รายละเอียด',
    store: 'บันทึก',
    reconcile: 'กระทบยอด',
    summary: 'สรุป',
    compare: 'เปรียบเทียบ',
    manual: 'คู่มือ',
    hub: 'ศูนย์รวม',
};

const MODULE_HINTS: Record<string, string> = {
    dashboard: 'หน้าหลัก',
    access: 'การเข้าถึง',
    permission: 'สิทธิ์',
    permissions: 'สิทธิ์',
    users: 'ผู้ใช้',
    roles: 'บทบาท',
    settings: 'ตั้งค่า',
    menu: 'เมนู',
    backup: 'สำรองข้อมูล',
    utilities: 'เครื่องมือ',
    log: 'บันทึกระบบ',
    filemanager: 'ไฟล์',
    finance: 'การเงิน',
    document: 'เอกสาร',
    maintenance: 'ซ่อมบำรุง',
    quality: 'คุณภาพ',
    env: 'สิ่งแวดล้อม',
    im: 'สารสนเทศ',
    rdu: 'RDU',
    hrd: 'HRD',
    mra: 'MRA',
    ic: 'IC',
    km: 'KM',
    vehicle: 'ยานพาหนะ',
    hosxp: 'HOSxP',
};

const PERMISSION_LABELS: Record<string, string> = {
    'rdu.index': 'แดชบอร์ด RDU',
    'rdu.cases': 'ตรวจสอบเคส',
    'rdu.drugs': 'การใช้ยา',
    'rdu.drugs.antibiotics': 'รายงานยาปฏิชีวนะ',
    'rdu.drugs.by-department': 'ยาแยกตามแผนก',
    'rdu.audits.store': 'บันทึกผลตรวจเคส',
};

export function formatPermissionLabel(name: string): string {
    if (PERMISSION_LABELS[name]) {
        return PERMISSION_LABELS[name];
    }
    if (name.endsWith('-view')) {
        const base = name.slice(0, -5);
        return `ดู${moduleHint(base)}`;
    }

    if (name.includes('.')) {
        const parts = name.split('.');
        const action = parts[parts.length - 1];
        const module = parts.slice(0, -1).join(' › ');
        const actionLabel = ACTION_LABELS[action] ?? action;
        return `${actionLabel} · ${moduleHint(module.replace(/\./g, ' '))}`;
    }

    if (name.includes('-')) {
        const [module, action] = name.split('-');
        const actionLabel = ACTION_LABELS[action] ?? action;
        return `${actionLabel} · ${moduleHint(module)}`;
    }

    return name;
}

export function formatGroupLabel(group: string): string {
    if (!group || group === 'อื่นๆ') {
        return 'อื่นๆ';
    }

    if (group.includes('เธ') && group.includes('RDU')) {
        return 'รายงาน RDU';
    }

    return group;
}

function moduleHint(raw: string): string {
    const key = raw.trim().toLowerCase();
    if (MODULE_HINTS[key]) {
        return MODULE_HINTS[key];
    }
    return raw.replace(/[-_.]/g, ' ');
}

/** สิทธิ์ที่น่าจะเป็น "ดูอย่างเดียว" */
export function isViewPermission(name: string): boolean {
    return name.endsWith('-view')
        || name.endsWith('.dashboard')
        || name.endsWith('.view')
        || name.endsWith('.index')
        || name.endsWith('.reports')
        || name.endsWith('.hub')
        || name.endsWith('.manual');
}
