import React from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, XCircle, Send, Clock, File, AlertCircle, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DocsSubNav from '@/pages/quality-docs/DocsSubNav';

interface Document {
    id: number;
    document_number: string;
    title: string;
    description: string;
    category: string;
    document_type: string;
    status: string;
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
}

interface Props {
    document: Document;
    can: {
        approve: boolean;
        edit: boolean;
    };
}

export default function Show({ document, can }: Props) {
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

    const getCategoryLabel = (category: string) => {
        const categories: Record<string, string> = {
            HA: 'HA (Hospital Accreditation)',
            JCI: 'JCI (Joint Commission International)',
            ISO: 'ISO Standards',
            General: 'ทั่วไป',
        };
        return categories[category] || category;
    };

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            Policy: 'นโยบาย (Policy)',
            Procedure: 'ระเบียบปฏิบัติ (Procedure)',
            'Work Instruction': 'วิธีปฏิบัติงาน (Work Instruction)',
            Form: 'แบบฟอร์ม (Form)',
            Manual: 'คู่มือ (Manual)',
        };
        return types[type] || type;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return format(new Date(dateString), 'dd MMM yyyy', { locale: th });
    };

    const handleDownload = () => {
        window.open(route('quality-docs.download', { id: document.id }), '_blank');
    };

    const handleSubmitForReview = () => {
        if (confirm('ยืนยันการส่งเอกสารเพื่อขออนุมัติ?')) {
            router.post(route('quality-docs.submit', { id: document.id }));
        }
    };

    const handleApprove = () => {
        if (confirm('ยืนยันการอนุมัติเอกสารนี้?')) {
            router.post(route('quality-docs.approve', { id: document.id }));
        }
    };

    const handleReject = () => {
        if (confirm('ยืนยันการตีกลับเอกสารนี้?')) {
            router.post(route('quality-docs.reject', { id: document.id }));
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

    return (
        <QualityPage
            tone="blue"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · เอกสาร"
            title={document.title}
            subtitle={`เลขที่เอกสาร: ${document.document_number}`}
            headTitle={`${document.document_number} - ${document.title}`}
            breadcrumbs={breadcrumbs}
            actions={
                <div className="flex items-center gap-2">
                    {getStatusPill(document.status)}
                    <span className="text-sm text-slate-500">{document.department?.name || 'ไม่ระบุแผนก'}</span>
                </div>
            }
            subNav={<DocsSubNav active="quality-docs.index" />}
        >
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Panel title="สถานะเอกสาร" description="ขั้นตอนการอนุมัติ">
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
                                                    : 'border-slate-300 bg-white text-slate-400',
                                            )}
                                        >
                                            <step.icon className="h-5 w-5" />
                                        </div>
                                        <span
                                            className={cn(
                                                'mt-2 text-xs font-medium',
                                                step.active ? 'text-blue-600' : 'text-slate-500',
                                            )}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Panel>

                    <Panel title="รายละเอียด / คำอธิบาย">
                        <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700">
                            {document.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                        </div>
                    </Panel>

                    <Panel title="ข้อมูลเอกสาร">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">หมวดหมู่มาตรฐาน</h3>
                                    <p className="font-medium text-slate-800">{getCategoryLabel(document.category)}</p>
                                </div>
                                <div>
                                    <h3 className="mb-1 text-xs font-medium uppercase text-slate-400">ประเภทเอกสาร</h3>
                                    <p className="font-medium text-slate-800">{getTypeLabel(document.document_type)}</p>
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
                </div>

                <div className="space-y-6">
                    <Panel title="การจัดการ">
                        <div className="space-y-3">
                            <Button onClick={handleDownload} variant="outline" className="w-full justify-start rounded-xl">
                                <Download className="mr-2 h-4 w-4" />
                                ดาวน์โหลดเอกสาร
                            </Button>

                            {can.edit && document.status === 'draft' && (
                                <>
                                    <div className="border-t border-slate-100 pt-3">
                                        <Button
                                            onClick={handleSubmitForReview}
                                            className="w-full justify-start rounded-xl bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Send className="mr-2 h-4 w-4" />
                                            ส่งขออนุมัติ
                                        </Button>
                                    </div>
                                </>
                            )}

                            {can.approve && document.status === 'review' && (
                                <div className="space-y-2 border-t border-slate-100 pt-3">
                                    <Button
                                        onClick={handleApprove}
                                        className="w-full justify-start rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        อนุมัติเอกสาร
                                    </Button>
                                    <Button onClick={handleReject} variant="destructive" className="w-full justify-start rounded-xl">
                                        <XCircle className="mr-2 h-4 w-4" />
                                        ตีกลับ / ไม่อนุมัติ
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
        </QualityPage>
    );
}
