export type MemoKind = 'internal' | 'external' | 'order';

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
}

export interface SectionValue {
    enabled: boolean;
    value: string;
}

export type SectionMap = Record<string, SectionValue>;

export interface MemoCatalogEntry {
    label: string;
    fields: FieldDef[];
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

export function toThaiDigits(text: string): string {
    return text.replace(/\d/g, (digit) => '๐๑๒๓๔๕๖๗๘๙'[Number(digit)] ?? digit);
}

export function sectionVisible(field: FieldDef, section?: SectionValue): boolean {
    if (!section?.enabled) return false;
    const value = section.value?.trim() ?? '';
    if (!value && (field.optional || field.type === 'textarea')) return false;
    return true;
}
