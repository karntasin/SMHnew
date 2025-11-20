import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, CheckCircle, XCircle, Send, Edit, ArrowLeft, Clock, File, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> ใช้งานจริง</Badge>;
            case 'review':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> รออนุมัติ</Badge>;
            case 'draft':
                return <Badge variant="secondary"><File className="w-3 h-3 mr-1" /> ฉบับร่าง</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getCategoryLabel = (category: string) => {
        const categories: Record<string, string> = {
            'HA': 'HA (Hospital Accreditation)',
            'JCI': 'JCI (Joint Commission International)',
            'ISO': 'ISO Standards',
            'General': 'ทั่วไป'
        };
        return categories[category] || category;
    };

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            'Policy': 'นโยบาย (Policy)',
            'Procedure': 'ระเบียบปฏิบัติ (Procedure)',
            'Work Instruction': 'วิธีปฏิบัติงาน (Work Instruction)',
            'Form': 'แบบฟอร์ม (Form)',
            'Manual': 'คู่มือ (Manual)'
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

    // Status Steps
    const steps = [
        { id: 'draft', label: 'ฉบับร่าง', icon: File, active: true },
        { id: 'review', label: 'รออนุมัติ', icon: Clock, active: ['review', 'published'].includes(document.status) },
        { id: 'published', label: 'ใช้งานจริง', icon: CheckCircle, active: document.status === 'published' },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
                { title: document.document_number, href: `/quality-docs/${document.id}` },
            ]}
        >
            <Head title={`${document.document_number} - ${document.title}`} />

            <div className="container mx-auto py-6 max-w-5xl">
                <div className="mb-6">
                    <Link href={route('quality-docs.index')}>
                        <Button variant="ghost" className="pl-0 hover:pl-0 hover:bg-transparent">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            กลับไปหน้ารายการ
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="overflow-hidden">
                            <div className="bg-muted/30 p-6 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            {getStatusBadge(document.status)}
                                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                                {document.department?.name || 'ไม่ระบุแผนก'}
                                            </span>
                                        </div>
                                        <h1 className="text-2xl font-bold mb-2">{document.title}</h1>
                                        <p className="text-muted-foreground">
                                            เลขที่เอกสาร: <span className="font-semibold text-foreground">{document.document_number}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <CardContent className="p-6 space-y-6">
                                {/* Status Stepper */}
                                <div className="relative">
                                    <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
                                    <div className="flex justify-between">
                                        {steps.map((step, index) => (
                                            <div key={step.id} className="flex flex-col items-center bg-white dark:bg-gray-950 px-2">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                                                    step.active 
                                                        ? "bg-blue-600 border-blue-600 text-white" 
                                                        : "bg-white border-gray-300 text-gray-400"
                                                )}>
                                                    <step.icon className="w-5 h-5" />
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-medium mt-2",
                                                    step.active ? "text-blue-600" : "text-gray-500"
                                                )}>{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">รายละเอียด / คำอธิบาย</h3>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed border">
                                        {document.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-1">หมวดหมู่มาตรฐาน</h3>
                                            <p className="font-medium">{getCategoryLabel(document.category)}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-1">ประเภทเอกสาร</h3>
                                            <p className="font-medium">{getTypeLabel(document.document_type)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-1">เจ้าของเอกสาร</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                                    {document.owner?.name?.charAt(0) || 'U'}
                                                </div>
                                                <p className="font-medium">{document.owner?.name || '-'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-1">แก้ไขล่าสุด</h3>
                                            <p className="font-medium">{formatDate(document.updated_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Actions & Dates */}
                    <div className="space-y-6">
                        {/* Actions Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">การจัดการ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button onClick={handleDownload} variant="outline" className="w-full justify-start">
                                    <Download className="mr-2 h-4 w-4" />
                                    ดาวน์โหลดเอกสาร
                                </Button>

                                {can.edit && document.status === 'draft' && (
                                    <>
                                        <Separator />
                                        <Button onClick={handleSubmitForReview} className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                                            <Send className="mr-2 h-4 w-4" />
                                            ส่งขออนุมัติ
                                        </Button>
                                    </>
                                )}
                                
                                {can.approve && document.status === 'review' && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Button onClick={handleApprove} className="w-full justify-start bg-green-600 hover:bg-green-700">
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                อนุมัติเอกสาร
                                            </Button>
                                            <Button onClick={handleReject} variant="destructive" className="w-full justify-start">
                                                <XCircle className="mr-2 h-4 w-4" />
                                                ตีกลับ / ไม่อนุมัติ
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Dates Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">กำหนดการ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 rounded-md text-green-600 mt-0.5">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">วันที่บังคับใช้</p>
                                        <p className="font-semibold">{formatDate(document.effective_date)}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-orange-100 rounded-md text-orange-600 mt-0.5">
                                        <AlertCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">วันครบกำหนดทบทวน</p>
                                        <p className="font-semibold">{formatDate(document.review_date)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
