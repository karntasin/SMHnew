import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Wrench, 
    MapPin, 
    Tag, 
    AlertTriangle, 
    User, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    PlayCircle,
    Image as ImageIcon,
    History,
    FileText,
    ArrowLeft,
    X
} from 'lucide-react';
import { storageUrl } from '@/lib/asset';

interface MaintenanceImage {
    id: number;
    image_path: string;
    image_type?: string;
    caption?: string;
}

interface TimelineEvent {
    id: number;
    action: string;
    description?: string;
    created_at: string;
    user?: {
        id: number;
        name: string;
    };
}

interface MaintenanceRequest {
    id: number;
    ticket_number: string;
    title: string;
    description: string;
    location: string;
    status: string;
    technician_notes?: string;
    created_at: string;
    updated_at: string;
    category?: {
        id: number;
        name: string;
        color?: string;
        icon?: string;
    };
    priority?: {
        id: number;
        name: string;
        color?: string;
        level?: number;
    };
    requester?: {
        id: number;
        name: string;
        email?: string;
    };
    technician?: {
        id: number;
        name: string;
    };
    images?: MaintenanceImage[];
    timeline?: TimelineEvent[];
}

interface ShowProps {
    maintenanceRequest: MaintenanceRequest;
    technicians?: { id: number; name: string }[];
    canAssign?: boolean;
    canClose?: boolean;
    canManage?: boolean;
}

