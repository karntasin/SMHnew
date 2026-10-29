import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import { assetUrl } from '@/lib/asset';
import {
    sectionVisible,
    toThaiDigits,
    type LayoutBlock,
    type MemoCatalogEntry,
    type MemoFonts,
    type MemoKind,
    type SectionMap,
} from './types';

interface Props {
    kind: MemoKind;
    sections: SectionMap;
    thaiDigits: boolean;
    fonts: MemoFonts;
    catalog: Record<MemoKind, MemoCatalogEntry>;
}

const PAPER_WIDTH = 794;

export default function MemoPreview({ kind, sections, thaiDigits, fonts, catalog }: Props) {
    const frameRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.55);
    const entry = catalog[kind];
    const fields = entry?.fields ?? [];
    const layout = entry?.layout;
    const pageSettings = layout?.page;
    const fieldOf = (key: string) => fields.find((field) => field.key === key);

    const marginTop = pageSettings?.margin_top_cm ?? (kind === 'internal' ? 1.5 : 2.5);
    const marginBottom = pageSettings?.margin_bottom_cm ?? 2.0;
    const marginLeft = pageSettings?.margin_left_cm ?? 3.0;
    const marginRight = pageSettings?.margin_right_cm ?? 2.0;
    const pageFont = pageSettings?.font_family ?? 'TH Sarabun New';
    const pageFontSize = pageSettings?.font_size_pt ?? 16;
    const pageLineHeight = pageSettings?.line_spacing ?? 1.15;

    const blockMap = new Map<string, LayoutBlock>();
    layout?.blocks?.forEach((b) => {
        if (b.field) blockMap.set(b.field, b);
        if (b.role) blockMap.set(b.role, b);
        if (b.id) blockMap.set(b.id, b);
    });

    const blockStyle = (key: string, baseStyle: CSSProperties = {}): CSSProperties => {
        const b = blockMap.get(key);
        if (!b) return baseStyle;
        const res: CSSProperties = { ...baseStyle };
        if (b.font_family) res.fontFamily = `"${b.font_family}", serif`;
        if (b.font_pt) res.fontSize = `${b.font_pt}pt`;
        if (b.bold !== undefined) res.fontWeight = b.bold ? 700 : 400;
        if (b.italic !== undefined) res.fontStyle = b.italic ? 'italic' : 'normal';
        if (b.underline !== undefined) res.textDecoration = b.underline ? 'underline' : 'none';
        if (b.align) res.textAlign = b.align === 'justify' ? 'justify' : b.align;
        if (b.text_transform && b.text_transform !== 'none') res.textTransform = b.text_transform;
        if (b.line_height) res.lineHeight = b.line_height;
        if (b.indent_cm !== undefined) res.textIndent = `${b.indent_cm}cm`;
        if (b.space_before_pt) res.paddingTop = `${b.space_before_pt}pt`;
        if (b.space_after_pt) res.paddingBottom = `${b.space_after_pt}pt`;
        return res;
    };

    useEffect(() => {
        const frame = frameRef.current;
        if (!frame) return;
        const update = () => setScale(Math.min(1, Math.max(0.35, (frame.clientWidth - 24) / PAPER_WIDTH)));
        update();
        const observer = new ResizeObserver(update);
        observer.observe(frame);
        return () => observer.disconnect();
    }, []);

    const shown = (key: string) => {
        const field = fieldOf(key);
        return field ? sectionVisible(field, sections[key]) : false;
    };
    const text = (key: string) => {
        const raw = sections[key]?.value?.trim() ?? '';
        const b = blockMap.get(key);
        if (!b?.text_transform || b.text_transform === 'none') return raw;
        if (b.text_transform === 'uppercase') return raw.toUpperCase();
        if (b.text_transform === 'lowercase') return raw.toLowerCase();
        if (b.text_transform === 'capitalize') {
            return raw.replace(/\b\w/g, (c) => c.toUpperCase());
        }
        return raw;
    };
    const numbered = (key: string) => {
        const value = text(key);
        return thaiDigits ? toThaiDigits(value) : value;
    };
    const dated = (key: string) => {
        const value = text(key);
        if (!value) return '';
        const formatted = formatThaiDateFromIso(value);
        return thaiDigits ? toThaiDigits(formatted) : formatted;
    };

    const showNo = shown('document_no');
    const dateKey = kind === 'order' ? 'order_date' : 'document_date';
    const showDate = shown(dateKey);
    const signerRank = shown('signer_rank') ? text('signer_rank') : '';
    const signerName = shown('signer_name') ? text('signer_name') : '';
    const signerPosition = shown('signer_position') ? text('signer_position') : '';
    const closing = kind === 'external' && shown('closing') ? text('closing') : '';

    return (
        <div ref={frameRef} className="overflow-auto rounded-2xl bg-stone-200/80 p-3">
            <style>
                {`@font-face{font-family:'TH Sarabun New';src:url('${fonts.regular}') format('truetype');font-weight:400;font-display:swap;}
                  @font-face{font-family:'TH Sarabun New';src:url('${fonts.bold}') format('truetype');font-weight:700;font-display:swap;}`}
            </style>
            <div style={{ height: 1123 * scale + 8 }}>
                <article
                    className="relative bg-white text-black shadow-md"
                    style={{
                        width: PAPER_WIDTH,
                        minHeight: 1123,
                        padding: `${marginTop}cm ${marginRight}cm ${marginBottom}cm ${marginLeft}cm`,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        fontFamily: `"${pageFont}", "TH Sarabun New", serif`,
                        fontSize: `${pageFontSize}pt`,
                        lineHeight: pageLineHeight,
                    }}
                >
                    {/* INTERNAL HEADER: Garuda on left (1.5cm) + "บันทึกข้อความ" centered */}
                    {kind === 'internal' && (
                        <div className="flex items-center mb-4">
                            <img
                                src={assetUrl('/images/official/garuda.png')}
                                alt="ตราครุฑ"
                                style={{
                                    height: '1.5cm',
                                    width: 'auto',
                                    display: 'block',
                                }}
                            />
                            <h1
                                style={blockStyle('title', {
                                    ...title20,
                                    flex: 1,
                                    textAlign: 'center',
                                    marginRight: '1.5cm',
                                })}
                            >
                                บันทึกข้อความ
                            </h1>
                        </div>
                    )}

                    {/* EXTERNAL HEADER: Centered Garuda (3cm) + Unit Name & Address */}
                    {kind === 'external' && (
                        <div className="mb-4">
                            <div className="flex justify-center mb-3">
                                <img
                                    src={assetUrl('/images/official/garuda.png')}
                                    alt="ตราครุฑ"
                                    style={{
                                        height: '3cm',
                                        width: 'auto',
                                        display: 'block',
                                    }}
                                />
                            </div>
                            <header className="text-center">
                                {shown('unit_name') && <h1 style={blockStyle('unit_name', title29)}>{text('unit_name')}</h1>}
                                {shown('address') &&
                                    text('address')
                                        .split('\n')
                                        .filter((line) => line.trim())
                                        .map((line, index) => (
                                            <p key={`${index}-${line}`} style={blockStyle('address', singleLine)}>
                                                {line}
                                            </p>
                                        ))}
                            </header>
                        </div>
                    )}

                    {/* ORDER HEADER: Centered Garuda (3cm) + Heading, Number, Subject */}
                    {kind === 'order' && (
                        <header className="text-center mb-3">
                            <div className="flex justify-center mb-3">
                                <img
                                    src={assetUrl('/images/official/garuda.png')}
                                    alt="ตราครุฑ"
                                    style={{
                                        height: '3cm',
                                        width: 'auto',
                                        display: 'block',
                                    }}
                                />
                            </div>
                            <h1 style={blockStyle('unit_name', orderTitle)}>
                                คำสั่ง{shown('unit_name') ? text('unit_name') : ''}
                            </h1>
                            {showNo && <p style={blockStyle('document_no', singleCenterBold)}>ที่{gap}{numbered('document_no')}</p>}
                            {shown('subject') && <p style={blockStyle('subject', singleCenterBold)}>เรื่อง{gap}{text('subject')}</p>}
                            <div style={{ borderBottom: '1.5px solid #000', margin: '4pt 18% 0' }} />
                        </header>
                    )}

                    {kind !== 'order' && (
                        <div>
                            {shown('agency') && <Meta label="ส่วนราชการ" value={text('agency')} style={blockStyle('agency')} />}
                            {showNo && showDate ? (
                                <p style={{ ...singleLine, position: 'relative', ...blockStyle('document_no') }}>
                                    <span>ที่{gap}{numbered('document_no')}</span>
                                    <span style={{ position: 'absolute', left: '7.5cm', top: 0, ...blockStyle('document_date') }}>
                                        วันที่{gap}{dated(dateKey)}
                                    </span>
                                </p>
                            ) : showNo ? (
                                <Meta label="ที่" value={numbered('document_no')} style={blockStyle('document_no')} />
                            ) : showDate ? (
                                <Meta label="วันที่" value={dated(dateKey)} style={blockStyle('document_date')} />
                            ) : null}
                            {shown('subject') && <Meta label="เรื่อง" value={text('subject')} spaced style={blockStyle('subject')} />}
                            {shown('addressee') && <Meta label="เรียน" value={text('addressee')} spaced style={blockStyle('addressee')} />}
                            {shown('reference') && <Meta label="อ้างถึง" value={text('reference')} spaced style={blockStyle('reference')} />}
                            {shown('attachment') && <Meta label="สิ่งที่ส่งมาด้วย" value={text('attachment')} spaced style={blockStyle('attachment')} />}
                        </div>
                    )}

                    {shown('body') && (
                        <Paragraphs
                            text={text('body')}
                            lineHeight={kind === 'order' ? 1.5 : 1}
                            style={blockStyle('body')}
                        />
                    )}
                    {kind === 'internal' && shown('closing') && (
                        <Paragraphs text={text('closing')} style={blockStyle('closing')} />
                    )}
                    {kind === 'order' && shown('authority') && (
                        <Paragraphs
                            text={text('authority')}
                            lineHeight={1.5}
                            spaced={!shown('body')}
                            style={blockStyle('authority')}
                        />
                    )}
                    {kind === 'order' && shown('orders') && (
                        <Paragraphs
                            text={text('orders')}
                            lineHeight={1.5}
                            spaced={!shown('body') && !shown('authority')}
                            style={blockStyle('orders')}
                        />
                    )}

                    {kind === 'order' && shown('effective') && (
                        <p style={{ ...singleLine, lineHeight: 1.5, textIndent: '2.5cm', ...blockStyle('effective') }}>
                            ทั้งนี้ ตั้งแต่{gap}
                            {thaiDigits ? toThaiDigits(text('effective')) : text('effective')}
                        </p>
                    )}
                    {kind === 'order' && showDate && (
                        <p style={{ ...orderDate, ...blockStyle('order_date') }}>
                            สั่ง ณ วันที่{gap}{dated('order_date')}
                        </p>
                    )}

                    {(closing || signerRank || signerName || signerPosition) && (
                        <div className="mt-[1em] grid grid-cols-2">
                            <div />
                            <div className="text-center" style={blockStyle('signature')}>
                                {closing && (
                                    <>
                                        <p style={{ ...singleLine, ...blockStyle('closing') }}>{closing}</p>
                                        <div className="h-[2em]" />
                                    </>
                                )}
                                {signerRank && <p style={{ ...singleLine, ...blockStyle('signer_rank') }}>{signerRank}</p>}
                                {signerName && (
                                    <p style={{ ...singleLine, ...blockStyle('signer_name') }}>
                                        ({signerName.replace(/^\(|\)$/g, '')})
                                    </p>
                                )}
                                {signerPosition && <p style={{ ...singleLine, ...blockStyle('signer_position') }}>{signerPosition}</p>}
                            </div>
                        </div>
                    )}

                    {kind === 'external' && <OwnerBlock shown={shown} text={text} />}

                    {shown('copies') && (
                        <div className="mt-4" style={blockStyle('copies')}>
                            {text('copies')
                                .split('\n')
                                .filter((line) => line.trim())
                                .map((line, index) => (
                                    <p key={`${line}-${index}`}>
                                        {index === 0 ? `${kind === 'order' ? 'สำเนาส่ง' : 'สำเนาเรียน'} ` : ''}
                                        {line}
                                    </p>
                                ))}
                        </div>
                    )}

                    {kind === 'internal' && (shown('phone') || shown('fax')) && (
                        <div className="mt-4" style={blockStyle('contact')}>
                            {shown('phone') && <p>โทร. {text('phone')}</p>}
                            {shown('fax') && <p>โทรสาร {text('fax')}</p>}
                        </div>
                    )}

                    {/* CUSTOM STATIC BLOCKS & RULES (Word Designer) */}
                    {layout?.blocks?.filter((b) => (b.role === 'static' && b.id !== 'title') || b.role === 'rule').map((b) => {
                        if (b.role === 'rule') {
                            return (
                                <div
                                    key={b.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${b.x_cm}cm`,
                                        top: `${b.y_cm}cm`,
                                        width: `${b.w_cm}cm`,
                                        borderTop: `${Math.max(1, (b.line_width_pt || 1))}px solid ${b.color || '#000000'}`,
                                        height: '2px',
                                        pointerEvents: 'none',
                                    }}
                                />
                            );
                        }
                        const textVal = thaiDigits && b.text ? toThaiDigits(b.text) : (b.text || '');
                        return (
                            <div
                                key={b.id}
                                style={{
                                    position: 'absolute',
                                    left: `${b.x_cm}cm`,
                                    top: `${b.y_cm}cm`,
                                    width: `${b.w_cm}cm`,
                                    minHeight: `${b.h_cm}cm`,
                                    fontFamily: `"${b.font_family || pageFont}", serif`,
                                    fontSize: `${b.font_pt || pageFontSize}pt`,
                                    fontWeight: b.bold ? 700 : 400,
                                    fontStyle: b.italic ? 'italic' : 'normal',
                                    textDecoration: b.underline ? 'underline' : 'none',
                                    textAlign: b.align === 'justify' ? 'justify' : (b.align || 'left'),
                                    color: b.color || '#000000',
                                    lineHeight: b.line_height || pageLineHeight,
                                    textIndent: b.indent_cm ? `${b.indent_cm}cm` : undefined,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {textVal}
                            </div>
                        );
                    })}
                </article>
            </div>
            <p className="mt-2 text-center text-xs text-stone-500">
                ตัวอย่างหน้ากระดาษ {pageFont} {pageFontSize}pt · ขอบพิมพ์ ({marginTop}/{marginRight}/{marginBottom}/{marginLeft} ซม.)
            </p>
        </div>
    );
}

const gap = '  ';
const singleLine: CSSProperties = { margin: 0, lineHeight: 1, fontSize: '16pt' };
const title20: CSSProperties = { margin: 0, textAlign: 'center', fontSize: '20pt', fontWeight: 700, lineHeight: 1 };
const title29: CSSProperties = { margin: 0, textAlign: 'center', fontSize: '29pt', fontWeight: 700, lineHeight: 1 };
const orderTitle: CSSProperties = { margin: 0, textAlign: 'center', fontSize: '20pt', fontWeight: 700, lineHeight: 2 };
const singleCenterBold: CSSProperties = { margin: 0, textAlign: 'center', fontWeight: 700, lineHeight: 1 };
const orderDate: CSSProperties = { margin: 0, textAlign: 'center', lineHeight: 2 };

function Meta({
    label,
    value,
    spaced = false,
    style = {},
}: {
    label: string;
    value: string;
    spaced?: boolean;
    style?: CSSProperties;
}) {
    return (
        <p style={{ ...singleLine, paddingTop: spaced ? '6pt' : 0, ...style }}>
            {label}
            {gap}
            {value}
        </p>
    );
}

function Paragraphs({
    text,
    lineHeight = 1,
    spaced = true,
    style = {},
}: {
    text: string;
    lineHeight?: number;
    spaced?: boolean;
    style?: CSSProperties;
}) {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return null;
    return (
        <div>
            {lines.map((line, index) => (
                <p
                    key={`${line}-${index}`}
                    style={{
                        margin: 0,
                        textIndent: '2.5cm',
                        lineHeight,
                        paddingTop: spaced && index === 0 ? '6pt' : 0,
                        ...style,
                    }}
                >
                    {line}
                </p>
            ))}
        </div>
    );
}

function OwnerBlock({
    shown,
    text,
}: {
    shown: (key: string) => boolean;
    text: (key: string) => string;
}) {
    const rows = [
        shown('owner') ? `ส่วนราชการเจ้าของเรื่อง ${text('owner')}` : '',
        shown('phone') ? `โทร. ${text('phone')}` : '',
        shown('fax') ? `โทรสาร ${text('fax')}` : '',
        shown('email') ? `ไปรษณีย์อิเล็กทรอนิกส์ ${text('email')}` : '',
    ].filter(Boolean);

    if (rows.length === 0) return null;
    return (
        <div className="mt-6">
            {rows.map((row) => (
                <p key={row}>{row}</p>
            ))}
        </div>
    );
}
