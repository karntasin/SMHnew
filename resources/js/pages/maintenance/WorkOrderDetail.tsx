import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    Wrench,
    Clock,
    CheckCircle2,
    PlayCircle,
    XCircle,
    MapPin,
    User,
    Calendar,
    ArrowLeft,
    AlertTriangle,
    Image as ImageIcon,
    History,
    FileText,
    HandMetal,
    X,
    Tag,
    DollarSign
} from 'lucide-react';

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

interface WorkOrder {
    id: number;
    ticket_number: string;
    title: string;
    description: string;
    location: string;
    status: string;
    technician_notes?: string;
    resolution?: string;
    cost?: number;
    created_at: string;
    updated_at: string;
    assigned_at?: string;
    started_at?: string;
    completed_at?: string;
    category?: {
        id: number;
        name: string;
        color?: string;
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

interface WorkOrderDetailProps {
    workOrder: WorkOrder;
}

export default function WorkOrderDetail({ workOrder }: WorkOrderDetailProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const { data, setData, post, processing } = useForm({
        status: workOrder.status,
        technician_notes: workOrder.technician_notes || '',
        resolution: workOrder.resolution || '',
        cost: workOrder.cost || '',
    });

    const handleAcceptWork = () => {
        if (confirm('คุณต้องการรับงานนี้ใช่หรือไม่?')) {
            router.post(route('technician.work-orders.accept', { workOrder: workOrder.id }));
        }
    };

    const handleUpdateStatus = (newStatus: string) => {
        post(route('technician.work-orders.update-status', { workOrder: workOrder.id }), {
            data: { ...data, status: newStatus },
            preserveScroll: true,
        });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
            case 'assigned':
                return { label: 'มอบหมายแล้ว', color: 'bg-purple-100 text-purple-700', icon: User };
            case 'in_progress':
                return { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700', icon: PlayCircle };
            case 'maintenance_completed':
                return { label: 'รอตรวจสอบ', color: 'bg-orange-100 text-orange-700', icon: CheckCircle2 };
            case 'completed':
                return { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
            case 'cancelled':
                return { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'created': return 'สร้างใบงาน';
            case 'assigned': return 'มอบหมายงาน';
            case 'accepted': return 'รับงาน';
            case 'started': return 'เริ่มดำเนินการ';
            case 'updated': return 'อัปเดตข้อมูล';
            case 'maintenance_completed': return 'ซ่อมเสร็จสิ้น';
            case 'completed': return 'ปิดงาน';
            case 'cancelled': return 'ยกเลิก';
            default: return action;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const statusConfig = getStatusConfig(workOrder.status);
    const StatusIcon = statusConfig.icon;
    const images = workOrder.images || [];
    const timeline = workOrder.timeline || [];

    return (
        <AppLayout breadcrumbs={[
            { title: 'ใบงานซ่อมบำรุง', href: route('technician.work-orders.index') },
            { title: workOrder.ticket_number, href: '#' }
        ]}>
            <Head title={`ใบงาน ${workOrder.ticket_number}`} />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href={route('technician.work-orders.index')}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold">{workOrder.ticket_number}</h1>
                                <Badge className={statusConfig.color}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {statusConfig.label}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mt-1">{workOrder.title}</p>
                        </div>
                    </div>
                    
                    {/* Quick Actions */}
                    {(workOrder.status === 'pending' || workOrder.status === 'assigned') && (
                        <Button 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleAcceptWork}
                        >
                            <HandMetal className="w-4 h-4 mr-2" />
                            รับงานนี้
                        </Button>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Request Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    รายละเอียดงาน
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground mb-2">รายละเอียดปัญหา</h4>
                                    <p className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg whitespace-pre-wrap text-foreground">
                                        {workOrder.description || 'ไม่มีรายละเอียดระบุ'}
                                    </p>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <MapPin className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">สถานที่</p>
                                            <p className="font-medium">{workOrder.location}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <Tag className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">หมวดหมู่</p>
                                            <p className="font-medium">{workOrder.category?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">ความสำคัญ</p>
                                            <p className="font-medium">{workOrder.priority?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <User className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">ผู้แจ้ง</p>
                                            <p className="font-medium">{workOrder.requester?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex flex-wrap gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        <span>แจ้งเมื่อ: {formatDate(workOrder.created_at)}</span>
                                    </div>
                                    {workOrder.assigned_at && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <HandMetal className="w-4 h-4" />
                                            <span>รับงานเมื่อ: {formatDate(workOrder.assigned_at)}</span>
                                        </div>
                                    )}
                                    {workOrder.completed_at && (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>เสร็จเมื่อ: {formatDate(workOrder.completed_at)}</span>
                                        </div>
                                    )}
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
                                                onClick={() => setSelectedImage(`/storage/${img.image_path}`)}
                                            >
                                                <img 
                                                    src={`/storage/${img.image_path}`} 
                                                    alt={img.caption || 'รูปภาพ'} 
                                                    className="rounded-lg border object-cover h-32 w-full transition-transform group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/images/placeholder.png';
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
                                            {timeline.map((event) => (
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

                    {/* Sidebar - Work Management */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wrench className="w-5 h-5" />
                                    จัดการงาน
                                </CardTitle>
                                <CardDescription>
                                    อัปเดตสถานะและบันทึกการซ่อม
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(workOrder.status === 'pending' || workOrder.status === 'assigned') && (
                                    <Button 
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={handleAcceptWork}
                                    >
                                        <HandMetal className="w-4 h-4 mr-2" />
                                        รับงานนี้
                                    </Button>
                                )}

                                {workOrder.status === 'in_progress' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>บันทึกการซ่อม</Label>
                                            <Textarea 
                                                value={data.technician_notes}
                                                onChange={e => setData('technician_notes', e.target.value)}
                                                placeholder="บันทึกขั้นตอนการซ่อม..."
                                                rows={3}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>วิธีแก้ไข / ผลการซ่อม</Label>
                                            <Textarea 
                                                value={data.resolution}
                                                onChange={e => setData('resolution', e.target.value)}
                                                placeholder="อธิบายวิธีแก้ไขปัญหา..."
                                                rows={3}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" />
                                                ค่าใช้จ่าย (บาท)
                                            </Label>
                                            <Input 
                                                type="number"
                                                value={data.cost}
                                                onChange={e => setData('cost', e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-2 gap-2">
                                            <Button 
                                                variant="outline"
                                                onClick={() => handleUpdateStatus('in_progress')}
                                                disabled={processing}
                                            >
                                                บันทึก
                                            </Button>
                                            <Button 
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => handleUpdateStatus('maintenance_completed')}
                                                disabled={processing}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                เสร็จสิ้น
                                            </Button>
                                        </div>

                                        <Button 
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() => {
                                                if (confirm('คุณต้องการยกเลิกใบงานนี้ใช่หรือไม่?')) {
                                                    handleUpdateStatus('cancelled');
                                                }
                                            }}
                                            disabled={processing}
                                        >
                                            <XCircle className="w-4 h-4 mr-1" />
                                            ยกเลิกงาน
                                        </Button>
                                    </>
                                )}

                                {workOrder.status === 'maintenance_completed' && (
                                    <div className="text-center py-4">
                                        <CheckCircle2 className="w-12 h-12 mx-auto text-blue-500 mb-2" />
                                        <p className="font-medium text-blue-600">ซ่อมเสร็จสิ้น (รอตรวจสอบ)</p>
                                        {workOrder.completed_at && (
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(workOrder.completed_at)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {workOrder.status === 'completed' && (
                                    <div className="text-center py-4">
                                        <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
                                        <p className="font-medium text-green-600">งานเสร็จสิ้นแล้ว</p>
                                        {workOrder.completed_at && (
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(workOrder.completed_at)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {workOrder.status === 'cancelled' && (
                                    <div className="text-center py-4">
                                        <XCircle className="w-12 h-12 mx-auto text-red-500 mb-2" />
                                        <p className="font-medium text-red-600">งานถูกยกเลิก</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Resolution / Notes Display */}
                        {(workOrder.technician_notes || workOrder.resolution) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">บันทึกการซ่อม</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {workOrder.technician_notes && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">หมายเหตุ:</p>
                                            <p className="text-sm whitespace-pre-wrap">{workOrder.technician_notes}</p>
                                        </div>
                                    )}
                                    {workOrder.resolution && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">วิธีแก้ไข:</p>
                                            <p className="text-sm whitespace-pre-wrap">{workOrder.resolution}</p>
                                        </div>
                                    )}
                                    {workOrder.cost && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">ค่าใช้จ่าย:</p>
                                            <p className="text-sm font-medium">{Number(workOrder.cost).toLocaleString()} บาท</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Technician Info */}
                        {workOrder.technician && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">ช่างผู้รับผิดชอบ</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{workOrder.technician.name}</p>
                                            <p className="text-xs text-muted-foreground">ช่างผู้ดูแล</p>
                                        </div>
                                    </div>
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
