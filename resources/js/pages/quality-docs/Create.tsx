import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Save, BookOpen } from 'lucide-react';
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

interface Props {
    departments: Department[];
    teams: Team[];
}

export default function Create({ departments, teams }: Props) {
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
        file: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('quality-docs.store'));
    };

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
        { title: 'สร้างเอกสารใหม่', href: '/quality-docs/create' },
    ];

    return (
        <QualityPage
            tone="blue"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · เอกสาร"
            title="สร้างเอกสารคุณภาพใหม่"
            subtitle="กรอกข้อมูลเอกสารเพื่อนำเข้าสู่ระบบการจัดการคุณภาพ (HA/JCI)"
            breadcrumbs={breadcrumbs}
            subNav={<DocsSubNav active="quality-docs.create" />}
        >
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Panel title="ข้อมูลทั่วไป" description="รายละเอียดหลักของเอกสาร">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field label="รหัสเอกสาร" required error={errors.document_number}>
                                        <Input
                                            id="document_number"
                                            value={data.document_number}
                                            onChange={(e) => setData('document_number', e.target.value)}
                                            placeholder="เช่น WI-NUR-001"
                                            className={cn('rounded-xl', errors.document_number && 'border-rose-500')}
                                        />
                                    </Field>
                                    <Field label="แผนกเจ้าของเอกสาร" required error={errors.department_id}>
                                        <Select onValueChange={(val) => setData('department_id', val)}>
                                            <SelectTrigger className={cn('rounded-xl', errors.department_id && 'border-rose-500')}>
                                                <SelectValue placeholder="เลือกแผนก" />
                                            </SelectTrigger>
                                            <SelectContent>
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
                                                <SelectValue placeholder="เลือกทีม" />
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
                                        placeholder="อธิบายรายละเอียดโดยย่อของเอกสารนี้..."
                                        className="min-h-[100px] rounded-xl"
                                    />
                                </Field>
                            </div>
                        </Panel>

                        <Panel title="ไฟล์เอกสาร" description="อัปโหลดไฟล์เอกสารฉบับจริง (PDF เท่านั้น)">
                            <div className="relative cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center transition-colors hover:bg-slate-50">
                                <input
                                    type="file"
                                    id="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    onChange={(e) => setData('file', e.target.files ? e.target.files[0] : null)}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                />
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="rounded-full bg-slate-100 p-3">
                                        <Upload className="h-6 w-6 text-slate-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-700">
                                            {data.file ? data.file.name : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
                                        </p>
                                        <p className="text-xs text-slate-400">รองรับไฟล์ PDF, Word, Excel ขนาดไม่เกิน 10MB</p>
                                    </div>
                                </div>
                            </div>
                            {errors.file && <p className="mt-2 text-sm text-rose-500">{errors.file}</p>}
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        <Panel title="การจัดหมวดหมู่" description="ประเภทและมาตรฐาน">
                            <div className="space-y-4">
                                <Field label="มาตรฐาน (Category)" required error={errors.category}>
                                    <Select onValueChange={(val) => setData('category', val)}>
                                        <SelectTrigger className={cn('rounded-xl', errors.category && 'border-rose-500')}>
                                            <SelectValue placeholder="เลือกมาตรฐาน" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HA">HA (Hospital Accreditation)</SelectItem>
                                            <SelectItem value="JCI">JCI</SelectItem>
                                            <SelectItem value="ISO">ISO</SelectItem>
                                            <SelectItem value="General">ทั่วไป</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="ประเภทเอกสาร" required error={errors.document_type}>
                                    <Select onValueChange={(val) => setData('document_type', val)}>
                                        <SelectTrigger className={cn('rounded-xl', errors.document_type && 'border-rose-500')}>
                                            <SelectValue placeholder="เลือกประเภท" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Policy">นโยบาย (Policy)</SelectItem>
                                            <SelectItem value="Procedure">ระเบียบปฏิบัติ (Procedure)</SelectItem>
                                            <SelectItem value="Work Instruction">วิธีปฏิบัติงาน (WI)</SelectItem>
                                            <SelectItem value="Form">แบบฟอร์ม (Form)</SelectItem>
                                            <SelectItem value="Manual">คู่มือ (Manual)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                        </Panel>

                        <Panel title="วันที่บังคับใช้" description="กำหนดการใช้งานและทบทวน">
                            <div className="space-y-4">
                                <Field label="วันที่เริ่มบังคับใช้" required error={errors.effective_date}>
                                    <ThaiDatePicker
                                        value={data.effective_date}
                                        onChange={(value) => setData('effective_date', value)}
                                        placeholder="เลือกวันที่บังคับใช้"
                                    />
                                </Field>

                                <Field label="วันที่ครบกำหนดทบทวน" required error={errors.review_date}>
                                    <ThaiDatePicker
                                        value={data.review_date}
                                        onChange={(value) => setData('review_date', value)}
                                        placeholder="เลือกวันที่ทบทวน"
                                    />
                                </Field>
                            </div>
                        </Panel>

                        <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
                        </Button>
                    </div>
                </div>
            </form>
        </QualityPage>
    );
}
