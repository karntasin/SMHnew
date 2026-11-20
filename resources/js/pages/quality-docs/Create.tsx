import React, { useRef, useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
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
    Settings2,
    Presentation,
    Paperclip,
    Check
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

interface FileRow {
    id: string;
    file: File | null;
    customName: string;
}

interface Props {
    departments: Department[];
    teams: Team[];
    standards: Taxonomy[];
    documentTypes: Taxonomy[];
    canManageSettings: boolean;
}

export default function Create({ departments, teams, standards = [], documentTypes = [], canManageSettings }: Props) {
    const [fileRows, setFileRows] = useState<FileRow[]>([
        { id: 'row-1', file: null, customName: '' }
    ]);
    const [fileError, setFileError] = useState<string | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        document_number: '',
        category: '',
        document_type: '',
        department_id: '',
        owner_department: '',
        description: '',
        effective_date: '',
        review_date: '',
        files: [] as File[],
        file_names: [] as string[],
    });

    const handleAddRow = () => {
        setFileRows((prev) => [
            ...prev,
            { id: 'row-' + Date.now() + '-' + Math.random().toString(36).substring(7), file: null, customName: '' }
        ]);
    };

    const handleRemoveRow = (id: string) => {
        if (fileRows.length === 1) {
            // Reset the only row instead of deleting it
            setFileRows([{ id: 'row-1', file: null, customName: '' }]);
            return;
        }
        setFileRows((prev) => prev.filter((r) => r.id !== id));
    };

    const handleFileChosen = (id: string, file: File | null) => {
        setFileError(null);
        if (!file) return;

        setFileRows((prev) =>
            prev.map((r) => {
                if (r.id !== id) return r;

                // Extract basename without extension for autofill
                const lastDot = file.name.lastIndexOf('.');
                const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;

                return {
                    ...r,
                    file,
                    // If customName is currently empty, autofill with baseName
                    customName: r.customName.trim() === '' ? baseName : r.customName,
                };
            })
        );
    };

    const handleNameChange = (id: string, customName: string) => {
        setFileRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, customName } : r))
        );
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
                return <FileText className="h-6 w-6 text-rose-500" />;
            case 'doc':
            case 'docx':
            case 'rtf':
                return <FileText className="h-6 w-6 text-blue-500" />;
            case 'xls':
            case 'xlsx':
            case 'csv':
                return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
            case 'ppt':
            case 'pptx':
                return <Presentation className="h-6 w-6 text-amber-500" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'gif':
                return <Image className="h-6 w-6 text-purple-500" />;
            case 'zip':
            case 'rar':
            case '7z':
                return <FileArchive className="h-6 w-6 text-slate-500" />;
            default:
                return <File className="h-6 w-6 text-slate-400" />;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validRows = fileRows.filter((r) => r.file !== null);
        if (validRows.length === 0) {
            setFileError('กรุณาเลือกไฟล์เอกสารอย่างน้อย 1 ไฟล์');
            return;
        }

        // Check if any valid row has empty custom name
        const emptyNameRow = validRows.find((r) => r.customName.trim() === '');
        if (emptyNameRow && emptyNameRow.file) {
            // Fill with original name if empty
            emptyNameRow.customName = emptyNameRow.file.name;
        }

        const files = validRows.map((r) => r.file as File);
        const fileNames = validRows.map((r) => r.customName);

        // Submit form with both files and file_names
        data.files = files;
        data.file_names = fileNames;

        post(route('quality-docs.store'));
    };

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
        { title: 'สร้างเอกสารใหม่', href: '/quality-docs/create' },
    ];

    const validFilesCount = fileRows.filter((r) => r.file !== null).length;
    const totalSize = fileRows
        .filter((r) => r.file !== null)
        .reduce((acc, r) => acc + (r.file?.size || 0), 0);

    return (
        <QualityPage
            tone="blue"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · เอกสาร"
            title="สร้างเอกสารคุณภาพใหม่"
            subtitle="กรอกข้อมูลเอกสารและนำเข้าไฟล์พร้อมกำหนดชื่อเรียกของแต่ละไฟล์"
            breadcrumbs={breadcrumbs}
            subNav={<DocsSubNav active="quality-docs.create" />}
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
                                            placeholder="เช่น WI-NUR-001 หรือ POL-HA-02"
                                            className={cn('rounded-xl uppercase font-mono', errors.document_number && 'border-rose-500')}
                                        />
                                        <p className="text-[11px] text-slate-500">
                                            * หากมีเอกสารเดิมที่ถูกลบไปแล้ว สามารถนำรหัสดังกล่าวมาสร้างใหม่ได้
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
                                        <Select onValueChange={(val) => setData('owner_department', val)}>
                                            <SelectTrigger className={cn('rounded-xl', errors.owner_department && 'border-rose-500')}>
                                                <SelectValue placeholder="เลือกทีมนำ/ทีม HA (ถ้ามี)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teams.map((team) => (
                                                    <SelectItem key={team.abbreviation} value={team.abbreviation}>
                                                        {team.abbreviation} - {team.name_th}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </div>

                                <Field label="ชื่อเอกสาร" required error={errors.title}>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="ระบุชื่อเอกสารภาษาไทย หรือ ภาษาอังกฤษ"
                                        className={cn('rounded-xl', errors.title && 'border-rose-500')}
                                    />
                                </Field>

                                <Field label="รายละเอียด / คำอธิบายเพิ่มเติม">
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="อธิบายวัตถุประสงค์ ขอบเขต หรือข้อกำหนดโดยย่อของเอกสารนี้..."
                                        className="min-h-[100px] rounded-xl text-sm"
                                    />
                                </Field>
                            </div>
                        </Panel>

                        {/* File Rows with Custom Naming and Dynamic Add */}
                        <Panel
                            title="ไฟล์เอกสารนำเข้าและกำหนดชื่อไฟล์"
                            description="กำหนดชื่อไฟล์ที่ต้องการให้แสดงในระบบ และกดปุ่ม '+ เพิ่มไฟล์' หากมีหลายไฟล์"
                            action={
                                validFilesCount > 0 ? (
                                    <span className="text-xs font-semibold text-slate-500">
                                        เลือกแล้ว {validFilesCount} ไฟล์ ({formatFileSize(totalSize)})
                                    </span>
                                ) : undefined
                            }
                        >
                            <div className="space-y-4">
                                {fileRows.map((row, index) => {
                                    const inputId = `file-input-${row.id}`;
                                    return (
                                        <div
                                            key={row.id}
                                            className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            <div className="mb-3 flex items-center justify-between border-b border-slate-200/60 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                        ไฟล์รายการที่ {index + 1}
                                                    </span>
                                                </div>

                                                {fileRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRow(row.id)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                                                        title="ลบแถวไฟล์นี้"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" /> ลบรายการ
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
                                                {/* File Picker Box */}
                                                <div className="md:col-span-5">
                                                    <input
                                                        id={inputId}
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.zip,.rar,.7z,.txt,.csv,.rtf"
                                                        onChange={(e) => {
                                                            const f = e.target.files ? e.target.files[0] : null;
                                                            handleFileChosen(row.id, f);
                                                        }}
                                                        className="hidden"
                                                    />

                                                    {row.file ? (
                                                        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="shrink-0 rounded-lg bg-white p-1.5 shadow-xs">
                                                                    {getFileIcon(row.file.name)}
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="truncate text-xs font-semibold text-blue-950" title={row.file.name}>
                                                                        {row.file.name}
                                                                    </p>
                                                                    <p className="text-[11px] text-blue-600">
                                                                        {formatFileSize(row.file.size)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => window.document.getElementById(inputId)?.click()}
                                                                className="shrink-0 text-xs font-medium text-blue-700 underline hover:text-blue-900 ml-2"
                                                            >
                                                                เปลี่ยน
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => window.document.getElementById(inputId)?.click()}
                                                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-3.5 text-center text-xs font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50/30"
                                                        >
                                                            <Upload className="h-4 w-4 text-blue-600" />
                                                            คลิกเลือกไฟล์จากเครื่อง
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Custom File Name Input */}
                                                <div className="md:col-span-7">
                                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                                        ชื่อไฟล์ที่ต้องการให้แสดงในระบบ <span className="text-rose-500">*</span>
                                                    </label>
                                                    <Input
                                                        value={row.customName}
                                                        onChange={(e) => handleNameChange(row.id, e.target.value)}
                                                        placeholder="เช่น คู่มือการปฏิบัติงาน, แบบฟอร์มขออนุมัติ"
                                                        className="rounded-xl bg-white text-sm"
                                                    />
                                                    <p className="mt-1 text-[11px] text-slate-400">
                                                        {row.file
                                                            ? `นามสกุลไฟล์จริง: .${row.file.name.split('.').pop()} (ระบบจะต่อท้ายให้อัตโนมัติ)`
                                                            : 'ระบุชื่อเพื่อให้อ่านเข้าใจง่าย'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add More File Row Button */}
                                <button
                                    type="button"
                                    onClick={handleAddRow}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-3.5 text-center text-sm font-semibold text-blue-700 transition-all hover:border-blue-500 hover:bg-blue-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    กดบวกเพิ่มไฟล์และตั้งชื่ออีกไฟล์ (+ เพิ่มไฟล์)
                                </button>
                            </div>

                            {fileError && (
                                <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-500">
                                    <AlertCircle className="h-4 w-4" /> {fileError}
                                </p>
                            )}

                            {errors.files && (
                                <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-500">
                                    <AlertCircle className="h-4 w-4" /> {errors.files}
                                </p>
                            )}
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        <Panel
                            title="การจัดหมวดหมู่"
                            description="ประเภทและมาตรฐานคุณภาพ"
                            action={
                                canManageSettings ? (
                                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700">
                                        <Link href={route('quality-docs.settings')}>
                                            <Settings2 className="mr-1 h-3.5 w-3.5" /> ตั้งค่า
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        >
                            <div className="space-y-4">
                                <Field label="มาตรฐาน (Standard / Category)" required error={errors.category}>
                                    <Select onValueChange={(val) => setData('category', val)} value={data.category}>
                                        <SelectTrigger className={cn('rounded-xl', errors.category && 'border-rose-500')}>
                                            <SelectValue placeholder="เลือกมาตรฐานคุณภาพ" />
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

                                <Field label="ประเภทเอกสาร (Document Type)" required error={errors.document_type}>
                                    <Select onValueChange={(val) => setData('document_type', val)} value={data.document_type}>
                                        <SelectTrigger className={cn('rounded-xl', errors.document_type && 'border-rose-500')}>
                                            <SelectValue placeholder="เลือกประเภทเอกสาร" />
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

                        <Panel title="กำหนดการบังคับใช้" description="วันที่เริ่มใช้และทบทวน">
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

                        <Button
                            type="submit"
                            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 shadow-md shadow-blue-600/20"
                            disabled={processing}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? 'กำลังบันทึกเอกสาร...' : 'บันทึกเอกสารคุณภาพ'}
                        </Button>
                    </div>
                </div>
            </form>
        </QualityPage>
    );
}