export default function Show({ maintenanceRequest, technicians = [], canAssign = false, canClose = false, canManage = false }: ShowProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    
    const { data, setData, put, post, processing } = useForm({
        status: maintenanceRequest?.status || 'pending',
        technician_notes: maintenanceRequest?.technician_notes || '',
        technician_id: maintenanceRequest?.technician?.id?.toString() || '',
        rating: '',
        feedback: '',
    });

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('maintenance.requests.update', { maintenanceRequest: maintenanceRequest.id }));
    };

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.technician_id) return;
        post(route('maintenance.requests.assign', { maintenanceRequest: maintenanceRequest.id }));
    };

    const handleClose = () => {
        if (confirm('คุณต้องการปิดงานแจ้งซ่อมนี้ใช่หรือไม่?')) {
            post(route('maintenance.requests.close', { maintenanceRequest: maintenanceRequest.id }));
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'รอดำเนินการ', variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600 bg-yellow-100' };
            case 'assigned':
                return { label: 'มอบหมายงานแล้ว', variant: 'default' as const, icon: User, color: 'text-blue-600 bg-blue-100' };
            case 'in_progress':
                return { label: 'กำลังดำเนินการ', variant: 'default' as const, icon: PlayCircle, color: 'text-blue-600 bg-blue-100' };
            case 'maintenance_completed':
                return { label: 'ซ่อมเสร็จสิ้น (รอตรวจสอบ)', variant: 'default' as const, icon: CheckCircle2, color: 'text-orange-600 bg-orange-100' };
            case 'completed':
                return { label: 'เสร็จสิ้น', variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600 bg-green-100' };
            case 'cancelled':
                return { label: 'ยกเลิก', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600 bg-red-100' };
            default:
                return { label: status, variant: 'outline' as const, icon: Clock, color: 'text-gray-600 bg-gray-100' };
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'created':
                return 'สร้างใบงาน';
            case 'updated':
                return 'อัปเดตข้อมูล';
            case 'status_changed':
                return 'เปลี่ยนสถานะ';
            case 'assigned':
                return 'มอบหมายงาน';
            default:
                return action;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!maintenanceRequest) {
        return (
            <AppLayout breadcrumbs={[{ title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') }]}>
                <Head title="ไม่พบข้อมูล" />
                <div className="p-6 text-center">
                    <p className="text-gray-500">ไม่พบข้อมูลใบแจ้งซ่อม</p>
                </div>
            </AppLayout>
        );
    }

    const statusConfig = getStatusConfig(maintenanceRequest.status);
    const StatusIcon = statusConfig.icon;
    const images = maintenanceRequest.images || [];
    const timeline = maintenanceRequest.timeline || [];

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },
            { title: 'รายการแจ้งซ่อม', href: route('maintenance.requests.index') },
            { title: maintenanceRequest.ticket_number, href: '#' }
        ]}>
            <Head title={`ใบงาน ${maintenanceRequest.ticket_number}`} />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href={route('maintenance.requests.index')}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">{maintenanceRequest.ticket_number}</h1>
                                <Badge className={statusConfig.color}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusConfig.label}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mt-1">{maintenanceRequest.title}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Request Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    รายละเอียดการแจ้งซ่อม
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Description */}
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground mb-2">รายละเอียดปัญหา</h4>
                                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        {maintenanceRequest.description || 'ไม่มีรายละเอียด'}
                                    </p>
                                </div>

                                <Separator />
                                
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <MapPin className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">สถานที่</p>
                                            <p className="font-medium">{maintenanceRequest.location || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <Tag className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">หมวดหมู่</p>
                                            <p className="font-medium">{maintenanceRequest.category?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">ความสำคัญ</p>
                                            <p className="font-medium">{maintenanceRequest.priority?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <User className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">ผู้แจ้ง</p>
                                            <p className="font-medium">{maintenanceRequest.requester?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Dates */}
                                <div className="flex flex-wrap gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        <span>สร้างเมื่อ: {formatDate(maintenanceRequest.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>อัปเดตล่าสุด: {formatDate(maintenanceRequest.updated_at)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Images */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5" />
                                    รูปภาพประกอบ
                                    {images.length > 0 && (
                                        <Badge variant="secondary">{images.length} รูป</Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {images.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {images.map((img) => (
                                            <div 
                                                key={img.id} 
                                                className="relative group cursor-pointer"
                                                onClick={() => setSelectedImage(storageUrl(img.image_path))}
                                            >
                                                <img 
                                                    src={storageUrl(img.image_path)} 
                                                    alt={img.caption || 'รูปภาพแจ้งซ่อม'} 
                                                    className="rounded-lg border object-cover h-32 w-full transition-transform group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/images/placeholder.png';
                                                        target.onerror = null;
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                        <p>ไม่มีรูปภาพประกอบ</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="w-5 h-5" />
                                    ประวัติการดำเนินการ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {timeline.length > 0 ? (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                                        <div className="space-y-6">
                                            {timeline.map((event, index) => (
                                                <div key={event.id} className="relative flex gap-4 pl-10">
                                                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                                                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium">{getActionLabel(event.action)}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDate(event.created_at)}
                                                            </span>
                                                        </div>
                                                        {event.description && (
                                                            <p className="text-sm text-muted-foreground">{event.description}</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            โดย {event.user?.name || 'ระบบ'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                        <p>ไม่มีประวัติการดำเนินการ</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Admin/Head Assignment Card */}
                        {canAssign && maintenanceRequest.status === 'pending' && (
                            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                        <User className="w-5 h-5" />
                                        มอบหมายงาน
                                    </CardTitle>
                                    <CardDescription>
                                        เลือกช่างผู้รับผิดชอบงานนี้
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleAssign} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>เลือกช่าง</Label>
                                            <Select 
                                                value={data.technician_id} 
                                                onValueChange={val => setData('technician_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="เลือกช่าง..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {technicians.map(tech => (
                                                        <SelectItem key={tech.id} value={tech.id.toString()}>
                                                            {tech.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={processing || !data.technician_id}>
                                            มอบหมายงาน
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* User Close Job Card */}
                        {canClose && maintenanceRequest.status === 'maintenance_completed' && (
                            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                        <CheckCircle2 className="w-5 h-5" />
                                        ปิดงานแจ้งซ่อม
                                    </CardTitle>
                                    <CardDescription>
                                        ช่างดำเนินการเสร็จสิ้นแล้ว กรุณาตรวจสอบและปิดงาน
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>ความพึงพอใจ (1-5)</Label>
                                        <Select 
                                            value={data.rating} 
                                            onValueChange={val => setData('rating', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="ให้คะแนน..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5 - ดีมาก</SelectItem>
                                                <SelectItem value="4">4 - ดี</SelectItem>
                                                <SelectItem value="3">3 - ปานกลาง</SelectItem>
                                                <SelectItem value="2">2 - พอใช้</SelectItem>
                                                <SelectItem value="1">1 - ปรับปรุง</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>ข้อเสนอแนะเพิ่มเติม</Label>
                                        <Textarea 
                                            value={data.feedback}
                                            onChange={e => setData('feedback', e.target.value)}
                                            placeholder="ข้อเสนอแนะ..."
                                            rows={2}
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleClose} 
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        disabled={processing}
                                    >
                                        ยืนยันปิดงาน
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Management Card (Legacy/Admin Edit) */}
                        {/* Only show if not in specific workflow states or if admin wants to force edit */}
                        {canManage && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wrench className="w-5 h-5" />
                                    จัดการใบงาน
                                </CardTitle>
                                <CardDescription>
                                    อัปเดตสถานะและบันทึกการดำเนินงาน
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>สถานะ</Label>
                                        <Select 
                                            value={data.status} 
                                            onValueChange={val => setData('status', val)}
                                            disabled={!canAssign && maintenanceRequest.status !== 'pending'} // Lock status for normal users
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-yellow-500" />
                                                        รอดำเนินการ
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="assigned">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-blue-500" />
                                                        มอบหมายแล้ว
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="in_progress">
                                                    <div className="flex items-center gap-2">
                                                        <PlayCircle className="w-4 h-4 text-blue-500" />
                                                        กำลังดำเนินการ
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="maintenance_completed">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-orange-500" />
                                                        ซ่อมเสร็จสิ้น (รอตรวจสอบ)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="completed">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        เสร็จสิ้น
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="cancelled">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                        ยกเลิก
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>บันทึกช่าง / หมายเหตุ</Label>
                                        <Textarea 
                                            value={data.technician_notes}
                                            onChange={e => setData('technician_notes', e.target.value)}
                                            placeholder="บันทึกการแก้ไข รายละเอียดการซ่อม..."
                                            rows={4}
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={processing}>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        {processing ? 'กำลังบันทึก...' : 'บันทึกการอัปเดต'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        )}

                        {/* Technician Notes Display */}
                        {maintenanceRequest.technician_notes && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">บันทึกช่าง</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {maintenanceRequest.technician_notes}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Lightbox */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img 
                        src={selectedImage} 
                        alt="รูปภาพขยาย" 
                        className="max-w-full max-h-full rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </AppLayout>
    );
}
