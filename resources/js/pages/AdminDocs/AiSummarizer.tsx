import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Upload, Download, FileText, ChevronRight } from 'lucide-react';
import axios from 'axios';

export default function AiSummarizer() {
    const [file, setFile] = useState<File | null>(null);
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleAiSummarize = async () => {
        if (!file) {
            alert("กรุณาเลือกไฟล์เอกสารก่อนให้ AI สรุป");
            return;
        }
        setIsSummarizing(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post(route('admin-docs.summarizeAi'), formData);
            setSummary(res.data.summary);
        } catch (error: any) {
            alert(error.response?.data?.error || "เกิดข้อผิดพลาดในการสรุปเนื้อหา");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleDownloadWord = async () => {
        if (!summary) return;
        setIsDownloading(true);
        try {
            const res = await axios.post(route('admin-docs.exportDocx'), { summary }, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Document_Summary.docx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'จัดการงานเอกสาร', href: '#' }, { title: 'สรุปหนังสือ', href: route('admin-docs.ai_summarizer') }]}>
            <Head title="สรุปหนังสือด้วย AI" />
            
            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(192,132,252,0.12),_transparent_45%)]" />
                
                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <section className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl md:p-8">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-indigo-300">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">ระบบผู้ช่วย AI สรุปหนังสือ</h1>
                                <p className="mt-2 text-indigo-100/90">
                                    อัปโหลดไฟล์หนังสือ (PDF, JPG, PNG) เพื่อให้ AI ช่วยสรุปเนื้อหาสำคัญให้อัตโนมัติ พร้อมส่งออกเป็นไฟล์ Word (DOCX)
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="mx-auto mt-8 max-w-4xl space-y-6 rounded-3xl border border-indigo-100/80 bg-white p-6 shadow-xl shadow-indigo-900/5 md:p-8">
                        
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">1. อัปโหลดไฟล์เอกสาร (PDF, รูปภาพ)</Label>
                            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-8 text-center transition hover:border-indigo-400">
                                <Upload className="mx-auto mb-3 h-10 w-10 text-indigo-400" />
                                <Input 
                                    id="file" 
                                    type="file" 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                                    className="mx-auto max-w-sm rounded-xl bg-white" 
                                />
                                {file && <p className="mt-3 font-medium text-emerald-600">ไฟล์ที่เลือก: {file.name}</p>}
                            </div>
                        </div>

                        <div className="flex justify-center py-2">
                            <Button 
                                type="button" 
                                onClick={handleAiSummarize}
                                disabled={isSummarizing || !file}
                                className="rounded-full bg-indigo-600 px-8 py-6 text-lg hover:bg-indigo-700"
                            >
                                {isSummarizing ? (
                                    <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> กำลังประมวลผลสรุปเนื้อหา...</>
                                ) : (
                                    <><Sparkles className="mr-3 h-6 w-6" /> สรุปเนื้อหาด้วย AI</>
                                )}
                            </Button>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">2. ผลลัพธ์การสรุป (สามารถแก้ไขได้)</Label>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleDownloadWord}
                                    disabled={!summary || isDownloading}
                                    className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                >
                                    {isDownloading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังสร้างไฟล์...</>
                                    ) : (
                                        <><FileText className="mr-2 h-4 w-4" /> ดาวน์โหลดเป็น Word (.docx)</>
                                    )}
                                </Button>
                            </div>
                            <Textarea 
                                className="min-h-[250px] rounded-xl text-base leading-relaxed" 
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder="เนื้อหาที่สรุปแล้วจะแสดงที่นี่..." 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
