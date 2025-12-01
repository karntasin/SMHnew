import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Clock, Users, CheckCircle, XCircle, Search, Filter, Plus, MoreHorizontal, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import CreateModal from './CreateModal';

interface Room {
    id: number;
    name: string;
    capacity: number;
    location: string;
    status: string;
    color: string;
}

interface Booking {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    status: string;
    room: Room;
    user: { name: string };
    attendees_count: number;
}

interface Props {
    rooms: Room[];
    bookings: Booking[];
    stats: {
        total_bookings: number;
        pending_approval: number;
        today_bookings: number;
        active_rooms: number;
    };
    currentFilter: string;
}

export default function List({ rooms = [], bookings = [], stats, currentFilter = 'all' }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { url } = usePage();

    // Default stats values
    const safeStats = stats || {
        total_bookings: 0,
        pending_approval: 0,
        today_bookings: 0,
        active_rooms: 0
    };

    // Auto-open create modal when ?action=create is in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'create') {
            setIsCreateModalOpen(true);
            // Remove action param from URL without refresh
            params.delete('action');
            const newUrl = params.toString() 
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [url]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> อนุมัติแล้ว</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> รออนุมัติ</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> ไม่อนุมัติ</Badge>;
            case 'completed':
                return <Badge variant="secondary">เสร็จสิ้น</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDateTime = (dateString: string) => {
        return format(new Date(dateString), 'd MMM yy HH:mm', { locale: th });
    };

    const filteredBookings = (bookings || []).filter(booking => 
        booking.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.room?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFilterClick = (filter: string) => {
        router.get(route('rooms.index'), { filter }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบจองห้องประชุม', href: '/administration/rooms' }]}>
            <Head title="รายการจองห้องประชุม" />

            <div className="container mx-auto py-6 space-y-6">
                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">ระบบจองห้องประชุม</h1>
                        <p className="text-muted-foreground">จัดการการจองห้องประชุมและตรวจสอบสถานะ</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('rooms.calendar')}>
                            <Button variant="outline">
                                <Calendar className="mr-2 h-4 w-4" />
                                ปฏิทินการจอง
                            </Button>
                        </Link>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" />
                            จองห้องประชุม
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${currentFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => handleFilterClick('all')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">การจองทั้งหมด</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{safeStats.total_bookings}</div>
                            <p className="text-xs text-muted-foreground">รายการจองในระบบ</p>
                        </CardContent>
                    </Card>
                    <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${currentFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
                        onClick={() => handleFilterClick('pending')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">รออนุมัติ</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{safeStats.pending_approval}</div>
                            <p className="text-xs text-muted-foreground">รายการที่ต้องตรวจสอบ</p>
                        </CardContent>
                    </Card>
                    <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${currentFilter === 'today' ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => handleFilterClick('today')}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">การจองวันนี้</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{safeStats.today_bookings}</div>
                            <p className="text-xs text-muted-foreground">รายการที่เกิดขึ้นวันนี้</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ห้องที่พร้อมใช้งาน</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{safeStats.active_rooms} / {rooms.length}</div>
                            <p className="text-xs text-muted-foreground">ห้องประชุมทั้งหมด</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <CardTitle>รายการจองล่าสุด</CardTitle>
                                {currentFilter !== 'all' && (
                                    <Badge variant="secondary" className="ml-2">
                                        {currentFilter === 'pending' ? 'รออนุมัติ' : 'วันนี้'}
                                        <button onClick={(e) => { e.stopPropagation(); handleFilterClick('all'); }} className="ml-1 hover:text-red-500">
                                            <XCircle className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ค้นหาหัวข้อ, ผู้จอง..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="icon">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>หัวข้อการประชุม</TableHead>
                                        <TableHead>ห้องประชุม</TableHead>
                                        <TableHead>วัน-เวลา</TableHead>
                                        <TableHead>ผู้จอง</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead className="text-right">จัดการ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBookings.length > 0 ? (
                                        filteredBookings.map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{booking.title}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> {booking.attendees_count} คน
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: booking.room.color }}></div>
                                                        {booking.room.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-sm">
                                                        <span className="font-medium">{format(new Date(booking.start_time), 'd MMM yyyy', { locale: th })}</span>
                                                        <span className="text-muted-foreground">
                                                            {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{booking.user.name}</TableCell>
                                                <TableCell>{getStatusBadge(booking.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>การจัดการ</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => router.visit(route('rooms.bookings.show', booking.id))}>
                                                                ดูรายละเอียด
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {booking.status === 'pending' && (
                                                                <>
                                                                    <DropdownMenuItem className="text-green-600" onClick={() => router.post(route('rooms.bookings.approve', booking.id))}>
                                                                        อนุมัติการจอง
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-red-600" onClick={() => router.delete(route('rooms.bookings.destroy', booking.id))}>
                                                                        ไม่อนุมัติ / ยกเลิก
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                ไม่พบข้อมูลการจอง
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <CreateModal 
                open={isCreateModalOpen} 
                onOpenChange={setIsCreateModalOpen} 
                rooms={rooms}
            />
        </AppLayout>
    );
}
