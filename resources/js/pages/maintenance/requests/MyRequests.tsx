import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Wrench, MapPin, Calendar, Clock, AlertCircle, CheckCircle2, 
    MoreVertical, Edit, Trash2, CheckSquare, Eye, Plus 
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Request {
    id: number;
    ticket_number: string;
    title: string;
    description: string;
    location: string;
    status: string;
    created_at: string;
    category?: { name: string };
    priority?: { name: string; color: string };
    technician?: { name: string };
}

interface Props {
    requests: {
        data: Request[];
        links: any[];
    };
    filters: {
        status?: string;
    };
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
    maintenance_completed: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels: Record<string, string> = {
    pending: 'รอดำเนินการ',
    assigned: 'มอบหมายแล้ว',
    in_progress: 'กำลังดำเนินการ',
    maintenance_completed: 'ซ่อมเสร็จสิ้น (รอตรวจสอบ)',
    completed: 'เสร็จสมบูรณ์',
    cancelled: 'ยกเลิก',
};

export default function MyRequests({ requests, filters }: Props) {
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    const { data: closeData, setData: setCloseData, post: postClose, processing: closeProcessing, reset: resetClose } = useForm({
        rating: '5',
        feedback: '',
    });

    const { post: postCancel, processing: cancelProcessing } = useForm();

    const handleFilterChange = (status: string) => {
        router.get(route('maintenance.requests.my'), 
            { status: status === 'all' ? undefined : status }, 
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleClose = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;
        postClose(route('maintenance.requests.close', { maintenanceRequest: selectedRequest.id }), {
            onSuccess: () => {
                setIsCloseDialogOpen(false);
                resetClose();
                setSelectedRequest(null);
            }
        });
    };

    const handleCancel = () => {
        if (!selectedRequest) return;
        postCancel(route('maintenance.requests.cancel', { maintenanceRequest: selectedRequest.id }), {
            onSuccess: () => {
                setIsCancelDialogOpen(false);
                setSelectedRequest(null);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },
            { title: 'รายการของฉัน', href: '#' }
        ]}>
            <Head title="รายการแจ้งซ่อมของฉัน" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">รายการแจ้งซ่อมของฉัน</h1>
                        <p className="text-slate-500">ติดตามสถานะและจัดการรายการแจ้งซ่อมของคุณ</p>
                    </div>
                    <Link href={route('maintenance.requests.create')}>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            แจ้งซ่อมใหม่
                        </Button>
                    </Link>
                </div>

                {/* Filter Tabs */}
                <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                    <Button 
                        variant={!filters.status ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleFilterChange('all')}
                        className={!filters.status ? "bg-slate-800 hover:bg-slate-900" : ""}
                    >
                        ทั้งหมด
                    </Button>
                    <Button 
                        variant={filters.status === 'pending' ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleFilterChange('pending')}
                        className={filters.status === 'pending' ? "bg-yellow-500 hover:bg-yellow-600 text-white border-transparent" : "text-yellow-600 border-yellow-200 hover:bg-yellow-50"}
                    >
                        รอดำเนินการ
                    </Button>
                    <Button 
                        variant={filters.status === 'assigned' ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleFilterChange('assigned')}
                        className={filters.status === 'assigned' ? "bg-blue-500 hover:bg-blue-600 text-white border-transparent" : "text-blue-600 border-blue-200 hover:bg-blue-50"}
                    >
                        มอบหมายแล้ว
                    </Button>
                    <Button 
                        variant={filters.status === 'in_progress' ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleFilterChange('in_progress')}
                        className={filters.status === 'in_progress' ? "bg-purple-500 hover:bg-purple-600 text-white border-transparent" : "text-purple-600 border-purple-200 hover:bg-purple-50"}
                    >
                        กำลังดำเนินการ
                    </Button>
                    <Button 
                        variant={filters.status === 'maintenance_completed' ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleFilterChange('maintenance_completed')}
                        className={filters.status === 'maintenance_completed' ? "bg-green-500 hover:bg-green-600 text-white border-transparent" : "text-green-600 border-green-200 hover:bg-green-50"}
                    >
                        รอตรวจสอบ
                    </Button>
                    <Button 
                        variant={filters.status === 'completed' ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleFilterChange('completed')}
                        className={filters.status === 'completed' ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}
                    >
                        เสร็จสมบูรณ์
                    </Button>
                    <Button 
                        variant={filters.status === 'cancelled' ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleFilterChange('cancelled')}
                        className={filters.status === 'cancelled' ? "bg-gray-500 hover:bg-gray-600 text-white border-transparent" : "text-gray-600 border-gray-200 hover:bg-gray-50"}
                    >
                        ยกเลิก
                    </Button>
                </div>

                {requests.data.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                                <Wrench className="w-8 h-8 text-orange-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">
                                {filters.status ? 'ไม่พบรายการในสถานะนี้' : 'ยังไม่มีรายการแจ้งซ่อม'}
                            </h3>
                            <p className="text-slate-500 mb-4">
                                {filters.status 
                                    ? 'ลองเปลี่ยนตัวกรองหรือเลือก "ทั้งหมด"' 
                                    : 'คุณยังไม่ได้สร้างรายการแจ้งซ่อมใดๆ'}
                            </p>
                            {filters.status ? (
                                <Button variant="outline" onClick={() => handleFilterChange('all')}>
                                    ดูรายการทั้งหมด
                                </Button>
                            ) : (
                                <Link href={route('maintenance.requests.create')}>
                                    <Button variant="outline">สร้างรายการใหม่</Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.data.map((req) => (
                            <Card key={req.id} className="group hover:shadow-md transition-all duration-200 border-slate-200">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="font-mono text-xs text-slate-500 bg-slate-50">
                                            {req.ticket_number}
                                        </Badge>
                                        <Badge className={cn("capitalize shadow-none", statusColors[req.status] || 'bg-gray-100 text-gray-800')}>
                                            {statusLabels[req.status] || req.status}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold text-lg text-slate-900 line-clamp-1 mt-2 group-hover:text-orange-600 transition-colors">
                                        {req.title}
                                    </h3>
                                </CardHeader>
                                <CardContent className="pb-3 space-y-3">
                                    <div className="flex items-start gap-2 text-sm text-slate-600">
                                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                        <span className="line-clamp-1">{req.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span>{format(new Date(req.created_at), 'd MMM yyyy HH:mm', { locale: th })}</span>
                                    </div>
                                    {req.technician && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span>ช่าง: {req.technician.name}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-3 border-t bg-slate-50/50 flex justify-between items-center">
                                    <Link href={route('maintenance.requests.show', { maintenanceRequest: req.id })}>
                                        <Button variant="ghost" size="sm" className="text-slate-600 hover:text-orange-600 hover:bg-orange-50">
                                            <Eye className="w-4 h-4 mr-2" />
                                            รายละเอียด
                                        </Button>
                                    </Link>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <Link href={route('maintenance.requests.show', { maintenanceRequest: req.id })}>
                                                <DropdownMenuItem>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    ดูรายละเอียด
                                                </DropdownMenuItem>
                                            </Link>
                                            
                                            {req.status === 'pending' && (
                                                <>
                                                    <Link href={route('maintenance.requests.edit', { maintenanceRequest: req.id })}>
                                                        <DropdownMenuItem>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            แก้ไข
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuItem 
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => {
                                                            setSelectedRequest(req);
                                                            setIsCancelDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        ยกเลิกรายการ
                                                    </DropdownMenuItem>
                                                </>
                                            )}

                                            {req.status === 'maintenance_completed' && (
                                                <DropdownMenuItem 
                                                    className="text-green-600 focus:text-green-600"
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setIsCloseDialogOpen(true);
                                                    }}
                                                >
                                                    <CheckSquare className="w-4 h-4 mr-2" />
                                                    ยืนยันงานเสร็จ
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Close Job Dialog */}
                <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>ยืนยันการซ่อมเสร็จสิ้น</DialogTitle>
                            <DialogDescription>
                                กรุณาประเมินความพึงพอใจและยืนยันว่างานซ่อมได้ดำเนินการเรียบร้อยแล้ว
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleClose} className="space-y-4">
                            <div className="space-y-2">
                                <Label>ความพึงพอใจ</Label>
                                <Select 
                                    value={closeData.rating} 
                                    onValueChange={(val) => setCloseData('rating', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกคะแนน" />
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
                                    value={closeData.feedback}
                                    onChange={(e) => setCloseData('feedback', e.target.value)}
                                    placeholder="ระบุข้อเสนอแนะ..."
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={closeProcessing}>
                                    ยืนยันปิดงาน
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Cancel Dialog */}
                <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
                            <AlertDialogDescription>
                                คุณต้องการยกเลิกรายการแจ้งซ่อมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>ไม่, เก็บไว้</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleCancel}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={cancelProcessing}
                            >
                                ใช่, ยกเลิกรายการ
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
