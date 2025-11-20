import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, FileText, ArrowLeft, Save, Info, Tag, Calendar as CalendarIconLucide } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface Department {
    id: number;
    name: string;
}

interface Props {
    departments: Department[];
}

export default function Create({ departments }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        document_number: '',
        category: '',
        document_type: '',
        department_id: '',
        description: '',
        effective_date: '',
        review_date: '',
        file: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('quality-docs.store'));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'เอกสารคุณภาพ', href: '/quality-docs' },
                { title: 'สร้างเอกสารใหม่', href: '/quality-docs/create' },
            ]}
        >
            <Head title="สร้างเอกสารใหม่" />
            
            <div className="container mx-auto py-6 max-w-5xl">
                <div className="mb-6">
                    <Link href={route('quality-docs.index')}>
                        <Button variant="ghost" className="pl-0 hover:pl-0 hover:bg-transparent">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            กลับไปหน้ารายการ
                        </Button>
                    </Link>
                    <div className="mt-2">
                        <h1 className="text-3xl font-bold tracking-tight">สร้างเอกสารคุณภาพใหม่</h1>
                        <p className="text-muted-foreground">กรอกข้อมูลเอกสารเพื่อนำเข้าสู่ระบบการจัดการคุณภาพ (HA/JCI)</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Main Info */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <Info className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle>ข้อมูลทั่วไป</CardTitle>
                                            <CardDescription>รายละเอียดหลักของเอกสาร</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="document_number">รหัสเอกสาร <span className="text-red-500">*</span></Label>
                                            <Input 
                                                id="document_number" 
                                                value={data.document_number}
                                                onChange={e => setData('document_number', e.target.value)}
                                                placeholder="เช่น WI-NUR-001"
                                                className={errors.document_number ? 'border-red-500' : ''}
                                            />
                                            {errors.document_number && <p className="text-sm text-red-500">{errors.document_number}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="department_id">แผนกเจ้าของเอกสาร <span className="text-red-500">*</span></Label>
                                            <Select onValueChange={val => setData('department_id', val)}>
                                                <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="เลือกแผนก" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map(dept => (
                                                        <SelectItem key={dept.id} value={dept.id.toString()}>
                                                            {dept.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.department_id && <p className="text-sm text-red-500">{errors.department_id}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">ชื่อเอกสาร <span className="text-red-500">*</span></Label>
                                        <Input 
                                            id="title" 
                                            value={data.title}
                                            onChange={e => setData('title', e.target.value)}
                                            placeholder="ระบุชื่อเอกสารภาษาไทย หรือ ภาษาอังกฤษ"
                                            className={errors.title ? 'border-red-500' : ''}
                                        />
                                        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">รายละเอียด / คำอธิบายเพิ่มเติม</Label>
                                        <Textarea 
                                            id="description" 
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder="อธิบายรายละเอียดโดยย่อของเอกสารนี้..."
                                            className="min-h-[100px]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle>ไฟล์เอกสาร</CardTitle>
                                            <CardDescription>อัปโหลดไฟล์เอกสารฉบับจริง (PDF เท่านั้น)</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                        <input 
                                            type="file" 
                                            id="file" 
                                            accept=".pdf"
                                            onChange={e => setData('file', e.target.files ? e.target.files[0] : null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="p-3 bg-gray-100 rounded-full">
                                                <Upload className="h-6 w-6 text-gray-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">
                                                    {data.file ? data.file.name : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">รองรับไฟล์ PDF ขนาดไม่เกิน 10MB</p>
                                            </div>
                                        </div>
                                    </div>
                                    {errors.file && <p className="text-sm text-red-500 mt-2">{errors.file}</p>}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Meta Info */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                            <Tag className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle>การจัดหมวดหมู่</CardTitle>
                                            <CardDescription>ประเภทและมาตรฐาน</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="category">มาตรฐาน (Category) <span className="text-red-500">*</span></Label>
                                        <Select onValueChange={val => setData('category', val)}>
                                            <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="เลือกมาตรฐาน" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="HA">HA (Hospital Accreditation)</SelectItem>
                                                <SelectItem value="JCI">JCI</SelectItem>
                                                <SelectItem value="ISO">ISO</SelectItem>
                                                <SelectItem value="General">ทั่วไป</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="document_type">ประเภทเอกสาร <span className="text-red-500">*</span></Label>
                                        <Select onValueChange={val => setData('document_type', val)}>
                                            <SelectTrigger className={errors.document_type ? 'border-red-500' : ''}>
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
                                        {errors.document_type && <p className="text-sm text-red-500">{errors.document_type}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                            <CalendarIconLucide className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle>วันที่บังคับใช้</CardTitle>
                                            <CardDescription>กำหนดการใช้งานและทบทวน</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>วันที่เริ่มบังคับใช้ <span className="text-red-500">*</span></Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !data.effective_date && "text-muted-foreground",
                                                        errors.effective_date && "border-red-500"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {data.effective_date ? format(new Date(data.effective_date), "dd MMM yyyy", { locale: th }) : <span>เลือกวันที่</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={data.effective_date ? new Date(data.effective_date) : undefined}
                                                    onSelect={(date: Date | undefined) => setData('effective_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.effective_date && <p className="text-sm text-red-500">{errors.effective_date}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>วันที่ครบกำหนดทบทวน <span className="text-red-500">*</span></Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !data.review_date && "text-muted-foreground",
                                                        errors.review_date && "border-red-500"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {data.review_date ? format(new Date(data.review_date), "dd MMM yyyy", { locale: th }) : <span>เลือกวันที่</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={data.review_date ? new Date(data.review_date) : undefined}
                                                    onSelect={(date: Date | undefined) => setData('review_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.review_date && <p className="text-sm text-red-500">{errors.review_date}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={processing}>
                                <Save className="mr-2 h-4 w-4" />
                                {processing ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
