import React from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, Upload } from 'lucide-react';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';

interface CreateProps {
    departments: { id: number; name: string }[];
}

export default function Create({ departments }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        document_number: '',
        document_date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        summary_for_director: '',
        origin_type: 'internal',
        sender_name: '',
        department_id: '',
        type: 'normal',
        file: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('documents.store'), { forceFormData: true });
    };

    return (
        <DocumentShell
            active="documents.create"
            title="รับหนังสือเข้า"
            breadcrumbs={documentBreadcrumbs([{ title: 'รับหนังสือเข้า', href: route('documents.create') }])}
        >
            <section className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl md:p-8">
                <h1 className="text-3xl font-bold">รับหนังสือเข้า</h1>
                <p className="mt-2 max-w-2xl text-sm text-indigo-100/90">
                    ขั้นตอนที่ 1 — ลงทะเบียนรับหนังสือและอัปโหลดไฟล์ต้นฉบับ จากนั้นนำเรียนผู้อำนวยการ → ส่งแผนก → รับและติดตามผล
                </p>
            </section>

            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-indigo-100/80 bg-white/90 p-6 shadow-xl shadow-indigo-900/5">
                <div className="space-y-3">
                    <Label>ประเภทที่มาของหนังสือ</Label>
                    <RadioGroup value={data.origin_type} onValueChange={(v) => setData('origin_type', v)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="internal" id="r1" />
                            <Label htmlFor="r1">หนังสือภายใน</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="external" id="r2" />
                            <Label htmlFor="r2">หนังสือภายนอก</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="document_number">เลขที่หนังสือ</Label>
                        <Input id="document_number" className="rounded-xl" value={data.document_number}
                            onChange={(e) => setData('document_number', e.target.value)} placeholder="เช่น ศธ 0400/1234" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="document_date">ลงวันที่ *</Label>
                        <Input id="document_date" className="rounded-xl" type="date" value={data.document_date}
                            onChange={(e) => setData('document_date', e.target.value)} required />
                    </div>
                </div>

                {data.origin_type === 'internal' ? (
                    <div className="space-y-2">
                        <Label>จากหน่วยงานต้นทาง *</Label>
                        <Select value={data.department_id || undefined} onValueChange={(v) => setData('department_id', v)}>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="เลือกหน่วยงานต้นเรื่อง" /></SelectTrigger>
                            <SelectContent>
                                {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.department_id && <p className="text-sm text-red-500">{errors.department_id}</p>}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="sender_name">จากหน่วยงานภายนอก *</Label>
                        <Input id="sender_name" className="rounded-xl" value={data.sender_name}
                            onChange={(e) => setData('sender_name', e.target.value)} placeholder="ระบุชื่อหน่วยงาน" />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="title">เรื่อง *</Label>
                    <Input id="title" className="rounded-xl" value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                    {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">รายละเอียด</Label>
                    <Textarea id="description" className="rounded-xl" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="summary_for_director">ข้อความสรุปสำหรับนำเรียน ผอ. (กรอกตอนนี้หรือภายหลัง)</Label>
                    <Textarea id="summary_for_director" className="rounded-xl" value={data.summary_for_director}
                        onChange={(e) => setData('summary_for_director', e.target.value)} rows={3}
                        placeholder="สรุปเนื้อหาและข้อเสนอเพื่อนำเรียนผู้อำนวยการ..." />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="file">ไฟล์หนังสือ * (PDF, DOC, JPG, PNG)</Label>
                    <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center transition hover:border-indigo-400">
                        <Upload className="mx-auto mb-2 h-8 w-8 text-indigo-400" />
                        <Input id="file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => setData('file', e.target.files?.[0] || null)} className="mx-auto max-w-xs rounded-xl" />
                        {data.file && <p className="mt-2 text-sm text-emerald-600">{data.file.name}</p>}
                    </div>
                    {errors.file && <p className="text-sm text-red-500">{errors.file}</p>}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button asChild variant="outline" type="button" className="rounded-xl">
                        <Link href={route('documents.index')}>ยกเลิก</Link>
                    </Button>
                    <Button type="submit" disabled={processing || !data.file} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                        <Save className="mr-2 h-4 w-4" /> ลงทะเบียนรับหนังสือ
                    </Button>
                </div>
            </form>
        </DocumentShell>
    );
}
