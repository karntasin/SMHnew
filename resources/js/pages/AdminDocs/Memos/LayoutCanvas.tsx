import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Copy,
    FileText,
    Grid3X3,
    Italic,
    Layers,
    Maximize2,
    Minimize2,
    Move,
    Plus,
    RotateCcw,
    Ruler,
    Sliders,
    Trash2,
    Type,
    Underline,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assetUrl } from '@/lib/asset';
import { cn } from '@/lib/utils';
import type { LayoutBlock, MemoBaseLayout, MemoLayout } from './types';

type TextAlign = NonNullable<LayoutBlock['align']>;

const ALIGN_OPTIONS: { value: TextAlign; label: string; icon: typeof AlignLeft }[] = [
    { value: 'left', label: 'ชิดซ้าย', icon: AlignLeft },
    { value: 'center', label: 'กึ่งกลาง', icon: AlignCenter },
    { value: 'right', label: 'ชิดขวา', icon: AlignRight },
    { value: 'justify', label: 'กระจาย', icon: AlignJustify },
];

const FONT_FAMILIES = [
    'TH Sarabun New',
    'TH Sarabun PSK',
    'Sarabun',
    'Angsana New',
    'Cordia New',
    'Tahoma',
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 29, 32, 36];
const LINE_SPACINGS = [1.0, 1.15, 1.25, 1.5, 2.0];

const CM_TO_PX = 37.8;
const SNAP = 0.1;

