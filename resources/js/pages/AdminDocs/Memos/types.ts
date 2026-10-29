export type MemoKind = string;
export type MemoBaseLayout = 'internal' | 'external' | 'order';

export interface FieldDef {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'rank';
    enabled: boolean;
    optional: boolean;
    placeholder?: string;
    rows?: number;
    default?: string;
    options?: string[];
    setting?: string;
    fallback_setting?: string;
}

export interface SectionValue {
    enabled: boolean;
    value: string;
}

export type SectionMap = Record<string, SectionValue>;

export type LayoutBlockRole = 'garuda' | 'static' | 'field' | 'signature' | 'copies' | 'contact' | 'rule';

export interface LayoutBlock {
    id: string;
    role: LayoutBlockRole;
    x_cm: number;
    y_cm: number;
    w_cm: number;
    h_cm: number;
    align?: 'left' | 'center' | 'right' | 'justify';
    font_family?: string;
    font_pt?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    line_height?: number;
    space_before_pt?: number;
    space_after_pt?: number;
    indent_cm?: number;
    text?: string;
    field?: string;
    label?: string;
}

export interface LayoutPageSettings {
    width_cm: number;
    height_cm: number;
    margin_top_cm?: number;
    margin_bottom_cm?: number;
    margin_left_cm?: number;
    margin_right_cm?: number;
    orientation?: 'portrait' | 'landscape';
    font_family?: string;
    font_size_pt?: number;
    line_spacing?: number;
}

export interface MemoLayout {
    page: LayoutPageSettings;
    blocks: LayoutBlock[];
}

export interface MemoCatalogEntry {
    label: string;
    base_layout: MemoBaseLayout;
    fields: FieldDef[];
    layout?: MemoLayout;
    is_system?: boolean;
}

export interface MemoFormProps {
    id: number;
    key: string;
    label: string;
    base_layout: MemoBaseLayout;
    fields: FieldDef[];
    layout: MemoLayout;
    is_system: boolean;
    sort_order: number;
}

export interface MemoFonts {
    regular: string;
    bold: string;
}

export interface MemoRecord {
    id: number;
    kind: MemoKind;
    thai_digits: boolean;
    sections: SectionMap;
}

export const CARRY_KEYS = [
    'subject',
    'document_no',
    'document_date',
    'addressee',
    'body',
    'signer_rank',
    'signer_name',
    'signer_position',
    'reference',
    'attachment',
    'phone',
    'fax',
    'copies',
    'unit_name',
    'address',
    'owner',
    'email',
    'authority',
    'orders',
    'effective',
    'order_date',
    'agency',
];

export const LAYOUT_LABELS: Record<MemoBaseLayout, string> = {
    internal: 'บันทึกข้อความภายใน',
    external: 'หนังสือภายนอก',
    order: 'คำสั่ง',
};

export function toThaiDigits(text: string): string {
    return text.replace(/\d/g, (digit) => '๐๑๒๓๔๕๖๗๘๙'[Number(digit)] ?? digit);
}

export function formatExternalAddress(address: string): string[] {
    const trimmed = address.trim();
    if (!trimmed) return [];

    let lines = trimmed
        .split(/\r\n|\n|\r/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length <= 1) {
        const single = lines[0] ?? trimmed;
        lines = single
            .split(/(?=(?:ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.))/)
            .map((line) => line.trim())
            .filter(Boolean);
    }

    let postal: string | null = null;
    const normalized: string[] = [];
    for (const line of lines) {
        const withZip = line.match(/^(.*?)(?:\s+)(\d{5})$/);
        if (withZip) {
            normalized.push(withZip[1].trim());
            postal = withZip[2];
            continue;
        }
        if (/^\d{5}$/.test(line)) {
            postal = line;
            continue;
        }
        normalized.push(line);
    }

    if (postal) {
        let provinceIndex = -1;
        for (let index = normalized.length - 1; index >= 0; index -= 1) {
            if (/^(จังหวัด|จ\.)/.test(normalized[index])) {
                provinceIndex = index;
                break;
            }
        }
        if (provinceIndex >= 0) {
            normalized[provinceIndex] = `${normalized[provinceIndex].trimEnd()} ${postal}`;
        } else {
            normalized.push(postal);
        }
    }

    return normalized;
}

export function sectionVisible(field: FieldDef, section?: SectionValue): boolean {
    if (!section?.enabled) return false;
    const value = section.value?.trim() ?? '';
    if (!value && (field.optional || field.type === 'textarea')) return false;
    return true;
}

export function layoutOf(entry?: MemoCatalogEntry | null, kind?: MemoKind): MemoBaseLayout {
    if (entry?.base_layout === 'internal' || entry?.base_layout === 'external' || entry?.base_layout === 'order') {
        return entry.base_layout;
    }
    if (kind === 'external' || kind === 'order' || kind === 'internal') {
        return kind;
    }
    return 'internal';
}
