import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';

interface DocumentType {
    id: number;
    name: string;
}

interface SettingsProps {
    documentTypes: DocumentType[];
}

export default function Settings({ documentTypes }: SettingsProps) {
    const { data, setData, post, processing, reset } = useForm({
        name: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('documents.settings.types.store'), {
            onSuccess: () => reset(),
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบรับส่งหนังสือ', href: '/documents' }, { title: 'ตั้งค่า', href: '#' }]}>
            <Head title="ตั้งค่าระบบหนังสือ" />
            
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold">ตั้งค่าระบบหนังสือ</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>ประเภทหนังสือ</CardTitle>
                        <CardDescription>จัดการประเภทหนังสือในระบบ (เช่น คำสั่ง, ประกาศ, บันทึกข้อความ)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="name">ชื่อประเภทหนังสือ</Label>
                                <Input 
                                    type="text" 
                                    id="name" 
                                    placeholder="ระบุชื่อประเภท..." 
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={processing}>
                                <Plus className="mr-2 h-4 w-4" />
                                เพิ่ม
                            </Button>
                        </form>

                        <div className="border rounded-md">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium">ชื่อประเภท</th>
                                        <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documentTypes.length === 0 ? (
                                        <tr>
                                            <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                                                ยังไม่มีข้อมูล
                                            </td>
                                        </tr>
                                    ) : (
                                        documentTypes.map((type) => (
                                            <tr key={type.id} className="border-b last:border-0">
                                                <td className="px-4 py-3">{type.name}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link 
                                                        href={route('documents.settings.types.delete', type.id)} 
                                                        method="delete" 
                                                        as="button"
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
