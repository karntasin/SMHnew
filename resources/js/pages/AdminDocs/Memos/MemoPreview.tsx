import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import { assetUrl } from '@/lib/asset';
import { sectionVisible, toThaiDigits, type MemoCatalogEntry, type MemoFonts, type MemoKind, type SectionMap } from './types';

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
    const fields = catalog[kind].fields;
    const fieldOf = (key: string) => fields.find((field) => field.key === key);

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
    const text = (key: string) => sections[key]?.value?.trim() ?? '';
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
                        padding: kind === 'internal' ? '3.3cm 2cm 2cm 3cm' : '4.8cm 2cm 2cm 3cm',
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        fontFamily: '"TH Sarabun New", serif',
                        fontSize: '16pt',
                        lineHeight: 1,
                    }}
                >
                    <img
                        src={assetUrl('/images/official/garuda.png')}
                        alt="ตราครุฑ"
                        style={{
                            position: 'absolute',
                            top: '1.5cm',
                            left: '50%',
                            height: kind === 'internal' ? '1.5cm' : '3cm',
                            width: 'auto',
                            transform: 'translateX(-50%)',
                        }}
                    />
                    {kind === 'internal' && <h1 style={title20}>บันทึกข้อความ</h1>}

                    {kind === 'external' && (
                        <header className="text-center">
                            {shown('unit_name') && <h1 style={title29}>{text('unit_name')}</h1>}
                            {shown('address') &&
                                text('address')
                                    .split('\n')
                                    .filter((line) => line.trim())
                                    .map((line, index) => (
                                        <p key={`${index}-${line}`} style={singleLine}>
                                            {line}
                                        </p>
                                    ))}
                        </header>
                    )}

                    {kind === 'order' && (
                        <header className="text-center">
                            <h1 style={orderTitle}>คำสั่ง{shown('unit_name') ? text('unit_name') : ''}</h1>
                            {showNo && <p style={singleCenterBold}>ที่{gap}{numbered('document_no')}</p>}
                            {shown('subject') && <p style={singleCenterBold}>เรื่อง{gap}{text('subject')}</p>}
                            <div style={{ borderBottom: '1.5px solid #000', margin: '2pt 18% 0' }} />
                        </header>
                    )}

                    {kind !== 'order' && (
                        <div>
                            {shown('agency') && <Meta label="ส่วนราชการ" value={text('agency')} />}
                            {showNo && showDate ? (
                                <p style={{ ...singleLine, position: 'relative' }}>
                                    <span>ที่{gap}{numbered('document_no')}</span>
                                    <span style={{ position: 'absolute', left: '7.5cm', top: 0 }}>วันที่{gap}{dated(dateKey)}</span>
                                </p>
                            ) : showNo ? (
                                <Meta label="ที่" value={numbered('document_no')} />
                            ) : showDate ? (
                                <Meta label="วันที่" value={dated(dateKey)} />
                            ) : null}
                            {shown('subject') && <Meta label="เรื่อง" value={text('subject')} spaced />}
                            {shown('addressee') && <Meta label="เรียน" value={text('addressee')} spaced />}
                            {shown('reference') && <Meta label="อ้างถึง" value={text('reference')} spaced />}
                            {shown('attachment') && <Meta label="สิ่งที่ส่งมาด้วย" value={text('attachment')} spaced />}
                        </div>
                    )}

                    {shown('body') && <Paragraphs text={text('body')} lineHeight={kind === 'order' ? 1.5 : 1} />}
                    {kind === 'internal' && shown('closing') && <Paragraphs text={text('closing')} />}
                    {kind === 'order' && shown('authority') && <Paragraphs text={text('authority')} lineHeight={1.5} spaced={!shown('body')} />}
                    {kind === 'order' && shown('orders') && <Paragraphs text={text('orders')} lineHeight={1.5} spaced={!shown('body') && !shown('authority')} />}

                    {kind === 'order' && shown('effective') && (
                        <p style={{ ...singleLine, lineHeight: 1.5, textIndent: '2.5cm' }}>
                            ทั้งนี้ ตั้งแต่{gap}
                            {thaiDigits ? toThaiDigits(text('effective')) : text('effective')}
                        </p>
                    )}
                    {kind === 'order' && showDate && <p style={orderDate}>สั่ง ณ วันที่{gap}{dated('order_date')}</p>}

                    {(closing || signerRank || signerName || signerPosition) && (
                        <div className="mt-[1em] grid grid-cols-2">
                            <div />
                            <div className="text-center">
                                {closing && (
                                    <>
                                        <p style={singleLine}>{closing}</p>
                                        <div className="h-[2em]" />
                                    </>
                                )}
                                {signerRank && <p style={singleLine}>{signerRank}</p>}
                                {signerName && <p style={singleLine}>({signerName.replace(/^\(|\)$/g, '')})</p>}
                                {signerPosition && <p style={singleLine}>{signerPosition}</p>}
                            </div>
                        </div>
                    )}

                    {kind === 'external' && <OwnerBlock shown={shown} text={text} />}

                    {shown('copies') && (
                        <div className="mt-4">
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
                        <div className="mt-4">
                            {shown('phone') && <p>โทร. {text('phone')}</p>}
                            {shown('fax') && <p>โทรสาร {text('fax')}</p>}
                        </div>
                    )}
                </article>
            </div>
            <p className="mt-2 text-center text-xs text-stone-500">ตัวอย่างกระดาษ A4 · TH Sarabun New</p>
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

function Meta({ label, value, spaced = false }: { label: string; value: string; spaced?: boolean }) {
    return (
        <p style={{ ...singleLine, paddingTop: spaced ? '6pt' : 0 }}>
            {label}
            {gap}
            {value}
        </p>
    );
}

function Paragraphs({ text, lineHeight = 1, spaced = true }: { text: string; lineHeight?: number; spaced?: boolean }) {
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
