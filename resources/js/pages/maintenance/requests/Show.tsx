import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ShowProps {
    maintenanceRequest: any;
}

export default function Show({ maintenanceRequest }: ShowProps) {
    const { data, setData, put, processing } = useForm({
        status: maintenanceRequest.status,
        technician_notes: maintenanceRequest.technician_notes || '',
    });

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('maintenance.requests.update', maintenanceRequest.id));
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'created':
                return 'สร้างใบงาน';
            case 'updated':
                return 'อัปเดตข้อมูล';
            default:
                return action;
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },
            { title: maintenanceRequest.ticket_number, href: '#' }
        ]}>
            <Head title={`ใบงาน ${maintenanceRequest.ticket_number}`} />

            <div className="p-6 grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{maintenanceRequest.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    เลขที่ใบงาน: {maintenanceRequest.ticket_number}
                                </p>
                            </div>
                            <Badge variant={
                                maintenanceRequest.status === 'completed' ? 'default' : 
                                maintenanceRequest.status === 'pending' ? 'secondary' : 'outline'
                            }>
                                {maintenanceRequest.status === 'pending' ? 'รอดำเนินการ' : 
                                 maintenanceRequest.status === 'in_progress' ? 'กำลังดำเนินการ' : 
                                 maintenanceRequest.status === 'completed' ? 'เสร็จสิ้น' : 
                                 maintenanceRequest.status === 'cancelled' ? 'ยกเลิก' : maintenanceRequest.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-1">รายละเอียด</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{maintenanceRequest.description}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-1">สถานที่</h3>
                                    <p>{maintenanceRequest.location}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">หมวดหมู่</h3>
                                    <p>{maintenanceRequest.category?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">ความสำคัญ</h3>
                                    <p>{maintenanceRequest.priority?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">ผู้แจ้ง</h3>
                                    <p>{maintenanceRequest.requester?.name}</p>
                                </div>
                            </div>

                            {maintenanceRequest.images && maintenanceRequest.images.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-2">รูปภาพประกอบ</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {maintenanceRequest.images.map((img: any) => (
                                            <a key={img.id} href={`/storage/${img.image_path}`} target="_blank" rel="noreferrer">
                                                <img 
                                                    src={`/storage/${img.image_path}`} 
                                                    alt="Request Image" 
                                                    className="rounded-lg border object-cover h-32 w-full"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>ประวัติการดำเนินการ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {maintenanceRequest.timeline.map((event: any) => (
                                    <div key={event.id} className="flex gap-4">
                                        <div className="min-w-[100px] text-sm text-muted-foreground">
                                            {new Date(event.created_at).toLocaleString('th-TH')}
                                        </div>
                                        <div>
                                            <p className="font-medium">{getActionLabel(event.action)}</p>
                                            <p className="text-sm text-gray-600">
                                                โดย {event.user?.name}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>การจัดการ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>สถานะ</Label>
                                    <Select 
                                        value={data.status} 
                                        onValueChange={val => setData('status', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">รอดำเนินการ</SelectItem>
                                            <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                                            <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                                            <SelectItem value="cancelled">ยกเลิก</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>บันทึกช่าง / ผู้ดูแล</Label>
                                    <Textarea 
                                        value={data.technician_notes}
                                        onChange={e => setData('technician_notes', e.target.value)}
                                        placeholder="บันทึกการแก้ไข..."
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={processing}>
                                    อัปเดตสถานะ
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
