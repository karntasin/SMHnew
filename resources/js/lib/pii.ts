/**
 * Client-side PII helpers (display only). Server also masks Inertia props.
 */

export function maskCid(cid?: string | null): string {
    if (!cid) return '-';
    const digits = String(cid).replace(/\D+/g, '');
    if (digits.length !== 13) {
        if (digits.length <= 4) return '*'.repeat(digits.length || 1);
        return `${digits[0]}${'*'.repeat(Math.max(0, digits.length - 2))}${digits[digits.length - 1]}`;
    }
    return `${digits[0]}-****-*****-**-${digits[12]}`;
}

export function maskSurname(surname?: string | null): string {
    if (!surname) return '';
    const chars = Array.from(String(surname).trim());
    if (chars.length <= 1) return '*';
    const keep = chars.length >= 4 ? 2 : 1;
    return chars.slice(0, keep).join('') + '*'.repeat(Math.max(1, chars.length - keep));
}

/** ชื่อ-นามสกุลผู้ป่วย: เก็บชื่อต้น ปกปิดนามสกุลบางส่วน */
export function maskPatientName(name?: string | null): string {
    if (!name) return '-';
    const normalized = String(name).trim().replace(/\s+/g, ' ');
    const pos = normalized.lastIndexOf(' ');
    if (pos < 0) {
        const chars = Array.from(normalized);
        if (chars.length <= 2) return maskSurname(normalized);
        const keep = Math.ceil(chars.length * 0.6);
        return chars.slice(0, keep).join('') + '*'.repeat(chars.length - keep);
    }
    return `${normalized.slice(0, pos)} ${maskSurname(normalized.slice(pos + 1))}`.trim();
}
