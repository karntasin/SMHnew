export const imInput =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

export const imSelect = imInput + ' cursor-pointer';

export const fmtDate = (iso?: string | null): string => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const fmtDateTime = (iso?: string | null): string => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const fmtMoney = (v?: number | null): string => {
    const n = Number(v ?? 0);
    return n.toLocaleString('th-TH', { maximumFractionDigits: 0 });
};

export const fmtDuration = (seconds?: number | null): string => {
    const s = Number(seconds ?? 0);
    if (s <= 0) return '-';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m === 0) return `${rem} วิ`;
    return `${m} นาที ${rem ? rem + ' วิ' : ''}`.trim();
};

export const riskColor = (score: number): string => {
    if (score >= 15) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 8) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

export const riskLabel = (score: number): string => {
    if (score >= 15) return 'สูง';
    if (score >= 8) return 'ปานกลาง';
    return 'ต่ำ';
};

export const STATUS_STYLE: Record<string, string> = {
    // generic
    open: 'bg-sky-100 text-sky-700 border-sky-200',
    in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
    investigating: 'bg-amber-100 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    implemented: 'bg-sky-100 text-sky-700 border-sky-200',
    planned: 'bg-slate-100 text-slate-600 border-slate-200',
    done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    repair: 'bg-amber-100 text-amber-700 border-amber-200',
    disposed: 'bg-slate-100 text-slate-600 border-slate-200',
    retired: 'bg-slate-100 text-slate-600 border-slate-200',
    published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    archived: 'bg-slate-100 text-slate-600 border-slate-200',
    mitigating: 'bg-amber-100 text-amber-700 border-amber-200',
    pass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-100 text-amber-700 border-amber-200',
    fail: 'bg-red-100 text-red-700 border-red-200',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
};

export const STATUS_LABEL: Record<string, string> = {
    open: 'เปิด',
    in_progress: 'กำลังทำ',
    investigating: 'กำลังสอบสวน',
    resolved: 'แก้ไขแล้ว',
    closed: 'ปิดงาน',
    pending: 'รออนุมัติ',
    approved: 'อนุมัติ',
    rejected: 'ไม่อนุมัติ',
    implemented: 'ดำเนินการแล้ว',
    planned: 'วางแผน',
    done: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
    draft: 'ร่าง',
    active: 'ปกติ',
    repair: 'ส่งซ่อม',
    disposed: 'จำหน่าย',
    retired: 'จำหน่าย',
    published: 'เผยแพร่',
    archived: 'จัดเก็บ',
    mitigating: 'กำลังจัดการ',
    pass: 'ผ่าน',
    partial: 'ผ่านบางส่วน',
    fail: 'ไม่ผ่าน',
    success: 'สำเร็จ',
    failed: 'ล้มเหลว',
};

export const PRIORITY_STYLE: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-sky-100 text-sky-700 border-sky-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
};

export const PRIORITY_LABEL: Record<string, string> = {
    low: 'ต่ำ',
    medium: 'ปานกลาง',
    high: 'สูง',
    critical: 'วิกฤต',
};
