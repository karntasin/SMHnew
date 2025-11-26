import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText } from 'lucide-react';

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'Assets', href: '/km/assets' },
    { title: 'Upload', href: '#' },
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Upload Document" />

            <div className="container mx-auto p-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>อัปโหลดเอกสารใหม่</CardTitle>
                        <CardDescription>แบ่งปันความรู้สู่องค์กร</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">ชื่อเอกสาร <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="title" 
                                    value={data.title} 
                                    onChange={e => setData('title', e.target.value)}
                                    placeholder="เช่น คู่มือการใช้งานระบบ..."
                                />
                                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">หมวดหมู่ <span className="text-red-500">*</span></Label>
                                <Select onValueChange={val => setData('category', val)}>
                                    <SelectTrigger>
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
                                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียด</Label>
                                <Textarea 
                                    id="description" 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับเอกสาร..."
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file">ไฟล์เอกสาร <span className="text-red-500">*</span></Label>
                                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                    <Input 
                                        id="file" 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={e => setData('file', e.target.files ? e.target.files[0] : null)}
                                    />
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    {data.file ? (
                                        <div className="flex items-center gap-2 text-primary font-medium">
                                            <FileText className="h-4 w-4" />
                                            {data.file.name}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-semibold text-primary">คลิกเพื่อเลือกไฟล์</span> หรือลากไฟล์มาวางที่นี่
                                            <p className="text-xs mt-1">รองรับ PDF, Word, Excel, PowerPoint (Max 10MB)</p>
                                        </div>
                                    )}
                                </div>
                                {errors.file && <p className="text-sm text-red-500">{errors.file}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tags">Tags (คั่นด้วยจุลภาค)</Label>
                                <Input 
                                    id="tags" 
                                    value={data.tags} 
                                    onChange={e => setData('tags', e.target.value)}
                                    placeholder="เช่น HR, Safety, ISO"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-4">
                            <Button variant="outline" type="button" onClick={() => window.history.back()}>ยกเลิก</Button>
                            <Button type="submit" disabled={processing}>อัปโหลด</Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
