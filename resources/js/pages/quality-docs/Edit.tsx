import React, { useRef, useState } from 'react';
import { useForm, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Upload,
    Save,
    BookOpen,
    FileText,
    FileSpreadsheet,
    FileArchive,
    Image,
    File,
    Trash2,
    Plus,
    AlertCircle,
    Presentation,
    ArrowLeft,
    Download,
    ExternalLink
} from 'lucide-react';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import { QualityPage, Panel, Field } from '@/components/quality/quality-ui';
import DocsSubNav from '@/pages/quality-docs/DocsSubNav';

interface Department {
    id: number;
    name: string;
}

interface Team {
    abbreviation: string;
    name_th: string;
}

interface Taxonomy {
    id: number;
    type: 'standard' | 'document_type';
    code: string;
    name: string;
    color: string;
}

interface Attachment {
    id: number;
    file_name: string;
    original_name?: string;
    file_path: string;
    file_size: number;
    formatted_size: string;
    file_extension: string;
    icon_type: string;
    url?: string;
}

interface QualityDoc {
    id: number;
    title: string;
    document_number: string;
    category: string;
    document_type: string;
    department_id: number;
    owner_department: string | null;
    description: string | null;
    effective_date: string;
    review_date: string | null;
    status: string;
    attachments?: Attachment[];
}

interface FileRow {
    id: string;
    file: File | null;
    customName: string;
}

interface Props {
    document: QualityDoc;
    departments: Department[];
    teams: Team[];
    standards: Taxonomy[];
    documentTypes: Taxonomy[];
    canManageSettings: boolean;
}

