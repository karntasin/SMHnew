import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    Wrench,
    Clock,
    CheckCircle2,
    PlayCircle,
    XCircle,
    Search,
    MapPin,
    User,
    Calendar,
    Eye,
    HandMetal,
    AlertTriangle,
    FileText,
    Image as ImageIcon
} from 'lucide-react';

interface MaintenanceImage {
    id: number;
    image_path: string;
}

interface WorkOrder {
    id: number;
    ticket_number: string;
    title: string;
    description: string;
    location: string;
    status: string;
    created_at: string;
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
    };
    images?: MaintenanceImage[];
}

interface WorkOrdersProps {
    workOrders: {
        data: WorkOrder[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    stats: {
        pending: number;
        in_progress: number;
        completed: number;
        my_work: number;
    };
    filters: {
        status?: string;
        filter?: string;
    };
    userPositions: string[];
    isHeadTech?: boolean;
    technicians?: { id: number; name: string }[];
}

export default function WorkOrders({ workOrders, stats, filters, userPositions, isHeadTech, technicians }: WorkOrdersProps) {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Defensive initialization for activeTab
    // Ensure filters is an object (not array) and filter property is a string to avoid passing Array.prototype.filter to useState
    const initialFilter = (filters && !Array.isArray(filters) && typeof filters.filter === 'string') ? filters.filter : 'all';
    const [activeTab, setActiveTab] = useState(initialFilter);

    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState<number | null>(null);
    const [selectedTechnician, setSelectedTechnician] = useState<string>('');

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.get(route('technician.work-orders.index'), { 
            filter: value === 'all' ? undefined : value 
        }, { preserveState: true });
    };

    const handleAcceptWork = (workOrderId: number) => {
        if (confirm('คุณต้องการรับงานนี้ใช่หรือไม่?')) {
            router.post(route('technician.work-orders.accept', { workOrder: workOrderId }));
        }
    };

    const handleAssignClick = (workOrderId: number) => {
        setSelectedWorkOrder(workOrderId);
        setAssignDialogOpen(true);
    };

    const submitAssignment = () => {
        if (selectedWorkOrder && selectedTechnician) {
            router.post(route('technician.work-orders.assign', { workOrder: selectedWorkOrder }), {
                technician_id: selectedTechnician
            }, {
                onSuccess: () => {
                    setAssignDialogOpen(false);
                    setSelectedWorkOrder(null);
                    setSelectedTechnician('');
                }
            });
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock };
            case 'assigned':
                return { label: 'มอบหมายแล้ว', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: User };
            case 'in_progress':
                return { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: PlayCircle };
            case 'maintenance_completed':
                return { label: 'รอตรวจสอบ', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: CheckCircle2 };
            case 'completed':
                return { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 };
            case 'cancelled':
                return { label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock };
        }
    };

