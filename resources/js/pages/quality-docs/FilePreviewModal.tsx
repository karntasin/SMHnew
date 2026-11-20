import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Download,
    ExternalLink,
    FileText,
    FileSpreadsheet,
    FileArchive,
    Image as ImageIcon,
    Presentation,
    File as FileIcon,
    AlertCircle,
    Loader2,
    ZoomIn,
    ZoomOut,
    RotateCw,
} from 'lucide-react';

export interface PreviewTarget {
    url: string;
    fileName: string;
    fileExtension?: string;
    fileSize?: string;
    mimeType?: string;
    iconType?: string;
    downloadUrl?: string;
}

interface Props {
    target: PreviewTarget | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function FilePreviewModal({ target, isOpen, onClose }: Props) {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [isLoadingText, setIsLoadingText] = useState(false);
    const [textError, setTextError] = useState<string | null>(null);
    const [imageScale, setImageScale] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);

    const ext = (target?.fileExtension || target?.fileName.split('.').pop() || '').toLowerCase();

    const isPdf = ext === 'pdf' || target?.iconType === 'pdf' || target?.mimeType?.includes('pdf');
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || target?.iconType === 'image' || target?.mimeType?.startsWith('image/');
    const isText = ['txt', 'csv', 'log', 'md', 'json'].includes(ext) || target?.mimeType?.startsWith('text/');
    const isWord = ['doc', 'docx', 'rtf'].includes(ext) || target?.iconType === 'word';
    const isExcel = ['xls', 'xlsx'].includes(ext) || target?.iconType === 'excel';
    const isPpt = ['ppt', 'pptx'].includes(ext) || target?.iconType === 'powerpoint';
    const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || target?.iconType === 'archive';

    // Reset image transform on target change
    useEffect(() => {
        setImageScale(1);
        setImageRotation(0);
        setTextContent(null);
        setTextError(null);

        if (isOpen && target && isText && !isPdf && !isImage) {
            setIsLoadingText(true);
            fetch(target.url)
                .then((res) => {
                    if (!res.ok) throw new Error('ไม่สามารถโหลดเนื้อหาไฟล์ได้');
                    return res.text();
                })
                .then((text) => {
                    setTextContent(text);
                    setIsLoadingText(false);
                })
                .catch((err) => {
                    setTextError(err.message || 'เกิดข้อผิดพลาดในการโหลดไฟล์');
                    setIsLoadingText(false);
                });
        }
    }, [isOpen, target?.url]);

    if (!target) return null;

    const downloadLink = target.downloadUrl || target.url;

    const renderHeaderIcon = () => {
        if (isPdf) return <FileText className="h-5 w-5 text-rose-600" />;
        if (isImage) return <ImageIcon className="h-5 w-5 text-purple-600" />;
        if (isWord) return <FileText className="h-5 w-5 text-blue-600" />;
        if (isExcel) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
        if (isPpt) return <Presentation className="h-5 w-5 text-amber-600" />;
        if (isArchive) return <FileArchive className="h-5 w-5 text-amber-700" />;
        return <FileIcon className="h-5 w-5 text-slate-600" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[95vw] h-[90vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header Bar */}
                <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200/60">
                            {renderHeaderIcon()}
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-sm sm:text-base font-semibold text-slate-800 truncate" title={target.fileName}>
                                {target.fileName}
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                {ext && (
                                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                        .{ext}
                                    </span>
                                )}
                                {target.fileSize && (
                                    <span className="text-xs text-slate-400">
                                        {target.fileSize}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons on header */}
                    <div className="flex items-center gap-2 shrink-0 pr-8">
                        {isImage && (
                            <div className="hidden sm:flex items-center gap-1 mr-2 bg-white rounded-lg border border-slate-200 p-0.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                    title="ซูมเข้า"
                                    onClick={() => setImageScale((s) => Math.min(s + 0.25, 3))}
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                    title="ซูมออก"
                                    onClick={() => setImageScale((s) => Math.max(s - 0.25, 0.5))}
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                    title="หมุน 90 องศา"
                                    onClick={() => setImageRotation((r) => (r + 90) % 360)}
                                >
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border-slate-200 hidden sm:inline-flex"
                        >
                            <a href={target.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> เปิดแท็บใหม่
                            </a>
                        </Button>

                        <Button
                            asChild
                            size="sm"
                            className="h-8 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                            <a href={downloadLink} download={target.fileName}>
                                <Download className="mr-1.5 h-3.5 w-3.5" /> ดาวน์โหลด
                            </a>
                        </Button>
                    </div>
                </DialogHeader>

                {/* Body Content */}
                <div className="flex-1 overflow-hidden bg-slate-100/50 p-2 sm:p-4 flex flex-col justify-center items-center">
                    {/* PDF Viewer */}
                    {isPdf && (
                        <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-sm border border-slate-200">
                            <iframe
                                src={target.url}
                                className="w-full h-full border-0"
                                title={target.fileName}
                            />
                        </div>
                    )}

                    {/* Image Viewer */}
                    {isImage && (
                        <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-slate-900/5 rounded-xl border border-slate-200/80">
                            <img
                                src={target.url}
                                alt={target.fileName}
                                style={{
                                    transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                                    transition: 'transform 0.15s ease',
                                }}
                                className="max-h-[74vh] max-w-full object-contain rounded-lg shadow-lg select-none"
                            />
                        </div>
                    )}

                    {/* Text / Markdown / CSV Content */}
                    {isText && (
                        <div className="w-full h-full flex flex-col rounded-xl bg-white p-4 shadow-sm border border-slate-200">
                            {isLoadingText ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    <span className="text-sm">กำลังโหลดเนื้อหาตัวอย่าง...</span>
                                </div>
                            ) : textError ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-rose-500 gap-2">
                                    <AlertCircle className="h-8 w-8" />
                                    <p className="text-sm font-medium">{textError}</p>
                                </div>
                            ) : (
                                <pre className="flex-1 overflow-auto rounded-lg bg-slate-50 p-4 text-xs font-mono text-slate-800 leading-relaxed border border-slate-200/70 whitespace-pre-wrap">
                                    {textContent}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Office / Archive / Unsupported Format Fallback */}
                    {!isPdf && !isImage && !isText && (
                        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center space-y-5">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-inner">
                                {isWord ? (
                                    <FileText className="h-10 w-10 text-blue-600" />
                                ) : isExcel ? (
                                    <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                                ) : isPpt ? (
                                    <Presentation className="h-10 w-10 text-amber-600" />
                                ) : isArchive ? (
                                    <FileArchive className="h-10 w-10 text-amber-700" />
                                ) : (
                                    <FileIcon className="h-10 w-10 text-slate-500" />
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="text-base font-semibold text-slate-800 truncate" title={target.fileName}>
                                    {target.fileName}
                                </h4>
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                    <span>{ext.toUpperCase()} File</span>
                                    {target.fileSize && <span>• {target.fileSize}</span>}
                                </div>
                                <p className="text-xs text-slate-500 pt-2 leading-relaxed">
                                    ไฟล์ประเภทนี้ไม่สามารถแสดงตัวอย่างบนเบราว์เซอร์ได้โดยตรง<br />
                                    ท่านสามารถดาวน์โหลดไฟล์เพื่อเปิดผ่านโปรแกรมบนเครื่องของท่าน
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                                <Button
                                    asChild
                                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                                >
                                    <a href={downloadLink} download={target.fileName}>
                                        <Download className="mr-2 h-4 w-4" /> ดาวน์โหลดไฟล์ทันที
                                    </a>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                    <a href={target.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" /> เปิดในแท็บใหม่
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
