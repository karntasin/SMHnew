import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';

interface CreateProps {
    users: any[];
    departments: any[];
}

export default function Create({ users, departments }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        document_number: '',
        document_date: new Date().toISOString().split('T')[0],
        subject: '',
        content: '',
        urgency: 'normal',
        confidentiality: 'normal',
        approver_id: '',
        attachment: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('documents.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบรับส่งหนังสือ', href: route('documents.index') },
            { title: 'สร้างหนังสือใหม่', href: '#' }
        ]}>
            <Head title="สร้างหนังสือใหม่" />
            
            <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href={route('documents.index')} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        กลับไปหน้ารายการ
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>สร้างหนังสือใหม่</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="document_number">เลขที่หนังสือ</Label>
                                    <Input 
                                        id="document_number" 
                                        value={data.document_number}
                                        onChange={e => setData('document_number', e.target.value)}
                                        placeholder="เช่น ศธ 0400/1234"
                                        required
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

                            <div className="space-y-2">
                                <Label htmlFor="subject">เรื่อง</Label>
                                <Input 
                                    id="subject" 
                                    value={data.subject}
                                    onChange={e => setData('subject', e.target.value)}
                                    placeholder="ระบุชื่อเรื่อง..."
                                    required
                                />
                                {errors.subject && <p className="text-red-500 text-sm">{errors.subject}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="urgency">ความเร่งด่วน</Label>
                                    <Select value={data.urgency} onValueChange={val => setData('urgency', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกความเร่งด่วน" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">ปกติ</SelectItem>
                                            <SelectItem value="urgent">ด่วน</SelectItem>
                                            <SelectItem value="very_urgent">ด่วนที่สุด</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confidentiality">ชั้นความลับ</Label>
                                    <Select value={data.confidentiality} onValueChange={val => setData('confidentiality', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกชั้นความลับ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">ปกติ</SelectItem>
                                            <SelectItem value="confidential">ลับ</SelectItem>
                                            <SelectItem value="secret">ลับที่สุด</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">รายละเอียด/เนื้อหา</Label>
                                <Textarea 
                                    id="content" 
                                    value={data.content}
                                    onChange={e => setData('content', e.target.value)}
                                    rows={5}
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="attachment">ไฟล์แนบ (PDF)</Label>
                                <Input 
                                    id="attachment" 
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.png"
                                    onChange={e => setData('attachment', e.target.files ? e.target.files[0] : null)}
                                />
                                {errors.attachment && <p className="text-red-500 text-sm">{errors.attachment}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="approver_id">เสนอผู้อำนวยการ (เพื่อลงนาม)</Label>
                                <Select value={data.approver_id} onValueChange={val => setData('approver_id', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกผู้อำนวยการ/ผู้มีอำนาจลงนาม" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={String(user.id)}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">หากเลือก จะส่งไปให้ลงนามก่อนดำเนินการต่อ</p>
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <Link href={route('documents.index')}>
                                    <Button variant="outline" type="button">ยกเลิก</Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    บันทึกและส่ง
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