export default function Edit({
    document,
    departments,
    teams,
    standards = [],
    documentTypes = [],
    canManageSettings
}: Props) {
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(document.attachments || []);
    const [newFileRows, setNewFileRows] = useState<FileRow[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        title: document.title || '',
        document_number: document.document_number || '',
        category: document.category || '',
        document_type: document.document_type || '',
        department_id: document.department_id ? document.department_id.toString() : '',
        owner_department: document.owner_department || '',
        description: document.description || '',
        effective_date: document.effective_date ? document.effective_date.substring(0, 10) : '',
        review_date: document.review_date ? document.review_date.substring(0, 10) : '',
        status: document.status || 'draft',
        files: [] as File[],
        file_names: [] as string[],
    });

    const handleAddNewRow = () => {
        setNewFileRows((prev) => [
            ...prev,
            { id: 'new-row-' + Date.now() + '-' + Math.random().toString(36).substring(7), file: null, customName: '' }
        ]);
    };

    const handleRemoveNewRow = (id: string) => {
        setNewFileRows((prev) => prev.filter((r) => r.id !== id));
    };

    const handleNewFileChosen = (id: string, file: File | null) => {
        if (!file) return;

        setNewFileRows((prev) =>
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

    const handleNewNameChange = (id: string, customName: string) => {
        setNewFileRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, customName } : r))
        );
    };

    const handleDeleteExistingAttachment = (attId: number, fileName: string) => {
        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ "${fileName}"?`)) {
            router.delete(
                route('quality-docs.attachments.delete', {
                    qualityDoc: document.id,
                    attachment: attId,
                }),
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setExistingAttachments((prev) => prev.filter((a) => a.id !== attId));
                    },
                }
            );
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes >= 1048576) {
            return (bytes / 1048576).toFixed(2) + ' MB';
        }
        if (bytes >= 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        }
        return bytes + ' B';
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf':
                return <FileText className="h-5 w-5 text-rose-500" />;
            case 'doc':
            case 'docx':
            case 'rtf':
                return <FileText className="h-5 w-5 text-blue-500" />;
            case 'xls':
            case 'xlsx':
            case 'csv':
                return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
            case 'ppt':
            case 'pptx':
                return <Presentation className="h-5 w-5 text-amber-500" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'gif':
                return <Image className="h-5 w-5 text-purple-500" />;
            case 'zip':
            case 'rar':
            case '7z':
                return <FileArchive className="h-5 w-5 text-slate-500" />;
            default:
                return <File className="h-5 w-5 text-slate-400" />;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validNewRows = newFileRows.filter((r) => r.file !== null);

        // Ensure custom names for valid new rows
        validNewRows.forEach((r) => {
            if (r.customName.trim() === '' && r.file) {
                r.customName = r.file.name;
            }
        });

        data.files = validNewRows.map((r) => r.file as File);
        data.file_names = validNewRows.map((r) => r.customName);

        post(route('quality-docs.update', { qualityDoc: document.id }));
    };

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
        { title: document.document_number, href: `/quality-docs/${document.id}` },
        { title: 'แก้ไขเอกสาร', href: `/quality-docs/${document.id}/edit` },
    ];

    return (
        <QualityPage
            tone="blue"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · แก้ไขเอกสาร"
            title={`แก้ไขเอกสาร: ${document.document_number}`}
            subtitle="แก้ไขข้อมูลรายละเอียด จัดการไฟล์เดิม และนำเข้าไฟล์ใหม่พร้อมกำหนดชื่อ"
            breadcrumbs={breadcrumbs}
            subNav={<DocsSubNav active="quality-docs.index" />}
            actions={
                <Button asChild variant="outline" className="rounded-xl">
                    <Link href={route('quality-docs.show', { qualityDoc: document.id })}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> ย้อนกลับ
                    </Link>
                </Button>
            }
        >
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Panel title="ข้อมูลทั่วไป" description="รายละเอียดหลักของเอกสารคุณภาพ">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="รหัสเอกสาร" required error={errors.document_number}>
                                        <Input
                                            id="document_number"
                                            value={data.document_number}
                                            onChange={(e) => setData('document_number', e.target.value)}
                                            placeholder="เช่น WI-NUR-001"
                                            className={cn('rounded-xl uppercase font-mono', errors.document_number && 'border-rose-500')}
                                        />
                                        <p className="text-[11px] text-slate-500">
                                            * หากมีเอกสารเดิมที่ถูกลบไปแล้ว สามารถนำรหัสดังกล่าวมาใช้ใหม่ได้
                                        </p>
                                    </Field>

                                    <Field label="แผนกเจ้าของเอกสาร" error={errors.department_id}>
                                        <Select
                                            value={data.department_id || 'none'}
                                            onValueChange={(val) => setData('department_id', val === 'none' ? '' : val)}
                                        >
                                            <SelectTrigger className={cn('rounded-xl', errors.department_id && 'border-rose-500')}>
                                                <SelectValue placeholder="เลือกแผนก (ไม่ระบุได้)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">-- ไม่ระบุแผนก --</SelectItem>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label="ทีมเจ้าของเอกสาร (HA Team)" error={errors.owner_department}>
                                        <Select
                                            value={data.owner_department || 'none'}
                                            onValueChange={(val) => setData('owner_department', val === 'none' ? '' : val)}
                                        >
                                            <SelectTrigger className={cn('rounded-xl', errors.owner_department && 'border-rose-500')}>
                                                <SelectValue placeholder="เลือกทีมนำ/ทีม HA (ถ้ามี)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                                                {teams.map((team) => (
                                                    <SelectItem key={team.abbreviation} value={team.abbreviation}>
                                                        {team.abbreviation} - {team.name_th}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label="สถานะเอกสาร">
                                        <Select
                                            value={data.status}
                                            onValueChange={(val) => setData('status', val)}
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">ฉบับร่าง (Draft)</SelectItem>
                                                <SelectItem value="review">รออนุมัติ (Review)</SelectItem>
                                                <SelectItem value="published">ใช้งานจริง (Published)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>

                                <Field label="ชื่อเอกสาร" required error={errors.title}>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="ระบุชื่อเอกสาร"
                                        className={cn('rounded-xl', errors.title && 'border-rose-500')}
                                    />
                                </Field>

                                <Field label="รายละเอียด / คำอธิบายเพิ่มเติม">
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="อธิบายวัตถุประสงค์ ขอบเขต หรือข้อกำหนดโดยย่อ..."
                                        className="min-h-[100px] rounded-xl text-sm"
                                    />
                                </Field>
                            </div>
                        </Panel>

                        {/* Existing Attachments Management */}
                        <Panel
                            title={`ไฟล์แนบเดิมในระบบ (${existingAttachments.length} ไฟล์)`}
                            description="ไฟล์เอกสารที่มีอยู่ในระบบ สามารถดาวน์โหลดดู หรือลบไฟล์ที่ไม่ต้องการออกได้"
                        >
                            {existingAttachments.length > 0 ? (
                                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                                    {existingAttachments.map((att) => (
                                        <div key={att.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="shrink-0">{getFileIcon(att.file_name)}</div>
                                                <div className="truncate">
                                                    <p className="truncate text-sm font-semibold text-slate-900" title={att.file_name}>
                                                        {att.file_name}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        {att.original_name && att.original_name !== att.file_name && (
                                                            <span>ต้นฉบับ: {att.original_name} · </span>
                                                        )}
                                                        <span>{att.formatted_size}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(route('quality-docs.attachments.download', { qualityDoc: document.id, attachment: att.id }), '_blank')}
                                                    className="h-8 text-xs text-slate-600 hover:text-blue-600"
                                                >
                                                    <Download className="mr-1 h-3.5 w-3.5" /> ดาวน์โหลด
                                                </Button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteExistingAttachment(att.id, att.file_name)}
                                                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                                                    title="ลบไฟล์แนบนี้ออกจากเอกสาร"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> ลบไฟล์
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                                    ยังไม่มีไฟล์แนบในเอกสารนี้
                                </p>
                            )}
                        </Panel>

                        {/* Add New Files with Custom Names */}
                        <Panel
                            title="นำเข้าไฟล์ใหม่เพิ่มเติม"
                            description="กดปุ่ม '+ เพิ่มไฟล์' เพื่อเลือกไฟล์และกำหนดชื่อไฟล์ที่ต้องการให้แสดงในระบบ"
                        >
                            <div className="space-y-4">
                                {newFileRows.map((row, index) => {
                                    const inputId = `new-file-input-${row.id}`;
                                    return (
                                        <div
                                            key={row.id}
                                            className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            <div className="mb-3 flex items-center justify-between border-b border-slate-200/60 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                                                        +{index + 1}
                                                    </span>
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                        ไฟล์ใหม่รายการที่ {index + 1}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveNewRow(row.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> ลบแถว
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
                                                <div className="md:col-span-5">
                                                    <input
                                                        id={inputId}
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.zip,.rar,.7z,.txt,.csv,.rtf"
                                                        onChange={(e) => {
                                                            const f = e.target.files ? e.target.files[0] : null;
                                                            handleNewFileChosen(row.id, f);
                                                        }}
                                                        className="hidden"
                                                    />

                                                    {row.file ? (
                                                        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="shrink-0 rounded-lg bg-white p-1.5 shadow-xs">
                                                                    {getFileIcon(row.file.name)}
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="truncate text-xs font-semibold text-emerald-950" title={row.file.name}>
                                                                        {row.file.name}
                                                                    </p>
                                                                    <p className="text-[11px] text-emerald-700">
                                                                        {formatFileSize(row.file.size)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => window.document.getElementById(inputId)?.click()}
                                                                className="shrink-0 text-xs font-medium text-emerald-700 underline hover:text-emerald-900 ml-2"
                                                            >
                                                                เปลี่ยน
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => window.document.getElementById(inputId)?.click()}
                                                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-3.5 text-center text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50/30"
                                                        >
                                                            <Upload className="h-4 w-4 text-emerald-600" />
                                                            คลิกเลือกไฟล์ใหม่จากเครื่อง
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="md:col-span-7">
                                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                                        ชื่อไฟล์ที่ต้องการให้แสดงในระบบ
                                                    </label>
                                                    <Input
                                                        value={row.customName}
                                                        onChange={(e) => handleNewNameChange(row.id, e.target.value)}
                                                        placeholder="เช่น คู่มือฉบับปรับปรุง, ภาคผนวกเพิ่มเติม"
                                                        className="rounded-xl bg-white text-sm"
                                                    />
                                                    <p className="mt-1 text-[11px] text-slate-400">
                                                        {row.file
                                                            ? `นามสกุลไฟล์จริง: .${row.file.name.split('.').pop()} (ระบบจะต่อท้ายให้อัตโนมัติ)`
                                                            : 'ระบุชื่อเพื่อให้สืบค้นได้ง่าย'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={handleAddNewRow}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-3.5 text-center text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-500 hover:bg-emerald-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    กดบวกเพิ่มไฟล์และตั้งชื่ออีกไฟล์ (+ เพิ่มไฟล์)
                                </button>
                            </div>
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        <Panel
                            title="การจัดหมวดหมู่"
                            description="ประเภทและมาตรฐานคุณภาพ"
                        >
                            <div className="space-y-4">
                                <Field label="มาตรฐาน (Category)" required error={errors.category}>
                                    <Select onValueChange={(val) => setData('category', val)} value={data.category}>
                                        <SelectTrigger className={cn('rounded-xl', errors.category && 'border-rose-500')}>
                                            <SelectValue placeholder="เลือกมาตรฐาน" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {standards.map((st) => (
                                                <SelectItem key={st.code} value={st.code}>
                                                    {st.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="ประเภทเอกสาร" required error={errors.document_type}>
                                    <Select onValueChange={(val) => setData('document_type', val)} value={data.document_type}>
                                        <SelectTrigger className={cn('rounded-xl', errors.document_type && 'border-rose-500')}>
                                            <SelectValue placeholder="เลือกประเภท" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {documentTypes.map((dt) => (
                                                <SelectItem key={dt.code} value={dt.code}>
                                                    {dt.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                        </Panel>

                        <Panel title="กำหนดการบังคับใช้">
                            <div className="space-y-4">
                                <Field label="วันที่เริ่มบังคับใช้" required error={errors.effective_date}>
                                    <ThaiDatePicker
                                        value={data.effective_date}
                                        onChange={(value) => setData('effective_date', value)}
                                        placeholder="เลือกวันที่บังคับใช้"
                                    />
                                </Field>

                                <Field label="วันที่ครบกำหนดทบทวน" error={errors.review_date}>
                                    <ThaiDatePicker
                                        value={data.review_date}
                                        onChange={(value) => setData('review_date', value)}
                                        placeholder="เลือกวันที่ทบทวน (ถ้ามี)"
                                    />
                                </Field>
                            </div>
                        </Panel>

                        <div className="space-y-3">
                            <Button
                                type="submit"
                                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 shadow-md shadow-blue-600/20"
                                disabled={processing}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {processing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขเอกสาร'}
                            </Button>

                            <Button
                                asChild
                                type="button"
                                variant="outline"
                                className="w-full rounded-xl"
                            >
                                <Link href={route('quality-docs.show', { qualityDoc: document.id })}>
                                    ยกเลิกการแก้ไข
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </QualityPage>
    );
}
