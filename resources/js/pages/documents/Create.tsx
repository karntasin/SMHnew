import React, { useState, useEffect } from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VoiceTextInput, VoiceTextarea } from '@/components/voice';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
    Save, Upload, Sparkles, Loader2, Send, UserCheck, 
    AlertCircle, Flame, Building2, CheckCircle2, ArrowRight
} from 'lucide-react';
import DocumentShell from './DocumentShell';
import { documentBreadcrumbs } from './DocumentSubNav';
import axios from 'axios';

interface DepartmentItem {
    id: number;
    name: string;
}

interface UserItem {
    id: number;
    name: string;
    department_id?: number | null;
}

interface CreateProps {
    departments: DepartmentItem[];
    directors?: UserItem[];
    users?: UserItem[];
}

export default function Create({ departments = [], directors = [], users = [] }: CreateProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiInsight, setAiInsight] = useState<{
        suggested_action?: string;
        suggested_department_ids?: number[];
    } | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        document_number: '',
        document_date: new Date().toISOString().split('T')[0],
        due_date: '',
        title: '',
        description: '',
        summary_for_director: '',
        origin_type: 'internal',
        sender_name: '',
        department_id: '',
        type: 'normal',
        urgency: 'normal',
        next_action: 'save', // save, submit_boss, forward
        boss_id: directors.length > 0 ? String(directors[0].id) : '',
        department_ids: [] as string[],
        user_ids: [] as string[],
        forward_comment: '',
        file: null as File | null,
    });

    // ตรวจสอบว่าส่งค่าสรุปมาจากหน้า AiSummarizer หรือไม่
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const passedSummary = params.get('summary');
            if (passedSummary) {
                setData('summary_for_director', decodeURIComponent(passedSummary));
            }
        }
    }, []);

    // ให้ AI สแกน วิเคราะห์ และกรอกข้อมูลอัตโนมัติ
    const handleAiAnalyze = async () => {
        if (!data.file) {
            alert("กรุณาเลือกไฟล์เอกสาร (PDF หรือรูปภาพ) ก่อนให้ AI วิเคราะห์");
            return;
        }

        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append('file', data.file);

        try {
            const res = await axios.post(route('documents.summarizeAi'), formData);
            const extracted = res.data?.data;

            if (extracted) {
                if (extracted.title) setData('title', extracted.title);
                if (extracted.document_number) setData('document_number', extracted.document_number);
                if (extracted.document_date) setData('document_date', extracted.document_date);
                if (extracted.due_date) setData('due_date', extracted.due_date);
                if (extracted.sender_name) {
                    setData('sender_name', extracted.sender_name);
                    setData('origin_type', 'external');
                }
                if (extracted.summary) setData('summary_for_director', extracted.summary);
                if (extracted.urgency && ['normal', 'urgent', 'very_urgent', 'most_urgent'].includes(extracted.urgency)) {
                    setData('urgency', extracted.urgency);
                }

                if (extracted.suggested_department_ids && Array.isArray(extracted.suggested_department_ids)) {
                    const stringIds = extracted.suggested_department_ids.map((id: number) => String(id));
                    setData('department_ids', stringIds);
                }

                setAiInsight({
                    suggested_action: extracted.suggested_action,
                    suggested_department_ids: extracted.suggested_department_ids,
                });
            } else if (res.data?.summary) {
                setData('summary_for_director', res.data.summary);
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error 
                || error.response?.data?.message 
                || (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join('\n') : "เกิดข้อผิดพลาดในการวิเคราะห์เนื้อหาด้วย AI");
            alert(errorMsg);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleDepartment = (deptId: string) => {
        const current = data.department_ids;
        if (current.includes(deptId)) {
            setData('department_ids', current.filter(id => id !== deptId));
        } else {
            setData('department_ids', [...current, deptId]);
        }
    };

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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-medium mb-2 border border-indigo-400/20">
                            <Sparkles className="w-3.5 h-3.5" /> ระบบสารบรรณอัจฉริยะ (Smart Document Hub)
                        </div>
                        <h1 className="text-3xl font-bold">รับหนังสือเข้าสู่ระบบ</h1>
                        <p className="mt-2 max-w-2xl text-sm text-indigo-100/90 leading-relaxed">
                            อัปโหลดไฟล์หนังสือ ➔ ให้ AI สกัดข้อมูลและสรุปเนื้อหา ➔ เลือกนำเรียน ผอ. หรือส่งต่อแผนกได้ในขั้นตอนเดียว
                        </p>
                    </div>
                </div>
            </section>

            <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-indigo-100/80 bg-white/95 p-6 shadow-xl shadow-indigo-900/5 md:p-8 backdrop-blur">
                
                {/* 1. ส่วนอัปโหลดไฟล์ & AI OCR */}
                <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center transition hover:border-indigo-400">
                    <Upload className="mx-auto mb-2 h-10 w-10 text-indigo-500" />
                    <Label htmlFor="file" className="block text-base font-semibold text-slate-800 cursor-pointer">
                        เลือกไฟล์หนังสือต้นฉบับ * (PDF, JPG, PNG, DOCX)
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">ขนาดไฟล์สูงสุด 10MB</p>
                    
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Input 
                            id="file" 
                            type="file" 
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => setData('file', e.target.files?.[0] || null)} 
                            className="max-w-xs rounded-xl bg-white" 
                        />

                        {data.file && (
                            <Button
                                type="button"
                                onClick={handleAiAnalyze}
                                disabled={isAnalyzing}
                                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-indigo-500/20"
                            >
                                {isAnalyzing ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI กำลังอ่านและกรอกข้อมูล...</>
                                ) : (
                                    <><Sparkles className="mr-2 h-4 w-4" /> วิเคราะห์ & กรอกข้อมูลด้วย AI</>
                                )}
                            </Button>
                        )}
                    </div>

                    {data.file && (
                        <p className="mt-3 font-medium text-emerald-600 text-sm flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> ไฟล์ที่เลือก: {data.file.name}
                        </p>
                    )}
                    {errors.file && <p className="text-sm text-red-500 mt-2">{errors.file}</p>}
                </div>

                {/* กล่องคำแนะนำจาก AI หากมี */}
                {aiInsight?.suggested_action && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm flex items-start gap-3 text-indigo-950">
                        <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-semibold text-indigo-900">ข้อเสนอแนะจาก AI:</span> {aiInsight.suggested_action}
                        </div>
                    </div>
                )}

                {/* 2. ข้อมูลทั่วไปของหนังสือ */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                        1. รายละเอียดข้อมูลหนังสือ
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>ประเภทที่มาของหนังสือ</Label>
                            <RadioGroup value={data.origin_type} onValueChange={(v) => setData('origin_type', v)} className="flex gap-4 pt-1">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="internal" id="r1" />
                                    <Label htmlFor="r1" className="cursor-pointer">หนังสือภายใน (แผนกใน รพ.)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="external" id="r2" />
                                    <Label htmlFor="r2" className="cursor-pointer">หนังสือภายนอก</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label>ระดับความเร่งด่วน</Label>
                            <Select value={data.urgency} onValueChange={(v) => setData('urgency', v)}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="ระดับความเร่งด่วน" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">ปกติ</SelectItem>
                                    <SelectItem value="urgent" className="text-amber-600 font-medium">ด่วน</SelectItem>
                                    <SelectItem value="very_urgent" className="text-orange-600 font-medium">ด่วนมาก</SelectItem>
                                    <SelectItem value="most_urgent" className="text-red-600 font-bold">ด่วนที่สุด</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="document_number">เลขที่หนังสือ</Label>
                            <Input 
                                id="document_number" 
                                className="rounded-xl" 
                                value={data.document_number}
                                onChange={(e) => setData('document_number', e.target.value)} 
                                placeholder="เช่น ศธ 0400/1234" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="document_date">ลงวันที่ *</Label>
                            <Input 
                                id="document_date" 
                                className="rounded-xl" 
                                type="date" 
                                value={data.document_date}
                                onChange={(e) => setData('document_date', e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_date">กำหนดส่ง/ดำเนินการ (ถ้ามี)</Label>
                            <Input 
                                id="due_date" 
                                className="rounded-xl" 
                                type="date" 
                                value={data.due_date}
                                onChange={(e) => setData('due_date', e.target.value)} 
                            />
                        </div>
                    </div>

                    {data.origin_type === 'internal' ? (
                        <div className="space-y-2">
                            <Label>จากหน่วยงานต้นทาง (ภายใน) *</Label>
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
                            <VoiceTextInput 
                                id="sender_name" 
                                className="rounded-xl" 
                                value={data.sender_name}
                                onChange={(val) => setData('sender_name', val)} 
                                placeholder="ระบุชื่อหน่วยงานภายนอกต้นเรื่อง" 
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="title">เรื่อง *</Label>
                        <VoiceTextInput 
                            id="title" 
                            className="rounded-xl text-base font-medium" 
                            value={data.title} 
                            onChange={(val) => setData('title', val)} 
                            placeholder="ระบุชื่อเรื่องหนังสือ"
                            required 
                        />
                        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
                        <VoiceTextarea 
                            id="description" 
                            className="rounded-xl" 
                            value={data.description} 
                            onChange={(val) => setData('description', val)} 
                            rows={2} 
                            placeholder="รายละเอียดสาระสำคัญเพิ่มเติม..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="summary_for_director" className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Sparkles className="w-4 h-4 text-violet-600" /> 
                            สรุปสาระสำคัญสำหรับนำเรียน ผอ. (AI Summary)
                        </Label>
                        <VoiceTextarea 
                            id="summary_for_director" 
                            className="rounded-xl leading-relaxed bg-amber-50/30 border-amber-200" 
                            value={data.summary_for_director}
                            onChange={(val) => setData('summary_for_director', val)} 
                            rows={3}
                            placeholder="สรุปเนื้อหา 3-5 บรรทัด สำหรับนำเรียนผู้อำนวยการ..." 
                        />
                    </div>
                </div>

                {/* 3. ทางเลือกลำดับขั้นตอนถัดไป (Connected Next Action) */}
                <div className="space-y-5 rounded-2xl border border-indigo-100 bg-slate-50/80 p-5">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-indigo-600" />
                        2. เลือกขั้นตอนดำเนินการต่อทันทีหลังลงทะเบียน
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className={`cursor-pointer rounded-2xl border p-4 transition flex flex-col justify-between ${
                            data.next_action === 'save' 
                                ? 'border-indigo-600 bg-white shadow-md ring-2 ring-indigo-200' 
                                : 'border-slate-200 bg-white/70 hover:border-slate-300'
                        }`}>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="radio" 
                                    name="next_action" 
                                    value="save" 
                                    checked={data.next_action === 'save'}
                                    onChange={() => setData('next_action', 'save')}
                                    className="text-indigo-600"
                                />
                                <span className="font-bold text-slate-900">บันทึกรับเข้า</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ลงทะเบียนรับหนังสือเข้าระบบไว้ก่อน เพื่อตรวจสอบหรือส่งต่อในภายหลัง
                            </p>
                        </label>

                        <label className={`cursor-pointer rounded-2xl border p-4 transition flex flex-col justify-between ${
                            data.next_action === 'submit_boss' 
                                ? 'border-violet-600 bg-white shadow-md ring-2 ring-violet-200' 
                                : 'border-slate-200 bg-white/70 hover:border-slate-300'
                        }`}>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="radio" 
                                    name="next_action" 
                                    value="submit_boss" 
                                    checked={data.next_action === 'submit_boss'}
                                    onChange={() => setData('next_action', 'submit_boss')}
                                    className="text-violet-600"
                                />
                                <span className="font-bold text-violet-900">นำเรียน ผอ. ทันที</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ส่งตรงเข้ากล่องงานผู้อำนวยการเพื่อพิจารณา ลงนาม และเกษียนสั่งการ
                            </p>
                        </label>

                        <label className={`cursor-pointer rounded-2xl border p-4 transition flex flex-col justify-between ${
                            data.next_action === 'forward' 
                                ? 'border-sky-600 bg-white shadow-md ring-2 ring-sky-200' 
                                : 'border-slate-200 bg-white/70 hover:border-slate-300'
                        }`}>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="radio" 
                                    name="next_action" 
                                    value="forward" 
                                    checked={data.next_action === 'forward'}
                                    onChange={() => setData('next_action', 'forward')}
                                    className="text-sky-600"
                                />
                                <span className="font-bold text-sky-900">แจกจ่าย/ส่งต่อทันที</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ส่งตรงไปยังแผนกหรือบุคคลที่เกี่ยวข้องโดยไม่ต้องผ่าน ผอ. (เช่น หนังสือเวียน)
                            </p>
                        </label>
                    </div>

                    {/* ถ้าเลือกนำเรียน ผอ. ทันที */}
                    {data.next_action === 'submit_boss' && (
                        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                            <Label className="font-semibold text-violet-950">เลือกผู้อำนวยการ / ผู้มีอำนาจลงนาม *</Label>
                            <Select value={data.boss_id} onValueChange={(v) => setData('boss_id', v)}>
                                <SelectTrigger className="rounded-xl bg-white">
                                    <SelectValue placeholder="เลือกผู้อำนวยการ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {directors.map((d) => (
                                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* ถ้าเลือกแจกจ่าย/ส่งต่อทันที */}
                    {data.next_action === 'forward' && (
                        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold text-sky-950">เลือกแผนกปลายทางที่จะส่งต่อ</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setData('department_ids', departments.map(d => String(d.id)))}
                                    className="text-xs h-7 rounded-lg"
                                >
                                    เลือกทุกแผนก (เวียนทราบ)
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-xl border border-sky-100">
                                {departments.map((dept) => {
                                    const isChecked = data.department_ids.includes(String(dept.id));
                                    return (
                                        <label key={dept.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={() => toggleDepartment(String(dept.id))}
                                            />
                                            <span className={isChecked ? "font-semibold text-sky-900" : "text-slate-700"}>
                                                {dept.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="forward_comment" className="text-xs text-sky-900">หมายเหตุการส่งต่อ (ถ้ามี)</Label>
                                <Input 
                                    id="forward_comment" 
                                    className="rounded-xl bg-white text-sm"
                                    placeholder="เช่น เพื่อโปรดทราบและดำเนินการต่อไป..."
                                    value={data.forward_comment}
                                    onChange={(e) => setData('forward_comment', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ปุ่มบันทึก */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button asChild variant="outline" type="button" className="rounded-xl">
                        <Link href={route('documents.index')}>ยกเลิก</Link>
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={processing || !data.file} 
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-base font-semibold shadow-md shadow-indigo-600/20"
                    >
                        <Save className="mr-2 h-4 w-4" /> 
                        {data.next_action === 'submit_boss' 
                            ? 'บันทึกและนำเรียน ผอ. ทันที' 
                            : data.next_action === 'forward' 
                                ? 'บันทึกและส่งต่อแผนกทันที' 
                                : 'ลงทะเบียนรับหนังสือ'}
                    </Button>
                </div>
            </form>
        </DocumentShell>
    );
}