    const getPriorityColor = (level?: number) => {
        switch (level) {
            case 5: return 'bg-red-500';
            case 4: return 'bg-orange-500';
            case 3: return 'bg-yellow-500';
            case 2: return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Defensive checks for arrays
    const safeWorkOrders = Array.isArray(workOrders?.data) ? workOrders.data : [];
    const safeUserPositions = Array.isArray(userPositions) ? userPositions : [];
    const safeLinks = Array.isArray(workOrders?.links) ? workOrders.links : [];

    const filteredOrders = safeWorkOrders.filter(order => 
        searchTerm === '' || 
        (order.ticket_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={[
            { title: 'ใบงานซ่อมบำรุง', href: '#' }
        ]}>
            <Head title="ใบงานซ่อมบำรุง" />

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Wrench className="w-7 h-7" />
                            ใบงานซ่อมบำรุง
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            จัดการและติดตามใบงานซ่อมบำรุงทั้งหมด
                        </p>
                        {safeUserPositions.length > 0 && (
                            <div className="flex gap-2 mt-2">
                                {safeUserPositions.map((pos, idx) => (
                                    <Badge key={idx} variant="outline">{pos}</Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="ค้นหาเลขที่ใบงาน, ชื่อ, สถานที่..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">รอดำเนินการ</p>
                                    <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">กำลังดำเนินการ</p>
                                    <p className="text-2xl font-bold">{stats?.in_progress || 0}</p>
                                </div>
                                <PlayCircle className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">เสร็จสิ้น</p>
                                    <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">งานของฉัน</p>
                                    <p className="text-2xl font-bold">{stats?.my_work || 0}</p>
                                </div>
                                <HandMetal className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs & Work Orders */}
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                        <TabsTrigger value="pending" className="flex items-center gap-1">
                            รอรับงาน
                            {(stats?.pending || 0) > 0 && (
                                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                    {stats?.pending || 0}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="my_work">งานของฉัน</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab}>
                        {filteredOrders.length > 0 ? (
                            <div className="grid gap-4">
                                {filteredOrders.map((order) => {
                                    const statusConfig = getStatusConfig(order.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <Card key={order.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                    {/* Priority indicator */}
                                                    <div className={`w-1 md:w-1.5 h-full md:h-24 rounded-full ${getPriorityColor(order.priority?.level)}`} />
                                                    
                                                    {/* Main content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-mono text-sm text-muted-foreground">
                                                                        {order.ticket_number}
                                                                    </span>
                                                                    <Badge className={statusConfig.color}>
                                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                                        {statusConfig.label}
                                                                    </Badge>
                                                                    {order.category && (
                                                                        <Badge variant="outline">
                                                                            {order.category.name}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <h3 className="font-semibold text-lg mt-1 truncate">
                                                                    {order.title}
                                                                </h3>
                                                            </div>
                                                            {order.images && order.images.length > 0 && (
                                                                <Badge variant="secondary" className="flex items-center gap-1">
                                                                    <ImageIcon className="w-3 h-3" />
                                                                    {order.images.length}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex gap-4 mb-3">
                                                            {order.images && order.images.length > 0 && (
                                                                <div className="shrink-0">
                                                                    <img 
                                                                        src={`/storage/${order.images[0].image_path}`} 
                                                                        alt="รูปภาพประกอบ" 
                                                                        className="w-20 h-20 object-cover rounded-md border"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.style.display = 'none';
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                                                                {order.description || 'ไม่มีรายละเอียดระบุ'}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="w-4 h-4" />
                                                                {order.location}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <User className="w-4 h-4" />
                                                                {order.requester?.name || 'N/A'}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-4 h-4" />
                                                                {formatDate(order.created_at)}
                                                            </div>
                                                            {order.priority && (
                                                                <div className="flex items-center gap-1">
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                    {order.priority.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex md:flex-col gap-2">
                                                        <Link href={route('technician.work-orders.show', { workOrder: order.id })}>
                                                            <Button variant="outline" size="sm" className="w-full">
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                ดูรายละเอียด
                                                            </Button>
                                                        </Link>
                                                        
                                                        {/* Head Tech Assign Button */}
                                                        {isHeadTech && order.status === 'pending' && (
                                                            <Button 
                                                                size="sm" 
                                                                className="w-full bg-blue-600 hover:bg-blue-700"
                                                                onClick={() => handleAssignClick(order.id)}
                                                            >
                                                                <User className="w-4 h-4 mr-1" />
                                                                มอบหมายงาน
                                                            </Button>
                                                        )}

                                                        {/* Technician Accept Button (Only if assigned) */}
                                                        {order.status === 'assigned' && (
                                                            <Button 
                                                                size="sm" 
                                                                className="w-full bg-green-600 hover:bg-green-700"
                                                                onClick={() => handleAcceptWork(order.id)}
                                                            >
                                                                <HandMetal className="w-4 h-4 mr-1" />
                                                                รับงาน
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground">ไม่พบใบงาน</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Pagination */}
                        {(workOrders?.last_page || 0) > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                {safeLinks.map((link, index) => (
                                    <Button
                                        key={index}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>มอบหมายงาน</DialogTitle>
                            <DialogDescription>
                                เลือกช่างที่ต้องการมอบหมายงานให้
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="technician" className="text-right">
                                    ช่าง
                                </Label>
                                <Select onValueChange={setSelectedTechnician} value={selectedTechnician}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="เลือกช่าง..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {technicians?.map((tech) => (
                                            <SelectItem key={tech.id} value={String(tech.id)}>
                                                {tech.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={submitAssignment} disabled={!selectedTechnician}>บันทึก</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