interface Props {
    layout: MemoLayout;
    baseLayout: MemoBaseLayout;
    defaultLayout: MemoLayout;
    onChange: (layout: MemoLayout) => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

function snap(value: number): number {
    return Math.round(value / SNAP) * SNAP;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function blockSampleText(block: LayoutBlock): string {
    if (block.role === 'garuda') return '';
    if (block.role === 'rule') return '';
    if (block.role === 'static') return block.text || 'ข้อความ';
    if (block.role === 'signature') return '(ลงชื่อ)....................................\n(นายแพทย์สาธารณสุขจังหวัด)';
    if (block.role === 'copies') return 'สำเนาส่ง: ส่วนราชการที่เกี่ยวข้อง';
    if (block.role === 'contact') return 'โทร. ๐-๓๗๒๑-๑๑๑๑ โทรสาร ๐-๓๗๒๑-๑๑๑๒';

    const sampleMap: Record<string, string> = {
        agency: 'ส่วนราชการ กลุ่มงานเทคโนโลยีสารสนเทศ โรงพยาบาลค่ายสุรสิงหนาท',
        document_no: 'ที่ กห ๐๔๘๓.๖๓/๑๒๓',
        document_date: 'วันที่ ๒๗ ตุลาคม ๒๕๖๙',
        subject: 'เรื่อง ขออนุมัติจัดซื้อครุภัณฑ์คอมพิวเตอร์',
        addressee: 'เรียน ผู้อำนวยการโรงพยาบาลค่ายสุรสิงหนาท',
        reference: 'อ้างถึง หนังสือกรมแพทย์ทหารบก ที่ กห ๐๔๘๓/๔๕๖',
        attachment: 'สิ่งที่ส่งมาด้วย รายละเอียดคุณลักษณะเฉพาะ จำนวน ๑ ชุด',
        body: 'ด้วยกลุ่มงานฯ มีความประสงค์จะดำเนินการพัฒนาระบบเทคโนโลยีสารสนเทศ...',
        closing: 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ',
        unit_name: 'โรงพยาบาลค่ายสุรสิงหนาท',
        address: '๑๒๓ หมู่ ๑ ต.บ้านสร้าง อ.บ้านสร้าง จ.ปราจีนบุรี ๒๕๑๑๐',
        authority: 'อาศัยอำนาจตามความในพระราชกฤษฎีกา...',
        orders: 'จึงแต่งตั้งคณะทำงานพัฒนาระบบเทคโนโลยีสารสนเทศ...',
        effective: 'ทั้งนี้ ตั้งแต่วันที่ ๑ พฤศจิกายน ๒๕๖๙ เป็นต้นไป',
        order_date: 'สั่ง ณ วันที่ ๒๗ ตุลาคม พ.ศ. ๒๕๖๙',
    };

    return sampleMap[block.field ?? ''] || block.label || block.field || block.id;
}

function blockLabel(block: LayoutBlock): string {
    if (block.role === 'garuda') return 'ครุฑ';
    if (block.role === 'rule') return 'เส้นคั่น';
    if (block.role === 'signature') return 'ลายเซ็น';
    if (block.role === 'copies') return 'สำเนา';
    if (block.role === 'contact') return 'ติดต่อ';
    if (block.role === 'static') return block.text || 'ข้อความอิสระ';
    return block.label || block.field || block.id;
}

export default function LayoutCanvas({
    layout,
    baseLayout,
    defaultLayout,
    onChange,
    isFullscreen = false,
    onToggleFullscreen,
}: Props) {
    const frameRef = useRef<HTMLDivElement>(null);
    const [ribbonTab, setRibbonTab] = useState<'home' | 'insert' | 'layout' | 'view'>('home');
    const [scale, setScale] = useState(0.55);
    const [manualScale, setManualScale] = useState<number | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(layout.blocks[0]?.id ?? null);
    const [inspectorTab, setInspectorTab] = useState<'block' | 'page'>('block');
    const [showRulers, setShowRulers] = useState(true);
    const [showMarginGuides, setShowMarginGuides] = useState(true);
    const [showGridlines, setShowGridlines] = useState(false);
    const [isEditingInline, setIsEditingInline] = useState(false);

    const dragRef = useRef<{
        id: string;
        mode: 'move' | 'resize';
        handle?: string;
        startX: number;
        startY: number;
        orig: LayoutBlock;
    } | null>(null);

    const pageW = layout.page.width_cm;
    const pageH = layout.page.height_cm;
    const marginTop = layout.page.margin_top_cm ?? (baseLayout === 'internal' ? 1.5 : 2.5);
    const marginBottom = layout.page.margin_bottom_cm ?? 2.0;
    const marginLeft = layout.page.margin_left_cm ?? 3.0;
    const marginRight = layout.page.margin_right_cm ?? 2.0;

    const selected = layout.blocks.find((block) => block.id === selectedId) ?? null;

    // Auto-fit scale if manualScale is null
    useEffect(() => {
        const frame = frameRef.current;
        if (!frame || manualScale !== null) return;
        const update = () => {
            const paperPx = pageW * CM_TO_PX + (showRulers ? 32 : 0);
            const available = Math.max(120, frame.clientWidth - 48);
            const minScale = available < 400 ? 0.25 : 0.35;
            setScale(Math.min(1.2, Math.max(minScale, available / paperPx)));
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(frame);
        return () => observer.disconnect();
    }, [pageW, manualScale, showRulers]);

    const activeScale = manualScale ?? scale;

    const patchBlock = (id: string, patch: Partial<LayoutBlock>) => {
        onChange({
            ...layout,
            blocks: layout.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
        });
    };

    const patchPage = (patch: Partial<MemoLayout['page']>) => {
        onChange({
            ...layout,
            page: {
                ...layout.page,
                ...patch,
            },
        });
    };

    const applyPagePreset = (preset: 'saraban' | 'internal' | 'normal' | 'narrow') => {
        if (preset === 'saraban') {
            patchPage({
                margin_top_cm: 2.5,
                margin_bottom_cm: 2.0,
                margin_left_cm: 3.0,
                margin_right_cm: 2.0,
                width_cm: 21.0,
                height_cm: 29.7,
                orientation: 'portrait',
            });
        } else if (preset === 'internal') {
            patchPage({
                margin_top_cm: 1.5,
                margin_bottom_cm: 2.0,
                margin_left_cm: 3.0,
                margin_right_cm: 2.0,
                width_cm: 21.0,
                height_cm: 29.7,
                orientation: 'portrait',
            });
        } else if (preset === 'normal') {
            patchPage({
                margin_top_cm: 2.54,
                margin_bottom_cm: 2.54,
                margin_left_cm: 2.54,
                margin_right_cm: 2.54,
            });
        } else if (preset === 'narrow') {
            patchPage({
                margin_top_cm: 1.27,
                margin_bottom_cm: 1.27,
                margin_left_cm: 1.27,
                margin_right_cm: 1.27,
            });
        }
    };

    // Add Block Actions
    const addTextBlock = () => {
        const newBlock: LayoutBlock = {
            id: 'static_' + Math.random().toString(36).substring(2, 8),
            role: 'static',
            text: 'ข้อความอิสระ',
            x_cm: snap(marginLeft),
            y_cm: snap(marginTop + 1.0),
            w_cm: 6.0,
            h_cm: 1.0,
            align: 'left',
            font_pt: 16,
            bold: false,
        };
        onChange({
            ...layout,
            blocks: [...layout.blocks, newBlock],
        });
        setSelectedId(newBlock.id);
        setInspectorTab('block');
    };

    const addRuleBlock = () => {
        const newRule: LayoutBlock = {
            id: 'rule_' + Math.random().toString(36).substring(2, 8),
            role: 'rule',
            x_cm: snap(marginLeft),
            y_cm: snap(marginTop + 4.0),
            w_cm: snap(pageW - marginLeft - marginRight),
            h_cm: 0.4,
        };
        onChange({
            ...layout,
            blocks: [...layout.blocks, newRule],
        });
        setSelectedId(newRule.id);
        setInspectorTab('block');
    };

    const duplicateBlock = () => {
        if (!selected) return;
        const copyBlock: LayoutBlock = {
            ...structuredClone(selected),
            id: selected.role + '_' + Math.random().toString(36).substring(2, 8),
            x_cm: snap(clamp(selected.x_cm + 0.5, 0, pageW - selected.w_cm)),
            y_cm: snap(clamp(selected.y_cm + 0.5, 0, pageH - selected.h_cm)),
        };
        onChange({
            ...layout,
            blocks: [...layout.blocks, copyBlock],
        });
        setSelectedId(copyBlock.id);
    };

    const deleteBlock = () => {
        if (!selected) return;
        if (selected.role === 'garuda') {
            alert('ไม่สามารถลบตราครุฑได้');
            return;
        }
        onChange({
            ...layout,
            blocks: layout.blocks.filter((b) => b.id !== selected.id),
        });
        setSelectedId(null);
    };

    const centerHorizontally = () => {
        if (!selected) return;
        const printableW = pageW - marginLeft - marginRight;
        const newX = snap(marginLeft + (printableW - selected.w_cm) / 2);
        patchBlock(selected.id, { x_cm: clamp(newX, 0, pageW - selected.w_cm) });
    };

    // Drag & Resize Handlers
    const onPointerDown = (
        event: ReactPointerEvent,
        block: LayoutBlock,
        mode: 'move' | 'resize',
        handle: string = 'se',
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedId(block.id);
        setIsEditingInline(false);
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        dragRef.current = {
            id: block.id,
            mode,
            handle,
            startX: event.clientX,
            startY: event.clientY,
            orig: { ...block },
        };
    };

    const onPointerMove = (event: ReactPointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dxCm = (event.clientX - drag.startX) / (CM_TO_PX * activeScale);
        const dyCm = (event.clientY - drag.startY) / (CM_TO_PX * activeScale);

        if (drag.mode === 'move') {
            patchBlock(drag.id, {
                x_cm: snap(clamp(drag.orig.x_cm + dxCm, 0, pageW - drag.orig.w_cm)),
                y_cm: snap(clamp(drag.orig.y_cm + dyCm, 0, pageH - drag.orig.h_cm)),
            });
            return;
        }

        // Resize mode
        if (drag.handle === 'se') {
            patchBlock(drag.id, {
                w_cm: snap(clamp(drag.orig.w_cm + dxCm, 0.5, pageW - drag.orig.x_cm)),
                h_cm: snap(clamp(drag.orig.h_cm + dyCm, 0.4, pageH - drag.orig.y_cm)),
            });
        } else if (drag.handle === 'e') {
            patchBlock(drag.id, {
                w_cm: snap(clamp(drag.orig.w_cm + dxCm, 0.5, pageW - drag.orig.x_cm)),
            });
        } else if (drag.handle === 's') {
            patchBlock(drag.id, {
                h_cm: snap(clamp(drag.orig.h_cm + dyCm, 0.4, pageH - drag.orig.y_cm)),
            });
        }
    };

    const onPointerUp = () => {
        dragRef.current = null;
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditingInline) return;
            if (!selected) return;

            // Delete
            if (e.key === 'Delete' || (e.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName))) {
                e.preventDefault();
                deleteBlock();
                return;
            }

            // Move with Arrows
            const step = e.shiftKey ? 0.5 : 0.1;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                patchBlock(selected.id, { x_cm: snap(clamp(selected.x_cm - step, 0, pageW - selected.w_cm)) });
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                patchBlock(selected.id, { x_cm: snap(clamp(selected.x_cm + step, 0, pageW - selected.w_cm)) });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                patchBlock(selected.id, { y_cm: snap(clamp(selected.y_cm - step, 0, pageH - selected.h_cm)) });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                patchBlock(selected.id, { y_cm: snap(clamp(selected.y_cm + step, 0, pageH - selected.h_cm)) });
            }

            // Formatting Shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'b' || e.key === 'B') {
                    e.preventDefault();
                    patchBlock(selected.id, { bold: !selected.bold });
                } else if (e.key === 'i' || e.key === 'I') {
                    e.preventDefault();
                    patchBlock(selected.id, { italic: !selected.italic });
                } else if (e.key === 'u' || e.key === 'U') {
                    e.preventDefault();
                    patchBlock(selected.id, { underline: !selected.underline });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selected, isEditingInline, pageW, pageH]);

    // Active block formatting values (fallback to page defaults)
    const activeFontFamily = selected?.font_family ?? layout.page.font_family ?? 'TH Sarabun New';
    const activeFontSize = selected?.font_pt ?? layout.page.font_size_pt ?? 16;
    const activeBold = selected?.bold ?? false;
    const activeItalic = selected?.italic ?? false;
    const activeUnderline = selected?.underline ?? false;
    const activeAlign = selected?.align ?? 'left';
    const activeTransform = selected?.text_transform ?? 'none';
    const activeLineHeight = selected?.line_height ?? layout.page.line_spacing ?? 1.15;
    const activeIndent = selected?.indent_cm ?? 0;

    const cycleTransform = () => {
        if (!selected) return;
        const nextMap: Record<NonNullable<LayoutBlock['text_transform']>, LayoutBlock['text_transform']> = {
            none: 'uppercase',
            uppercase: 'lowercase',
            lowercase: 'capitalize',
            capitalize: 'none',
        };
        patchBlock(selected.id, { text_transform: nextMap[activeTransform] });
    };

    const changeFontSize = (delta: number) => {
        if (!selected) return;
        const newSize = Math.max(10, Math.min(36, activeFontSize + delta));
        patchBlock(selected.id, { font_pt: newSize });
    };

    return (
        <div className="flex flex-col space-y-3 font-sans">
            {/* MICROSOFT WORD-STYLE RIBBON TABS */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Tab Headers */}
                <div className="flex items-center border-b border-slate-200 bg-stone-100/80 px-2 text-xs font-medium text-slate-600">
                    <button
                        type="button"
                        onClick={() => setRibbonTab('home')}
                        className={cn(
                            'px-3 py-2 border-b-2 font-medium transition-colors',
                            ribbonTab === 'home'
                                ? 'border-emerald-600 bg-white text-emerald-800 font-semibold'
                                : 'border-transparent hover:text-slate-900',
                        )}
                    >
                        หน้าแรก (Home)
                    </button>
                    <button
                        type="button"
                        onClick={() => setRibbonTab('insert')}
                        className={cn(
                            'px-3 py-2 border-b-2 font-medium transition-colors',
                            ribbonTab === 'insert'
                                ? 'border-emerald-600 bg-white text-emerald-800 font-semibold'
                                : 'border-transparent hover:text-slate-900',
                        )}
                    >
                        แทรก (Insert)
                    </button>
                    <button
                        type="button"
                        onClick={() => setRibbonTab('layout')}
                        className={cn(
                            'px-3 py-2 border-b-2 font-medium transition-colors',
                            ribbonTab === 'layout'
                                ? 'border-emerald-600 bg-white text-emerald-800 font-semibold'
                                : 'border-transparent hover:text-slate-900',
                        )}
                    >
                        เค้าโครง (Layout)
                    </button>
                    <button
                        type="button"
                        onClick={() => setRibbonTab('view')}
                        className={cn(
                            'px-3 py-2 border-b-2 font-medium transition-colors',
                            ribbonTab === 'view'
                                ? 'border-emerald-600 bg-white text-emerald-800 font-semibold'
                                : 'border-transparent hover:text-slate-900',
                        )}
                    >
                        มุมมอง (View)
                    </button>

                    {/* Fullscreen toggle button on the far right */}
                    {onToggleFullscreen && (
                        <div className="ml-auto pr-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-slate-600 hover:text-emerald-700"
                                onClick={onToggleFullscreen}
                                title={isFullscreen ? 'ย่อกลับขนาดเดิม' : 'ขยายเต็มหน้าจอ (Full Screen)'}
                            >
                                {isFullscreen ? (
                                    <>
                                        <Minimize2 className="mr-1 size-3.5" />
                                        ย่อจอ
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="mr-1 size-3.5" />
                                        ขยายเต็มจอ
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Ribbon Content Bar */}
                <div className="flex flex-wrap items-center gap-2 p-2 bg-gradient-to-b from-white to-stone-50 min-h-[48px]">
                    {/* TAB: HOME */}
                    {ribbonTab === 'home' && (
                        <>
                            {/* Font Family & Size */}
                            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                                <span className="text-[11px] font-medium text-slate-500">แบบอักษร:</span>
                                <select
                                    className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none"
                                    value={activeFontFamily}
                                    onChange={(e) => {
                                        if (selected) {
                                            patchBlock(selected.id, { font_family: e.target.value });
                                        } else {
                                            patchPage({ font_family: e.target.value });
                                        }
                                    }}
                                >
                                    {FONT_FAMILIES.map((font) => (
                                        <option key={font} value={font}>
                                            {font}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none"
                                    value={activeFontSize}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (selected) {
                                            patchBlock(selected.id, { font_pt: val });
                                        } else {
                                            patchPage({ font_size_pt: val });
                                        }
                                    }}
                                >
                                    {FONT_SIZES.map((size) => (
                                        <option key={size} value={size}>
                                            {size} pt
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 font-bold"
                                    title="เพิ่มขนาดอักษร (A+)"
                                    disabled={!selected}
                                    onClick={() => changeFontSize(1)}
                                >
                                    A+
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-xs"
                                    title="ลดขนาดอักษร (A-)"
                                    disabled={!selected}
                                    onClick={() => changeFontSize(-1)}
                                >
                                    A-
                                </Button>
                            </div>

                            {/* B, I, U, Aa */}
                            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={activeBold ? 'default' : 'outline'}
                                    className={cn('h-8 w-8 p-0', activeBold && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                                    title="ตัวหนา (Ctrl+B)"
                                    disabled={!selected || selected.role === 'garuda'}
                                    onClick={() => selected && patchBlock(selected.id, { bold: !activeBold })}
                                >
                                    <Bold className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={activeItalic ? 'default' : 'outline'}
                                    className={cn('h-8 w-8 p-0', activeItalic && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                                    title="ตัวเอียง (Ctrl+I)"
                                    disabled={!selected || selected.role === 'garuda'}
                                    onClick={() => selected && patchBlock(selected.id, { italic: !activeItalic })}
                                >
                                    <Italic className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={activeUnderline ? 'default' : 'outline'}
                                    className={cn('h-8 w-8 p-0', activeUnderline && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                                    title="ขีดเส้นใต้ (Ctrl+U)"
                                    disabled={!selected || selected.role === 'garuda'}
                                    onClick={() => selected && patchBlock(selected.id, { underline: !activeUnderline })}
                                >
                                    <Underline className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={activeTransform !== 'none' ? 'default' : 'outline'}
                                    className={cn('h-8 px-2 text-xs font-semibold', activeTransform !== 'none' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                                    title={`เปลี่ยนรูปแบบตัวอักษร (${activeTransform})`}
                                    disabled={!selected || selected.role === 'garuda'}
                                    onClick={cycleTransform}
                                >
                                    Aa
                                </Button>
                            </div>

                            {/* Alignment */}
                            <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                                {ALIGN_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const active = activeAlign === opt.value;
                                    return (
                                        <Button
                                            key={opt.value}
                                            type="button"
                                            size="sm"
                                            variant={active ? 'default' : 'outline'}
                                            className={cn('h-8 w-8 p-0', active && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                                            title={opt.label}
                                            disabled={!selected || selected.role === 'garuda'}
                                            onClick={() => selected && patchBlock(selected.id, { align: opt.value })}
                                        >
                                            <Icon className="size-4" />
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* Line Spacing & Indent */}
                            <div className="flex items-center gap-2 border-r border-slate-200 pr-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-medium text-slate-500">บรรทัด:</span>
                                    <select
                                        className="h-8 w-18 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none"
                                        value={activeLineHeight}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (selected) {
                                                patchBlock(selected.id, { line_height: val });
                                            } else {
                                                patchPage({ line_spacing: val });
                                            }
                                        }}
                                    >
                                        {LINE_SPACINGS.map((sp) => (
                                            <option key={sp} value={sp}>
                                                {sp.toFixed(2)}x
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-medium text-slate-500">ย่อหน้า:</span>
                                    <select
                                        className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none"
                                        value={activeIndent}
                                        disabled={!selected || selected.role === 'garuda'}
                                        onChange={(e) => {
                                            if (selected) patchBlock(selected.id, { indent_cm: Number(e.target.value) });
                                        }}
                                    >
                                        <option value={0}>0 ซม.</option>
                                        <option value={1.5}>1.5 ซม.</option>
                                        <option value={2.0}>2.0 ซม.</option>
                                        <option value={2.5}>2.5 ซม. (สารบรรณ)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Center Block Horizontally */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={!selected}
                                onClick={centerHorizontally}
                                title="จัดบล็อกให้อยู่กึ่งกลางหน้ากระดาษพอดี"
                            >
                                จัดกึ่งกลางหน้า
                            </Button>
                        </>
                    )}

                    {/* TAB: INSERT */}
                    {ribbonTab === 'insert' && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                onClick={addTextBlock}
                            >
                                <Type className="mr-1.5 size-3.5" />
                                + กล่องข้อความ (Text Box)
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={addRuleBlock}
                            >
                                <Plus className="mr-1.5 size-3.5" />
                                + เส้นคั่น (Horizontal Line)
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                disabled={!selected}
                                onClick={duplicateBlock}
                            >
                                <Copy className="mr-1.5 size-3.5" />
                                คัดลอกบล็อก (Duplicate)
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                                disabled={!selected || selected.role === 'garuda'}
                                onClick={deleteBlock}
                            >
                                <Trash2 className="mr-1.5 size-3.5" />
                                ลบบล็อก (Delete)
                            </Button>
                        </div>
                    )}

                    {/* TAB: LAYOUT */}
                    {ribbonTab === 'layout' && (
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3">
                                <span className="text-[11px] font-medium text-slate-500">ขอบพิมพ์ด่วน:</span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-[11px]"
                                    onClick={() => applyPagePreset('saraban')}
                                >
                                    มาตรฐานสารบรรณ (2.5/3/2)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-[11px]"
                                    onClick={() => applyPagePreset('internal')}
                                >
                                    บันทึกใน (1.5/3/2)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-[11px]"
                                    onClick={() => applyPagePreset('normal')}
                                >
                                    ปกติ (2.54)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-[11px]"
                                    onClick={() => applyPagePreset('narrow')}
                                >
                                    แคบ (1.27)
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-500">ขนาด:</span>
                                <select
                                    className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                                    value={`${pageW}x${pageH}`}
                                    onChange={(e) => {
                                        const [w, h] = e.target.value.split('x').map(Number);
                                        patchPage({ width_cm: w, height_cm: h });
                                    }}
                                >
                                    <option value="21x29.7">A4 (21 x 29.7 ซม.)</option>
                                    <option value="21.5x35.5">F4 / Legal (21.5 x 35.5 ซม.)</option>
                                    <option value="21.59x27.94">Letter (21.59 x 27.94 ซม.)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-500">การวางแนว:</span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={layout.page.orientation !== 'landscape' ? 'default' : 'outline'}
                                    className={cn('h-8 text-xs', layout.page.orientation !== 'landscape' && 'bg-emerald-600 text-white')}
                                    onClick={() => patchPage({ orientation: 'portrait' })}
                                >
                                    แนวตั้ง
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={layout.page.orientation === 'landscape' ? 'default' : 'outline'}
                                    className={cn('h-8 text-xs', layout.page.orientation === 'landscape' && 'bg-emerald-600 text-white')}
                                    onClick={() => patchPage({ orientation: 'landscape' })}
                                >
                                    แนวนอน
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* TAB: VIEW */}
                    {ribbonTab === 'view' && (
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showRulers}
                                    onChange={(e) => setShowRulers(e.target.checked)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <Ruler className="size-3.5 text-slate-500" />
                                ไม้บรรทัด (Rulers)
                            </label>

                            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none border-l border-slate-200 pl-3">
                                <input
                                    type="checkbox"
                                    checked={showMarginGuides}
                                    onChange={(e) => setShowMarginGuides(e.target.checked)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <FileText className="size-3.5 text-slate-500" />
                                เส้นขอบพิมพ์ (Margin Guides)
                            </label>

                            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none border-l border-slate-200 pl-3">
                                <input
                                    type="checkbox"
                                    checked={showGridlines}
                                    onChange={(e) => setShowGridlines(e.target.checked)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <Grid3X3 className="size-3.5 text-slate-500" />
                                เส้นตาราง (Gridlines)
                            </label>

                            {/* Zoom controls */}
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-3 ml-auto">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setManualScale(Math.max(0.3, activeScale - 0.1))}
                                    title="ซูมออก (-)"
                                >
                                    <ZoomOut className="size-3.5" />
                                </Button>
                                <span className="text-[11px] font-mono text-slate-600 w-12 text-center">
                                    {Math.round(activeScale * 100)}%
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setManualScale(Math.min(1.5, activeScale + 0.1))}
                                    title="ซูมเข้า (+)"
                                >
                                    <ZoomIn className="size-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={() => setManualScale(null)}
                                    title="พอดีหน้าจอ"
                                >
                                    พอดีจอ
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN WORKSPACE: CANVAS + INSPECTOR */}
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,290px)]">
                {/* CANVAS VIEWPORT CONTAINER */}
                <div
                    ref={frameRef}
                    className="min-w-0 overflow-auto rounded-2xl bg-stone-200/90 p-4 select-none relative"
                    style={{ minHeight: '620px' }}
                    onClick={() => setSelectedId(null)}
                >
                    <div className="inline-block relative">
                        {/* HORIZONTAL RULER (MS Word Style) */}
                        {showRulers && (
                            <div
                                className="relative bg-stone-100 border-b border-stone-300 text-[9px] font-mono select-none"
                                style={{
                                    marginLeft: '26px', // Matches vertical ruler width
                                    width: pageW * CM_TO_PX * activeScale,
                                    height: '22px',
                                }}
                            >
                                {/* Left Margin Shade */}
                                <div
                                    className="absolute top-0 bottom-0 bg-stone-300/60"
                                    style={{
                                        left: 0,
                                        width: marginLeft * CM_TO_PX * activeScale,
                                    }}
                                />
                                {/* Right Margin Shade */}
                                <div
                                    className="absolute top-0 bottom-0 bg-stone-300/60"
                                    style={{
                                        left: (pageW - marginRight) * CM_TO_PX * activeScale,
                                        width: marginRight * CM_TO_PX * activeScale,
                                    }}
                                />
                                {/* Active Block Marker on Horizontal Ruler */}
                                {selected && (
                                    <div
                                        className="absolute top-0 bottom-0 bg-emerald-500/30 border-l border-r border-emerald-600"
                                        style={{
                                            left: selected.x_cm * CM_TO_PX * activeScale,
                                            width: selected.w_cm * CM_TO_PX * activeScale,
                                        }}
                                    />
                                )}
                                {/* Tick marks */}
                                {Array.from({ length: Math.ceil(pageW) + 1 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute bottom-0 border-l border-stone-400"
                                        style={{
                                            left: i * CM_TO_PX * activeScale,
                                            height: i % 5 === 0 ? '12px' : '6px',
                                        }}
                                    >
                                        {i % 2 === 0 && (
                                            <span className="absolute -top-3.5 -left-1 text-[8px] text-stone-600">
                                                {i}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex">
                            {/* VERTICAL RULER (MS Word Style) */}
                            {showRulers && (
                                <div
                                    className="relative bg-stone-100 border-r border-stone-300 text-[9px] font-mono select-none"
                                    style={{
                                        width: '26px',
                                        height: pageH * CM_TO_PX * activeScale,
                                    }}
                                >
                                    {/* Top Margin Shade */}
                                    <div
                                        className="absolute left-0 right-0 bg-stone-300/60"
                                        style={{
                                            top: 0,
                                            height: marginTop * CM_TO_PX * activeScale,
                                        }}
                                    />
                                    {/* Bottom Margin Shade */}
                                    <div
                                        className="absolute left-0 right-0 bg-stone-300/60"
                                        style={{
                                            top: (pageH - marginBottom) * CM_TO_PX * activeScale,
                                            height: marginBottom * CM_TO_PX * activeScale,
                                        }}
                                    />
                                    {/* Active Block Marker on Vertical Ruler */}
                                    {selected && (
                                        <div
                                            className="absolute left-0 right-0 bg-emerald-500/30 border-t border-b border-emerald-600"
                                            style={{
                                                top: selected.y_cm * CM_TO_PX * activeScale,
                                                height: selected.h_cm * CM_TO_PX * activeScale,
                                            }}
                                        />
                                    )}
                                    {/* Tick marks */}
                                    {Array.from({ length: Math.ceil(pageH) + 1 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute right-0 border-t border-stone-400"
                                            style={{
                                                top: i * CM_TO_PX * activeScale,
                                                width: i % 5 === 0 ? '12px' : '6px',
                                            }}
                                        >
                                            {i % 2 === 0 && (
                                                <span className="absolute -top-2 left-0.5 text-[8px] text-stone-600">
                                                    {i}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* PAPER CANVAS */}
                            <div
                                style={{
                                    width: pageW * CM_TO_PX * activeScale,
                                    height: pageH * CM_TO_PX * activeScale,
                                }}
                            >
                                <div
                                    className="relative bg-white shadow-xl select-none"
                                    style={{
                                        width: pageW * CM_TO_PX,
                                        height: pageH * CM_TO_PX,
                                        transform: `scale(${activeScale})`,
                                        transformOrigin: 'top left',
                                    }}
                                    onPointerMove={onPointerMove}
                                    onPointerUp={onPointerUp}
                                    onPointerLeave={onPointerUp}
                                    onClick={() => setSelectedId(null)}
                                >
                                    {/* GRIDLINES (1cm squares if enabled) */}
                                    {showGridlines && (
                                        <div
                                            className="pointer-events-none absolute inset-0"
                                            style={{
                                                backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
                                                backgroundSize: `${CM_TO_PX}px ${CM_TO_PX}px`,
                                            }}
                                        />
                                    )}

                                    {/* PRINT MARGIN GUIDES (Dashed Green Box) */}
                                    {showMarginGuides && (
                                        <div
                                            className="pointer-events-none absolute border border-dashed border-emerald-400/80"
                                            style={{
                                                left: marginLeft * CM_TO_PX,
                                                top: marginTop * CM_TO_PX,
                                                width: Math.max(0, pageW - marginLeft - marginRight) * CM_TO_PX,
                                                height: Math.max(0, pageH - marginTop - marginBottom) * CM_TO_PX,
                                            }}
                                        >
                                            <span className="absolute -top-4 left-1 text-[9px] font-medium text-emerald-700/80">
                                                ขอบพิมพ์จริง (บน {marginTop} ซม. · ซ้าย {marginLeft} ซม. · ขวา {marginRight} ซม. · ล่าง {marginBottom} ซม.)
                                            </span>
                                        </div>
                                    )}

                                    {/* DOCUMENT BLOCKS */}
                                    {layout.blocks.map((block) => {
                                        const active = selectedId === block.id;
                                        const bFont = block.font_family || layout.page.font_family || 'TH Sarabun New';
                                        const bSize = block.font_pt ?? layout.page.font_size_pt ?? 16;
                                        const bAlign = block.align === 'justify' ? 'justify' : (block.align ?? 'left');

                                        return (
                                            <div
                                                key={block.id}
                                                role="button"
                                                tabIndex={0}
                                                className={cn(
                                                    'absolute cursor-move select-none transition-shadow text-[11px] leading-tight text-slate-800 group',
                                                    active
                                                        ? 'ring-2 ring-emerald-500 bg-emerald-50/20 z-20 shadow-md'
                                                        : 'hover:bg-slate-100/40 border border-transparent hover:border-slate-300',
                                                )}
                                                style={{
                                                    left: block.x_cm * CM_TO_PX,
                                                    top: block.y_cm * CM_TO_PX,
                                                    width: block.w_cm * CM_TO_PX,
                                                    height: block.h_cm * CM_TO_PX,
                                                    textAlign: bAlign,
                                                    fontFamily: `"${bFont}", sans-serif`,
                                                    fontSize: `${bSize * 0.75}px`,
                                                    fontWeight: block.bold ? 700 : 400,
                                                    fontStyle: block.italic ? 'italic' : 'normal',
                                                    textDecoration: block.underline ? 'underline' : 'none',
                                                    textTransform: block.text_transform && block.text_transform !== 'none' ? block.text_transform : undefined,
                                                    lineHeight: block.line_height ?? layout.page.line_spacing ?? 1.15,
                                                    paddingLeft: block.indent_cm ? `${block.indent_cm * CM_TO_PX}px` : undefined,
                                                }}
                                                onPointerDown={(event) => onPointerDown(event, block, 'move')}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelectedId(block.id);
                                                    setInspectorTab('block');
                                                }}
                                            >
                                                {/* Block Content */}
                                                <div className="h-full w-full overflow-hidden p-0.5">
                                                    {block.role === 'garuda' ? (
                                                        <img
                                                            src={assetUrl('/images/official/garuda.png?v=line')}
                                                            alt="ครุฑ"
                                                            className="mx-auto h-full w-auto object-contain pointer-events-none"
                                                            draggable={false}
                                                        />
                                                    ) : block.role === 'rule' ? (
                                                        <div className="w-full border-b-[1.5px] border-black my-auto mt-1" />
                                                    ) : (
                                                        <span className="block truncate">
                                                            {block.role === 'static' ? (block.text || 'ข้อความอิสระ') : blockSampleText(block)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* ACTIVE SELECTION CONTROLS */}
                                                {active && (
                                                    <>
                                                        {/* Floating Mini Toolbar */}
                                                        <div
                                                            className="absolute -top-7 left-0 flex items-center gap-1 bg-slate-800 text-white rounded px-1.5 py-0.5 text-[10px] shadow-lg pointer-events-auto z-30"
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="font-semibold text-emerald-300 pr-1 border-r border-slate-600">
                                                                {blockLabel(block)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={duplicateBlock}
                                                                className="hover:text-emerald-300 px-1"
                                                                title="คัดลอกบล็อก (Duplicate)"
                                                            >
                                                                คัดลอก
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={centerHorizontally}
                                                                className="hover:text-emerald-300 px-1"
                                                                title="จัดกึ่งกลางหน้า"
                                                            >
                                                                กึ่งกลาง
                                                            </button>
                                                            {block.role !== 'garuda' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={deleteBlock}
                                                                    className="hover:text-rose-300 px-1 text-rose-400"
                                                                    title="ลบบล็อก (Delete)"
                                                                >
                                                                    ลบ
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Corner SE Resize Handle */}
                                                        <span
                                                            className="absolute -bottom-1 -right-1 h-3.5 w-3.5 cursor-se-resize bg-emerald-600 border border-white rounded-xs shadow-xs"
                                                            onPointerDown={(event) => onPointerDown(event, block, 'resize', 'se')}
                                                        />
                                                        {/* Right E Resize Handle */}
                                                        <span
                                                            className="absolute top-1/2 -right-1 -translate-y-1/2 h-3.5 w-2 cursor-e-resize bg-emerald-600 border border-white rounded-xs shadow-xs"
                                                            onPointerDown={(event) => onPointerDown(event, block, 'resize', 'e')}
                                                        />
                                                        {/* Bottom S Resize Handle */}
                                                        <span
                                                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-3.5 cursor-s-resize bg-emerald-600 border border-white rounded-xs shadow-xs"
                                                            onPointerDown={(event) => onPointerDown(event, block, 'resize', 's')}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PROPERTY INSPECTOR PANEL */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                    <div>
                        {/* Tab Switcher: Block / Page */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={inspectorTab === 'block' ? 'default' : 'ghost'}
                                    className={cn('h-7 px-2.5 text-xs', inspectorTab === 'block' && 'bg-emerald-600 text-white')}
                                    onClick={() => setInspectorTab('block')}
                                >
                                    <Type className="mr-1 size-3.5" />
                                    บล็อกที่เลือก
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={inspectorTab === 'page' ? 'default' : 'ghost'}
                                    className={cn('h-7 px-2.5 text-xs', inspectorTab === 'page' && 'bg-emerald-600 text-white')}
                                    onClick={() => setInspectorTab('page')}
                                >
                                    <Sliders className="mr-1 size-3.5" />
                                    หน้ากระดาษ
                                </Button>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                    if (confirm('ต้องการคืนค่าเริ่มต้นทั้งหมดของฟอร์มนี้ใช่หรือไม่?')) {
                                        onChange(structuredClone(defaultLayout));
                                        setSelectedId(defaultLayout.blocks[0]?.id ?? null);
                                    }
                                }}
                                title="คืนค่าฟอร์มเริ่มต้น"
                            >
                                <RotateCcw className="mr-1 size-3" />
                                รีเซ็ต
                            </Button>
                        </div>

                        {/* TAB: BLOCK PROPERTIES */}
                        {inspectorTab === 'block' && (
                            <div>
                                {!selected ? (
                                    <div className="py-12 text-center">
                                        <FileText className="mx-auto size-9 text-slate-300" />
                                        <p className="mt-2 text-xs text-slate-500">คลิกบล็อกบนกระดาษเพื่อดูและปรับแต่งคุณสมบัติ</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-3 text-xs"
                                            onClick={addTextBlock}
                                        >
                                            <Plus className="mr-1 size-3.5" />
                                            เพิ่มกล่องข้อความใหม่
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-emerald-950">{blockLabel(selected)}</p>
                                                <p className="text-[10px] text-emerald-700">บทบาท: {selected.role} · ID: {selected.id}</p>
                                            </div>
                                            {selected.role !== 'garuda' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-rose-600 hover:bg-rose-100"
                                                    onClick={deleteBlock}
                                                    title="ลบบล็อกนี้"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Static Text Content Editing */}
                                        {selected.role === 'static' && (
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-slate-700">ข้อความ (แก้ไขได้ทันที)</Label>
                                                <Input
                                                    value={selected.text ?? ''}
                                                    onChange={(e) => patchBlock(selected.id, { text: e.target.value })}
                                                    placeholder="พิมพ์ข้อความที่ต้องการ..."
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        )}

                                        {/* Typography Options */}
                                        {selected.role !== 'garuda' && selected.role !== 'rule' && (
                                            <div className="space-y-2 border-t border-slate-100 pt-2">
                                                <Label className="text-xs font-medium text-slate-700">แบบและขนาดตัวอักษร</Label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">ฟอนต์</span>
                                                        <select
                                                            className="mt-0.5 w-full rounded-md border border-slate-200 bg-white p-1 text-xs"
                                                            value={selected.font_family ?? ''}
                                                            onChange={(e) => patchBlock(selected.id, { font_family: e.target.value || undefined })}
                                                        >
                                                            <option value="">ตามหน้ากระดาษ ({layout.page.font_family ?? 'TH Sarabun New'})</option>
                                                            {FONT_FAMILIES.map((f) => (
                                                                <option key={f} value={f}>
                                                                    {f}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">ขนาด (pt)</span>
                                                        <Input
                                                            type="number"
                                                            min={10}
                                                            max={36}
                                                            value={selected.font_pt ?? 16}
                                                            onChange={(e) => patchBlock(selected.id, { font_pt: Number(e.target.value) || 16 })}
                                                            className="mt-0.5 h-7 text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Indent & Line spacing */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">ย่อหน้าแรก (ซม.)</span>
                                                        <Input
                                                            type="number"
                                                            step={0.5}
                                                            min={0}
                                                            max={10}
                                                            value={selected.indent_cm ?? 0}
                                                            onChange={(e) => patchBlock(selected.id, { indent_cm: Number(e.target.value) || 0 })}
                                                            className="mt-0.5 h-7 text-xs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">ระยะบรรทัด</span>
                                                        <Input
                                                            type="number"
                                                            step={0.05}
                                                            min={0.8}
                                                            max={3.0}
                                                            value={selected.line_height ?? layout.page.line_spacing ?? 1.15}
                                                            onChange={(e) => patchBlock(selected.id, { line_height: Number(e.target.value) || 1.15 })}
                                                            className="mt-0.5 h-7 text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Spacing Before & After */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">ระยะห่างก่อน (pt)</span>
                                                        <Input
                                                            type="number"
                                                            step={2}
                                                            min={0}
                                                            max={72}
                                                            value={selected.space_before_pt ?? 0}
                                                            onChange={(e) => patchBlock(selected.id, { space_before_pt: Number(e.target.value) || 0 })}
                                                            className="mt-0.5 h-7 text-xs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-500">ระยะห่างหลัง (pt)</span>
                                                        <Input
                                                            type="number"
                                                            step={2}
                                                            min={0}
                                                            max={72}
                                                            value={selected.space_after_pt ?? 0}
                                                            onChange={(e) => patchBlock(selected.id, { space_after_pt: Number(e.target.value) || 0 })}
                                                            className="mt-0.5 h-7 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Position & Size */}
                                        <div className="border-t border-slate-100 pt-2">
                                            <Label className="text-xs font-medium text-slate-700">พิกัดและขนาด (ซม.)</Label>
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                <div>
                                                    <span className="text-[10px] text-slate-500">แนวนอน X</span>
                                                    <Input
                                                        type="number"
                                                        step={SNAP}
                                                        value={selected.x_cm}
                                                        onChange={(e) => patchBlock(selected.id, { x_cm: snap(Number(e.target.value) || 0) })}
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500">แนวตั้ง Y</span>
                                                    <Input
                                                        type="number"
                                                        step={SNAP}
                                                        value={selected.y_cm}
                                                        onChange={(e) => patchBlock(selected.id, { y_cm: snap(Number(e.target.value) || 0) })}
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500">ความกว้าง W</span>
                                                    <Input
                                                        type="number"
                                                        step={SNAP}
                                                        value={selected.w_cm}
                                                        onChange={(e) => patchBlock(selected.id, { w_cm: snap(Math.max(0.5, Number(e.target.value) || 0.5)) })}
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500">ความสูง H</span>
                                                    <Input
                                                        type="number"
                                                        step={SNAP}
                                                        value={selected.h_cm}
                                                        onChange={(e) => patchBlock(selected.id, { h_cm: snap(Math.max(0.2, Number(e.target.value) || 0.4)) })}
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: PAGE SETUP */}
                        {inspectorTab === 'page' && (
                            <div className="space-y-3">
                                <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-200">
                                    <p className="text-xs font-semibold text-stone-800">ตั้งค่าหน้ากระดาษ (Page Setup)</p>
                                    <p className="text-[10px] text-stone-500">กำหนดขนาดและขอบกระดาษเหมือนใน MS Word</p>
                                </div>

                                {/* Preset Buttons */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-600">ชุดการตั้งค่าด่วน</Label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[11px]"
                                            onClick={() => applyPagePreset('saraban')}
                                        >
                                            มาตรฐานสารบรรณ
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-[11px]"
                                            onClick={() => applyPagePreset('internal')}
                                        >
                                            บันทึกภายใน
                                        </Button>
                                    </div>
                                </div>

                                {/* Margins */}
                                <div className="border-t border-slate-100 pt-2 space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">ขอบกระดาษ (Margins - ซม.)</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500">ขอบบน (Top)</span>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                min={0.5}
                                                max={10}
                                                value={marginTop}
                                                onChange={(e) => patchPage({ margin_top_cm: snap(Number(e.target.value) || 2.5) })}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500">ขอบล่าง (Bottom)</span>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                min={0.5}
                                                max={10}
                                                value={marginBottom}
                                                onChange={(e) => patchPage({ margin_bottom_cm: snap(Number(e.target.value) || 2.0) })}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500">ขอบซ้าย (Left)</span>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                min={0.5}
                                                max={10}
                                                value={marginLeft}
                                                onChange={(e) => patchPage({ margin_left_cm: snap(Number(e.target.value) || 3.0) })}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500">ขอบขวา (Right)</span>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                min={0.5}
                                                max={10}
                                                value={marginRight}
                                                onChange={(e) => patchPage({ margin_right_cm: snap(Number(e.target.value) || 2.0) })}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Paper Size */}
                                <div className="border-t border-slate-100 pt-2 space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">ขนาดกระดาษ (Paper Size)</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500">ความกว้าง (ซม.)</span>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                value={pageW}
                                                onChange={(e) => patchPage({ width_cm: snap(Number(e.target.value) || 21.0) })}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500">ความสูง (ซม.)</span>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                value={pageH}
                                                onChange={(e) => patchPage({ height_cm: snap(Number(e.target.value) || 29.7) })}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Document-level defaults */}
                                <div className="border-t border-slate-100 pt-2 space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-700">แบบอักษรเริ่มต้นทั้งฉบับ</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500">ฟอนต์</span>
                                            <select
                                                className="w-full rounded-md border border-slate-200 bg-white p-1 text-xs"
                                                value={layout.page.font_family ?? 'TH Sarabun New'}
                                                onChange={(e) => patchPage({ font_family: e.target.value })}
                                            >
                                                {FONT_FAMILIES.map((f) => (
                                                    <option key={f} value={f}>
                                                        {f}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500">ขนาด (pt)</span>
                                            <Input
                                                type="number"
                                                value={layout.page.font_size_pt ?? 16}
                                                onChange={(e) => patchPage({ font_size_pt: Number(e.target.value) || 16 })}
                                                className="h-7 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                        <p>💡 เคล็ดลับ: ลากหรือใช้ปุ่มลูกศรเพื่อขยับบล็อกทีละ 0.1 ซม. (กด Shift ค้างไว้เพื่อขยับ 0.5 ซม.)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
