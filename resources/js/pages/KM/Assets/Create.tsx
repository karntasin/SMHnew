import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Upload, FileText } from 'lucide-react';
import { QualityPage, Panel, Field } from '@/components/quality/quality-ui';
import KmSubNav from '@/pages/KM/KmSubNav';

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'KM', href: route('km.dashboard') },
    { title: 'คลังความรู้', href: route('km.assets.index') },
    { title: 'อัปโหลด', href: route('km.assets.create') },
];

export default function KmAssetsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        category: '',
        tags: '',
        file: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('km.assets.store'));
    };

    return (
        <QualityPage
            tone="amber"
            icon={Upload}
            badge="ศูนย์พัฒนาคุณภาพ · KM"
            title="อัปโหลดเอกสารใหม่"
            subtitle="แบ่งปันความรู้สู่องค์กร"
            breadcrumbs={breadcrumbs}
            headTitle="Upload Document"
            subNav={<KmSubNav active="km.assets.create" />}
        >
            <Panel title="ข้อมูลเอกสาร" description="กรอกรายละเอียดและแนบไฟล์">
                <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
                    <Field label="ชื่อเอกสาร" required error={errors.title}>
                        <Input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="เช่น คู่มือการใช้งานระบบ..."
                            className="rounded-xl"
                        />
                    </Field>

                    <Field label="หมวดหมู่" required error={errors.category}>
                        <Select onValueChange={(val) => setData('category', val)}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="เลือกหมวดหมู่" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manual">คู่มือ (Manual)</SelectItem>
                                <SelectItem value="Procedure">ระเบียบปฏิบัติ (Procedure)</SelectItem>
                                <SelectItem value="Research">งานวิจัย (Research)</SelectItem>
                                <SelectItem value="Form">แบบฟอร์ม (Form)</SelectItem>
                                <SelectItem value="Other">อื่นๆ</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label="รายละเอียด">
                        <Textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับเอกสาร..."
                            rows={4}
                            className="rounded-xl"
                        />
                    </Field>

                    <Field label="ไฟล์เอกสาร" required error={errors.file}>
                        <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center transition hover:bg-slate-50/50">
                            <Input
                                type="file"
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={(e) => setData('file', e.target.files ? e.target.files[0] : null)}
                            />
                            <Upload className="mb-2 h-8 w-8 text-slate-400" />
                            {data.file ? (
                                <div className="flex items-center gap-2 font-medium text-amber-700">
                                    <FileText className="h-4 w-4" />
                                    {data.file.name}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500">
                                    <span className="font-semibold text-amber-600">คลิกเพื่อเลือกไฟล์</span>{' '}
                                    หรือลากไฟล์มาวางที่นี่
                                    <p className="mt-1 text-xs">รองรับ PDF, Word, Excel, PowerPoint (Max 10MB)</p>
                                </div>
                            )}
                        </div>
                    </Field>

                    <Field label="Tags (คั่นด้วยจุลภาค)">
                        <Input
                            value={data.tags}
                            onChange={(e) => setData('tags', e.target.value)}
                            placeholder="เช่น HR, Safety, ISO"
                            className="rounded-xl"
                        />
                    </Field>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="outline"
                            type="button"
                            className="rounded-xl"
                            onClick={() => window.history.back()}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-amber-600 hover:bg-amber-700"
                        >
                            อัปโหลด
                        </Button>
                    </div>
                </form>
            </Panel>
        </QualityPage>
    );
}
