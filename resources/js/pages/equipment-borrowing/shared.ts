export const STATUS_LABELS: Record<string, string> = {
    pending: 'รออนุมัติ',
    approved: 'รอรับ',
    borrowed: 'กำลังยืม',
    returned: 'คืนแล้ว',
    rejected: 'ปฏิเสธ',
    cancelled: 'ยกเลิก',
    overdue: 'เลยกำหนด',
};

export const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-400 text-slate-900',
    approved: 'bg-sky-500 text-white',
    borrowed: 'bg-violet-500 text-white',
    returned: 'bg-emerald-500 text-white',
    rejected: 'bg-rose-500 text-white',
    cancelled: 'bg-slate-400 text-white',
    overdue: 'bg-red-600 text-white',
};

export const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    borrowed: 'bg-purple-100 text-purple-800',
    returned: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800',
};

export function stockBadgeClass(label: string) {
    if (label === 'หมดสต็อก') return 'bg-red-100 text-red-700 border-red-200';
    if (label === 'ใกล้หมด') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
}

export function fmtTime(t?: string | null) {
    if (!t) return '';
    return t.slice(0, 5);
}

export function fmtSchedule(date?: string | null, time?: string | null) {
    if (!date) return '-';
    const d = date.slice(0, 10);
    const t = fmtTime(time);
    return t ? `${d} ${t}` : d;
}
