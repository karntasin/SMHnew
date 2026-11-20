import React, { useRef, useState } from 'react';
import { router, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    Download,
    CheckCircle,
    XCircle,
    Send,
    Clock,
    File,
    AlertCircle,
    BookOpen,
    FileText,
    FileSpreadsheet,
    FileArchive,
    Image as ImageIcon,
    Presentation,
    Upload,
    Plus,
    Trash2,
    ExternalLink,
    Archive,
    History,
    Edit3,
    Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DocsSubNav from '@/pages/quality-docs/DocsSubNav';
import FilePreviewModal, { PreviewTarget } from '@/pages/quality-docs/FilePreviewModal';

interface Attachment {
    id: number;
    file_name: string;
    original_name?: string;
    file_path: string;
    file_size: number;
    formatted_size: string;
    file_extension: string;
    icon_type: string;
    url: string;
    created_at: string;
    uploader?: {
        id: number;
        name: string;
    };
}

interface FileRow {
    id: string;
    file: File | null;
    customName: string;
}

interface Version {
    id: number;
    version_number: string;
    file_path: string;
    changes_description: string | null;
    created_at: string;
    uploader?: {
        id: number;
        name: string;
    };
}

interface Document {
    id: number;
    document_number: string;
    title: string;
    description: string;
    category: string;
    document_type: string;
    status: string;
    current_version: string;
    file_path: string;
    effective_date: string;
    review_date: string;
    created_at: string;
    updated_at: string;
    department?: {
        id: number;
        name: string;
    };
    owner?: {
        id: number;
        name: string;
    };
    attachments?: Attachment[];
    versions?: Version[];
}

interface Props {
    document: Document;
    can: {
        approve: boolean;
        edit: boolean;
        delete?: boolean;
    };
    canManageSettings: boolean;
}

export default function Show({ document, can, canManageSettings }: Props) {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isVersionOpen, setIsVersionOpen] = useState(false);
    const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
    const [isDeleteDocOpen, setIsDeleteDocOpen] = useState(false);
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handleOpenPreview = (target: PreviewTarget) => {
        setPreviewTarget(target);
        setIsPreviewOpen(true);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDeleteDocument = () => {
        router.delete(route('quality-docs.destroy', { qualityDoc: document.id }), {
            onSuccess: () => {
                setIsDeleteDocOpen(false);
            },
        });
    };

    // Form for adding new attachments
    const [uploadFileRows, setUploadFileRows] = useState<FileRow[]>([
        { id: 'up-1', file: null, customName: '' }
    ]);

    const handleAddUploadRow = () => {
        setUploadFileRows((prev) => [
            ...prev,
            { id: 'up-' + Date.now() + '-' + Math.random().toString(36).substring(7), file: null, customName: '' }
        ]);
    };

    const handleRemoveUploadRow = (id: string) => {
        if (uploadFileRows.length === 1) {
            setUploadFileRows([{ id: 'up-1', file: null, customName: '' }]);
            return;
        }
        setUploadFileRows((prev) => prev.filter((r) => r.id !== id));
    };

    const handleUploadFileChosen = (id: string, file: File | null) => {
        if (!file) return;
        setUploadFileRows((prev) =>
            prev.map((r) => {
                if (r.id !== id) return r;
                const lastDot = file.name.lastIndexOf('.');
                const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
                return {
                    ...r,
                    file,
                    customName: r.customName.trim() === '' ? baseName : r.customName,
                };
            })
        );
    };

    const handleUploadNameChange = (id: string, customName: string) => {
        setUploadFileRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, customName } : r))
        );
    };

    // Form for uploading new version
    const versionForm = useForm({
        version_number: '',
        changes_description: '',
        file: null as File | null,
    });

    const getStatusPill = (status: string) => {
        switch (status) {
            case 'published':
                return <StatusPill label="ใช้งานจริง" className="border-emerald-200 bg-emerald-50 text-emerald-700" />;
            case 'review':
                return <StatusPill label="รออนุมัติ" className="border-amber-200 bg-amber-50 text-amber-700" />;
            case 'draft':
                return <StatusPill label="ฉบับร่าง" className="border-slate-200 bg-slate-50 text-slate-600" />;
            default:
                return <StatusPill label={status} className="border-slate-200 bg-slate-50 text-slate-500" />;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return format(new Date(dateString), 'dd MMM yyyy', { locale: th });
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return '-';
        return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: th });
    };

    const getFileIcon = (iconType: string, ext?: string) => {
        switch (iconType) {
            case 'pdf':
                return <FileText className="h-6 w-6 text-rose-500" />;
            case 'word':
                return <FileText className="h-6 w-6 text-blue-500" />;
            case 'excel':
                return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
            case 'powerpoint':
                return <Presentation className="h-6 w-6 text-amber-500" />;
            case 'image':
                return <ImageIcon className="h-6 w-6 text-purple-500" />;
            case 'archive':
                return <FileArchive className="h-6 w-6 text-slate-500" />;
            default:
                return <File className="h-6 w-6 text-slate-400" />;
        }
    };

    const handleDownloadAll = () => {
        window.open(route('quality-docs.download-all', { qualityDoc: document.id }), '_blank');
    };

    const handleDownloadSingle = (attachmentId: number) => {
        window.open(
            route('quality-docs.attachments.download', {
                qualityDoc: document.id,
                attachment: attachmentId,
            }),
            '_blank'
        );
    };

    const handleDownloadLegacy = () => {
        window.open(route('quality-docs.download', { qualityDoc: document.id }), '_blank');
    };

    const handleUploadFilesSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validRows = uploadFileRows.filter((r) => r.file !== null);
        if (validRows.length === 0) return;

        validRows.forEach((r) => {
            if (r.customName.trim() === '' && r.file) {
                r.customName = r.file.name;
            }
        });

        const files = validRows.map((r) => r.file as File);
        const fileNames = validRows.map((r) => r.customName);

        router.post(
            route('quality-docs.attachments.upload', { qualityDoc: document.id }),
            {
                files,
                file_names: fileNames,
            },
            {
                onSuccess: () => {
                    setIsUploadOpen(false);
                    setUploadFileRows([{ id: 'up-1', file: null, customName: '' }]);
                },
            }
        );
    };

    const handleVersionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        versionForm.post(route('quality-docs.versions.upload', { qualityDoc: document.id }), {
            onSuccess: () => {
                setIsVersionOpen(false);
                versionForm.reset();
            },
        });
    };

    const handleDeleteAttachment = () => {
        if (!deletingAttachmentId) return;
        router.delete(
            route('quality-docs.attachments.delete', {
                qualityDoc: document.id,
                attachment: deletingAttachmentId,
            }),
            {
                onSuccess: () => setDeletingAttachmentId(null),
            }
        );
    };

    const handleSubmitForReview = () => {
        if (confirm('ยืนยันการส่งเอกสารเพื่อขออนุมัติ?')) {
            router.post(route('quality-docs.submit', { qualityDoc: document.id }));
        }
    };

    const handleApprove = () => {
        if (confirm('ยืนยันการอนุมัติเอกสารนี้?')) {
            router.post(route('quality-docs.approve', { qualityDoc: document.id }));
        }
    };

    const handleReject = () => {
        if (confirm('ยืนยันการตีกลับเอกสารนี้ให้แก้ไข?')) {
            router.post(route('quality-docs.reject', { qualityDoc: document.id }));
        }
    };

    const steps = [
        { id: 'draft', label: 'ฉบับร่าง', icon: File, active: true },
        { id: 'review', label: 'รออนุมัติ', icon: Clock, active: ['review', 'published'].includes(document.status) },
        { id: 'published', label: 'ใช้งานจริง', icon: CheckCircle, active: document.status === 'published' },
    ];

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
        { title: document.document_number, href: `/quality-docs/${document.id}` },
    ];

    const attachments = document.attachments || [];
    const hasAttachments = attachments.length > 0;
    const hasLegacyFile = !hasAttachments && !!document.file_path;
    const totalFileCount = hasAttachments ? attachments.length : (hasLegacyFile ? 1 : 0);
    const legacyUrl = document.file_path ? (document.file_path.startsWith('http') ? document.file_path : `/storage/${document.file_path.replace(/^\//, '')}`) : null;

    return (
        <QualityPage
            tone="blue"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · เอกสาร"
            title={document.title}
            subtitle={`เลขที่เอกสาร: ${document.document_number} · ฉบับที่: v${document.current_version || '1.0'}`}
            headTitle={`${document.document_number} - ${document.title}`}
            breadcrumbs={breadcrumbs}
            actions={
                <div className="flex items-center gap-2">
                    {getStatusPill(document.status)}
                    <span className="text-sm font-medium text-slate-500">
                        {document.department?.name || 'ไม่ระบุแผนก'}
                    </span>
                </div>
            }
            subNav={<DocsSubNav active="quality-docs.index" />}
        >
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {/* Status Tracker */}
                    <Panel title="สถานะเอกสาร" description="ขั้นตอนการอนุมัติและการประกาศใช้">
                        <div className="relative mb-6">
                            <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full -translate-y-1/2 transform bg-slate-200" />
                            <div className="flex justify-between">
                                {steps.map((step) => (
                                    <div key={step.id} className="flex flex-col items-center bg-white px-2">
                                        <div
                                            className={cn(
                                                'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                                                step.active
                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                    : 'border-slate-300 bg-white text-slate-400'
                                            )}
                                        >
                                            <step.icon className="h-5 w-5" />
                                        </div>
                                        <span
                                            className={cn(
                                                'mt-2 text-xs font-medium',
                                                step.active ? 'text-blue-600 font-semibold' : 'text-slate-500'
                                            )}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Panel>

                    {/* Files & Attachments Section */}
                    <Panel
                        title={`ไฟล์เอกสารแนบ (${totalFileCount} ไฟล์)`}
                        description="ไฟล์นำเข้าฉบับจริงในระบบ สามารถดูหรือดาวน์โหลดได้ตามสิทธิ์"
                        action={
                            <div className="flex items-center gap-2">
                                {attachments.length > 1 && (
                                    <Button
                                        onClick={handleDownloadAll}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-xl border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100"
                                    >
                                        <Archive className="mr-1.5 h-3.5 w-3.5" /> ดาวน์โหลดทั้งหมด (ZIP)
                                    </Button>
                                )}
                                {can.edit && (
                                    <Button
                                        onClick={() => setIsUploadOpen(true)}
                                        size="sm"
                                        className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> เพิ่มไฟล์แนบ
                                    </Button>
                                )}
                            </div>
                        }
                    >
                        {hasAttachments ? (
                            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                {attachments.map((att) => (
                                    <div
                                        key={att.id}
                                        className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="shrink-0 rounded-xl bg-slate-50 p-2 border border-slate-100">
                                                {getFileIcon(att.icon_type, att.file_extension)}
                                            </div>
                                            <div className="truncate">
                                                <p className="truncate text-sm font-semibold text-slate-900" title={att.file_name}>
                                                    {att.file_name}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    {att.original_name && att.original_name !== att.file_name && (
                                                        <span className="text-slate-500">
                                                            ต้นฉบับ: <span className="font-mono">{att.original_name}</span> ·
                                                        </span>
                                                    )}
                                                    <span className="font-mono uppercase font-semibold text-slate-500">
                                                        {att.file_extension}
                                                    </span>
                                                    <span>·</span>
                                                    <span>{att.formatted_size}</span>
                                                    {att.uploader && (
                                                        <>
                                                            <span>·</span>
                                                            <span>โดย {att.uploader.name}</span>
                                                        </>
                                                    )}
                                                    <span>·</span>
                                                    <span>{formatDateTime(att.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0">
                                            <Button
                                                onClick={() => handleOpenPreview({
                                                    url: att.url,
                                                    fileName: att.original_name || att.file_name,
                                                    fileExtension: att.file_extension,
                                                    fileSize: att.formatted_size,
                                                    iconType: att.icon_type,
                                                    downloadUrl: route('quality-docs.attachments.download', { qualityDoc: document.id, attachment: att.id }),
                                                })}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                                                title="แสดงตัวอย่างไฟล์"
                                            >
                                                <Eye className="mr-1.5 h-3.5 w-3.5" /> แสดงตัวอย่าง
                                            </Button>

                                            <Button
                                                onClick={() => handleDownloadSingle(att.id)}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-lg text-slate-700 hover:bg-slate-100"
                                            >
                                                <Download className="mr-1.5 h-3.5 w-3.5" /> ดาวน์โหลด
                                            </Button>

                                            {can.edit && attachments.length > 1 && (
                                                <Button
                                                    onClick={() => setDeletingAttachmentId(att.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                    title="ลบไฟล์นี้"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : hasLegacyFile ? (
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {document.document_number} (ไฟล์ตั้งต้น)
                                        </p>
                                        <p className="text-xs text-slate-400">ไฟล์เอกสารเวอร์ชันเดิมในระบบ</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {legacyUrl && (
                                        <Button
                                            onClick={() => handleOpenPreview({
                                                url: legacyUrl,
                                                fileName: `${document.document_number}_ไฟล์ตั้งต้น`,
                                                fileExtension: document.file_path.split('.').pop() || '',
                                                downloadUrl: route('quality-docs.download', { qualityDoc: document.id }),
                                            })}
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                                        >
                                            <Eye className="mr-1.5 h-3.5 w-3.5" /> แสดงตัวอย่าง
                                        </Button>
                                    )}
                                    <Button onClick={handleDownloadLegacy} variant="outline" size="sm" className="rounded-xl">
                                        <Download className="mr-2 h-4 w-4" /> ดาวน์โหลด
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                                ไม่มีไฟล์แนบในเอกสารนี้
                            </div>
                        )}
                    </Panel>

                    {/* Description Panel */}
                    <Panel title="รายละเอียด / คำอธิบาย">
                        <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700">
                            {document.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                        </div>
                    </Panel>

                    {/* Document Meta Info */}
                    <Panel title="ข้อมูลเอกสาร">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">หมวดหมู่มาตรฐาน</h3>
                                    <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                        {document.category}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">ประเภทเอกสาร</h3>
                                    <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                        {document.document_type}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">เจ้าของเอกสาร</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                                            {document.owner?.name?.charAt(0) || 'U'}
                                        </div>
                                        <p className="font-medium text-slate-800">{document.owner?.name || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">แก้ไขล่าสุด</h3>
                                    <p className="font-medium text-slate-800">{formatDate(document.updated_at)}</p>
                                </div>
                            </div>
                        </div>
                    </Panel>

                    {/* Versions History */}
                    {document.versions && document.versions.length > 0 && (
                        <Panel
                            title="ประวัติการปรับปรุงเวอร์ชัน"
                            description="รายการเวอร์ชันเอกสารที่มีการอัปโหลด"
                            action={
                                can.edit ? (
                                    <Button
                                        onClick={() => setIsVersionOpen(true)}
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        <History className="mr-1.5 h-3.5 w-3.5" /> อัปโหลดเวอร์ชันใหม่
                                    </Button>
                                ) : undefined
                            }
                        >
                            <div className="space-y-3">
                                {document.versions.map((v) => (
                                    <div
                                        key={v.id}
                                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-bold text-white font-mono">
                                                    v{v.version_number}
                                                </span>
                                                <span className="text-xs text-slate-500">{formatDateTime(v.created_at)}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600">
                                                {v.changes_description || 'ไม่มีบันทึกการเปลี่ยนแปลง'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                onClick={() => handleOpenPreview({
                                                    url: (v as any).url || `/storage/${v.file_path.replace(/^\//, '')}`,
                                                    fileName: `${document.document_number}_v${v.version_number}`,
                                                    fileExtension: (v as any).file_extension || v.file_path.split('.').pop(),
                                                    downloadUrl: route('quality-docs.versions.download', { qualityDoc: document.id, version: v.id }),
                                                })}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs text-blue-600 hover:bg-blue-50 font-medium"
                                            >
                                                <Eye className="mr-1 h-3.5 w-3.5" /> ดูตัวอย่าง
                                            </Button>
                                            <Button
                                                onClick={() => window.open(route('quality-docs.versions.download', { qualityDoc: document.id, version: v.id }), '_blank')}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs text-slate-600 hover:bg-slate-100"
                                            >
                                                <Download className="mr-1 h-3.5 w-3.5" /> ดาวน์โหลด
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    )}
                </div>

                {/* Right Side Actions & Schedule */}
                <div className="space-y-6">
                    <Panel title="การจัดการเอกสาร">
                        <div className="space-y-3">
                            {(attachments.length > 0 || hasLegacyFile) && (
                                <Button
                                    onClick={() => {
                                        if (attachments.length > 0) {
                                            const first = attachments[0];
                                            handleOpenPreview({
                                                url: first.url,
                                                fileName: first.original_name || first.file_name,
                                                fileExtension: first.file_extension,
                                                fileSize: first.formatted_size,
                                                iconType: first.icon_type,
                                                downloadUrl: route('quality-docs.attachments.download', { qualityDoc: document.id, attachment: first.id }),
                                            });
                                        } else if (hasLegacyFile && legacyUrl) {
                                            handleOpenPreview({
                                                url: legacyUrl,
                                                fileName: `${document.document_number}_ไฟล์ตั้งต้น`,
                                                fileExtension: document.file_path.split('.').pop() || '',
                                                downloadUrl: route('quality-docs.download', { qualityDoc: document.id }),
                                            });
                                        }
                                    }}
                                    variant="outline"
                                    className="w-full justify-start rounded-xl py-2.5 text-blue-700 bg-blue-50/60 hover:bg-blue-100/80 border-blue-200 font-medium"
                                >
                                    <Eye className="mr-2 h-4 w-4 text-blue-600" />
                                    แสดงตัวอย่างเอกสาร {attachments.length > 1 ? `(${attachments[0].original_name || attachments[0].file_name})` : ''}
                                </Button>
                            )}

                            <Button
                                onClick={handleDownloadAll}
                                variant="outline"
                                className="w-full justify-start rounded-xl py-2.5"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                ดาวน์โหลดเอกสารทั้งหมด {attachments.length > 1 ? '(ZIP)' : ''}
                            </Button>

                            {can.edit && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full justify-start rounded-xl py-2.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                    <Link href={route('quality-docs.edit', { qualityDoc: document.id })}>
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        แก้ไขข้อมูลเอกสาร
                                    </Link>
                                </Button>
                            )}

                            {can.edit && document.status === 'draft' && (
                                <div className="border-t border-slate-100 pt-3">
                                    <Button
                                        onClick={handleSubmitForReview}
                                        className="w-full justify-start rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5"
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        ส่งขออนุมัติเอกสาร
                                    </Button>
                                </div>
                            )}

                            {can.approve && document.status === 'review' && (
                                <div className="space-y-2 border-t border-slate-100 pt-3">
                                    <Button
                                        onClick={handleApprove}
                                        className="w-full justify-start rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        อนุมัติเอกสาร
                                    </Button>
                                    <Button
                                        onClick={handleReject}
                                        variant="destructive"
                                        className="w-full justify-start rounded-xl py-2.5"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        ตีกลับ / สั่งแก้ไข
                                    </Button>
                                </div>
                            )}

                            {can.delete && (
                                <div className="border-t border-slate-100 pt-3">
                                    <Button
                                        onClick={() => setIsDeleteDocOpen(true)}
                                        variant="ghost"
                                        className="w-full justify-start rounded-xl py-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        ลบเอกสารนี้
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Panel>

                    <Panel title="กำหนดการ">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-600">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-400">วันที่บังคับใช้</p>
                                    <p className="font-semibold text-slate-800">{formatDate(document.effective_date)}</p>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-xl bg-amber-50 p-2 text-amber-600">
                                        <AlertCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400">วันครบกำหนดทบทวน</p>
                                        <p className="font-semibold text-slate-800">{formatDate(document.review_date)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>

            {/* Upload Attachments Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="max-w-xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>เพิ่มไฟล์แนบในเอกสาร</DialogTitle>
                        <DialogDescription>
                            เลือกไฟล์และกำหนดชื่อไฟล์ที่ต้องการให้แสดงในระบบสำหรับเอกสาร &quot;{document.document_number}&quot;
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUploadFilesSubmit} className="space-y-4">
                        <div className="max-h-[350px] space-y-3 overflow-y-auto pr-1">
                            {uploadFileRows.map((row, idx) => {
                                const inputId = `upload-dialog-file-${row.id}`;
                                return (
                                    <div
                                        key={row.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                                    >
                                        <div className="mb-2 flex items-center justify-between border-b border-slate-200/50 pb-1">
                                            <span className="text-xs font-semibold text-slate-600">
                                                ไฟล์ที่ {idx + 1}
                                            </span>
                                            {uploadFileRows.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveUploadRow(row.id)}
                                                    className="text-xs text-rose-500 hover:text-rose-700"
                                                >
                                                    ลบแถว
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                                            <div className="sm:col-span-5">
                                                <input
                                                    id={inputId}
                                                    type="file"
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.zip,.rar,.7z,.txt,.csv,.rtf"
                                                    onChange={(e) => {
                                                        const f = e.target.files ? e.target.files[0] : null;
                                                        handleUploadFileChosen(row.id, f);
                                                    }}
                                                    className="hidden"
                                                />
                                                {row.file ? (
                                                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-2">
                                                        <span className="truncate text-xs font-medium text-blue-900" title={row.file.name}>
                                                            {row.file.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => window.document.getElementById(inputId)?.click()}
                                                            className="ml-1 text-[11px] text-blue-700 underline"
                                                        >
                                                            เปลี่ยน
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => window.document.getElementById(inputId)?.click()}
                                                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white p-2 text-xs font-medium text-slate-700 hover:border-blue-400"
                                                    >
                                                        <Upload className="h-3.5 w-3.5 text-blue-600" />
                                                        เลือกไฟล์
                                                    </button>
                                                )}
                                            </div>

                                            <div className="sm:col-span-7">
                                                <Input
                                                    value={row.customName}
                                                    onChange={(e) => handleUploadNameChange(row.id, e.target.value)}
                                                    placeholder="ตั้งชื่อไฟล์ เช่น คู่มือ, ภาคผนวก"
                                                    className="h-9 rounded-lg bg-white text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={handleAddUploadRow}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/30 p-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                + เพิ่มไฟล์และตั้งชื่ออีกไฟล์
                            </button>
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)} className="rounded-xl">
                                ยกเลิก
                            </Button>
                            <Button
                                type="submit"
                                disabled={uploadFileRows.filter((r) => r.file !== null).length === 0}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700"
                            >
                                บันทึกไฟล์แนบ
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* New Version Dialog */}
            <Dialog open={isVersionOpen} onOpenChange={setIsVersionOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>อัปโหลดเวอร์ชันใหม่</DialogTitle>
                        <DialogDescription>
                            ระบุเลขเวอร์ชันใหม่และไฟล์เอกสารที่มีการปรับปรุง
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleVersionSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-700">เลขเวอร์ชันใหม่ *</label>
                            <input
                                type="text"
                                placeholder="เช่น 1.1 หรือ 2.0"
                                value={versionForm.data.version_number}
                                onChange={(e) => versionForm.setData('version_number', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700">บันทึกรายละเอียดการเปลี่ยนแปลง</label>
                            <textarea
                                placeholder="ระบุสิ่งที่แก้ไขในเวอร์ชันนี้..."
                                value={versionForm.data.changes_description}
                                onChange={(e) => versionForm.setData('changes_description', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm min-h-[80px]"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700">ไฟล์เอกสารเวอร์ชันใหม่ *</label>
                            <input
                                type="file"
                                onChange={(e) => versionForm.setData('file', e.target.files ? e.target.files[0] : null)}
                                className="mt-1 w-full text-sm"
                                required
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsVersionOpen(false)} className="rounded-xl">
                                ยกเลิก
                            </Button>
                            <Button
                                type="submit"
                                disabled={versionForm.processing}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700"
                            >
                                {versionForm.processing ? 'กำลังอัปโหลด...' : 'บันทึกเวอร์ชัน'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Attachment Dialog */}
            <Dialog open={!!deletingAttachmentId} onOpenChange={(open) => !open && setDeletingAttachmentId(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>ยืนยันการลบไฟล์แนบ</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์แนบนี้ออกจากเอกสารคุณภาพ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setDeletingAttachmentId(null)} className="rounded-xl">
                            ยกเลิก
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDeleteAttachment} className="rounded-xl">
                            ลบไฟล์แนบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Document Dialog */}
            <Dialog open={isDeleteDocOpen} onOpenChange={setIsDeleteDocOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <DialogTitle>ยืนยันการลบเอกสาร</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร &quot;{document.document_number} - {document.title}&quot; ออกจากคลังเอกสารคุณภาพ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsDeleteDocOpen(false)} className="rounded-xl">
                            ยกเลิก
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDeleteDocument} className="rounded-xl">
                            ยืนยันการลบเอกสาร
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* File Preview Modal */}
            <FilePreviewModal
                target={previewTarget}
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
            />
        </QualityPage>
    );
}
