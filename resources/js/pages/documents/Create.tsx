import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Save } from 'lucide-react';

interface CreateProps {
    users: any[];
    departments: any[];
}

export default function Create({ users, departments }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        document_number: '',
        document_date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        origin_type: 'internal', // internal, external
        sender_name: '',
        department_id: '',
        type: 'normal', // normal, circular
        file: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('documents.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบรับส่งหนังสือ', href: route('documents.index') },
            { title: 'ลงทะเบียนรับหนังสือ', href: '#' }
        ]}>
            <Head title="ลงทะเบียนรับหนังสือ" />
            
            <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href={route('documents.index')} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        กลับไปหน้ารายการ
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>ลงทะเบียนรับหนังสือ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="space-y-3">
                                <Label>ประเภทที่มาของหนังสือ</Label>
                                <RadioGroup 
                                    defaultValue="internal" 
                                    value={data.origin_type}
                                    onValueChange={(val) => setData('origin_type', val)}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="internal" id="r1" />
                                        <Label htmlFor="r1">หนังสือภายใน (จากหน่วยงานภายใน)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="external" id="r2" />
                                        <Label htmlFor="r2">หนังสือภายนอก (จากหน่วยงานอื่น)</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="document_number">เลขที่หนังสือ</Label>
                                    <Input 
                                        id="document_number" 
                                        value={data.document_number}
                                        onChange={e => setData('document_number', e.target.value)}
                                        placeholder="เช่น ศธ 0400/1234"
                                    />
                                    {errors.document_number && <p className="text-red-500 text-sm">{errors.document_number}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="document_date">ลงวันที่</Label>
                                    <Input 
                                        id="document_date" 
                                        type="date"
                                        value={data.document_date}
                                        onChange={e => setData('document_date', e.target.value)}
                                        required
                                    />
                                    {errors.document_date && <p className="text-red-500 text-sm">{errors.document_date}</p>}
                                </div>
                            </div>

                            {data.origin_type === 'internal' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="department_id">จากหน่วยงาน</Label>
                                    <Select value={data.department_id} onValueChange={val => setData('department_id', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกหน่วยงานต้นเรื่อง" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(dept => (
                                                <SelectItem key={dept.id} value={String(dept.id)}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.department_id && <p className="text-red-500 text-sm">{errors.department_id}</p>}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="sender_name">จากหน่วยงาน/บุคคล (ภายนอก)</Label>
                                    <Input 
                                        id="sender_name" 
                                        value={data.sender_name}
                                        onChange={e => setData('sender_name', e.target.value)}
                                        placeholder="ระบุชื่อหน่วยงานหรือบุคคลที่ส่งมา"
                                    />
                                    {errors.sender_name && <p className="text-red-500 text-sm">{errors.sender_name}</p>}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="title">เรื่อง</Label>
                                <Input 
                                    id="title" 
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    placeholder="ระบุชื่อเรื่อง..."
                                    required
                                />
                                {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">ประเภทการดำเนินการ</Label>
                                <Select value={data.type} onValueChange={val => setData('type', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกประเภท" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">หนังสือปกติ (เสนอ/สั่งการ)</SelectItem>
                                        <SelectItem value="circular">หนังสือเวียน (แจ้งทราบ)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-red-500 text-sm">{errors.type}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียด/หมายเหตุ</Label>
                                <Textarea 
                                    id="description" 
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    rows={4}
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file">ไฟล์แนบ (PDF)</Label>
                                <Input 
                                    id="file" 
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.png"
                                    onChange={e => setData('file', e.target.files ? e.target.files[0] : null)}
                                />
                                {errors.file && <p className="text-red-500 text-sm">{errors.file}</p>}
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <Link href={route('documents.index')}>
                                    <Button variant="outline" type="button">ยกเลิก</Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    ลงทะเบียนรับ
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
