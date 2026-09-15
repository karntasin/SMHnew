import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Clock, MapPin, Car, Search, Filter, X, UserCheck, CheckCircle, Clock3 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import VehicleSubNav from '../VehicleSubNav';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';

interface Booking {
    id: number;
    booking_number: string;
    status: string;
    purpose: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    driver_confirmed_at?: string;
    vehicle?: {
        license_plate: string;
        brand: string;
        model: string;
    };
    driver?: {
        id: number;
        name: string;
    };
    category?: {
        name: string;
    };
}

interface Props {
    bookings: {
        data: Booking[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    stats: {
        total: number;
        pending: number;
        approved: number;
        completed: number;
    };
    filters: {
        status?: string;
        date_from?: string;
        date_to?: string;
        search?: string;
    };
}

export default function MyRequests({ bookings, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const applyFilters = () => {
        router.get(route('vehicles.bookings.my'), {
            search: search || undefined,
            status: status === 'all' ? undefined : status,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setDateFrom('');
        setDateTo('');
        router.get(route('vehicles.bookings.my'));
    };

    const getStatusBadge = (booking: Booking) => {
        switch (booking.status) {
            case 'approved': 
                return booking.driver_confirmed_at 
                    ? <Badge className="bg-green-500">พร้อมใช้งาน</Badge>
                    : <Badge className="bg-teal-500">อนุมัติแล้ว (รอคนขับ)</Badge>;
            case 'pending': 
                return <Badge className="bg-yellow-500">รออนุมัติ</Badge>;
            case 'rejected': 
                return <Badge className="bg-red-500">ไม่อนุมัติ</Badge>;
            case 'cancelled': 
                return <Badge className="bg-gray-500">ยกเลิก</Badge>;
            case 'completed': 
                return <Badge className="bg-blue-500">เสร็จสิ้น</Badge>;
            default: 
                return <Badge>{booking.status}</Badge>;
        }
    };

    const hasActiveFilters = search || (status && status !== 'all') || dateFrom || dateTo;

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองรถ', href: route('vehicles.index') },
            { title: 'รายการขอใช้รถของฉัน', href: '#' }
        ]}>
            <Head title="รายการขอใช้รถของฉัน" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <VehicleSubNav active="vehicles.bookings.my" />

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800">รายการขอใช้รถของฉัน</h1>
                            <p className="text-sm text-slate-500">ติดตามสถานะคำขอใช้รถที่คุณส่ง</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href={route('vehicles.bookings.index')}>
                                <Button variant="outline" className="rounded-xl">รายการทั้งหมด</Button>
                            </Link>
                            <Link href={route('vehicles.bookings.create')}>
                                <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-2 h-4 w-4" /> ขอใช้รถใหม่
                                </Button>
                            </Link>
                        </div>
                    </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> ทั้งหมด
                            </CardTitle>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
                    </Card>
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                                <Clock3 className="h-4 w-4" /> รออนุมัติ
                            </CardTitle>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div></CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" /> อนุมัติแล้ว
                            </CardTitle>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold text-green-600">{stats.approved}</div></CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" /> เสร็จสิ้น
                            </CardTitle>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold text-blue-600">{stats.completed}</div></CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="h-5 w-5" /> ตัวกรอง
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label>ค้นหา</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        placeholder="เลขที่ / วัตถุประสงค์ / จุดหมาย"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>สถานะ</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="ทั้งหมด" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        <SelectItem value="pending">รออนุมัติ</SelectItem>
                                        <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                                        <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
                                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                                        <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>วันที่เริ่ม</Label>
                                <ThaiDatePicker
                                    value={dateFrom}
                                    onChange={setDateFrom}
                                    placeholder="วันที่เริ่ม"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>วันที่สิ้นสุด</Label>
                                <ThaiDatePicker
                                    value={dateTo}
                                    onChange={setDateTo}
                                    placeholder="วันที่สิ้นสุด"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>&nbsp;</Label>
                                <div className="flex gap-2">
                                    <Button onClick={applyFilters} className="flex-1">
                                        <Search className="mr-2 h-4 w-4" /> ค้นหา
                                    </Button>
                                    {hasActiveFilters && (
                                        <Button variant="outline" onClick={clearFilters}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เลขที่</TableHead>
                                    <TableHead>รถ</TableHead>
                                    <TableHead>คนขับ</TableHead>
                                    <TableHead>จุดหมาย</TableHead>
                                    <TableHead>วันที่ใช้รถ</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            ไม่พบข้อมูลการจอง
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bookings.data.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell className="font-medium">{booking.booking_number}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Car className="mr-2 h-4 w-4 text-gray-500" />
                                                    <div>
                                                        {booking.vehicle ? (
                                                            <>
                                                                <div className="font-bold">{booking.vehicle.license_plate}</div>
                                                                <div className="text-xs text-gray-500">{booking.vehicle.brand} {booking.vehicle.model}</div>
                                                            </>
                                                        ) : (
                                                            <span className="text-yellow-600 italic">รอจัดรถ</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <UserCheck className="mr-2 h-4 w-4 text-gray-500" />
                                                    {booking.driver ? (
                                                        <div>
                                                            <div>{booking.driver.name}</div>
                                                            {booking.driver_confirmed_at ? (
                                                                <span className="text-xs text-green-600">ยืนยันแล้ว</span>
                                                            ) : (
                                                                <span className="text-xs text-yellow-600">รอยืนยัน</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 italic">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                                                    <div>
                                                        <div>{booking.destination}</div>
                                                        <div className="text-xs text-gray-500">{booking.purpose}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">
                                                        {format(new Date(booking.start_datetime), 'd MMM yyyy HH:mm', { locale: th })}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ถึง {format(new Date(booking.end_datetime), 'd MMM yyyy HH:mm', { locale: th })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(booking)}</TableCell>
                                            <TableCell>
                                                <Link href={route('vehicles.bookings.show', booking.id)}>
                                                    <Button variant="ghost" size="sm">รายละเอียด</Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {bookings.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {bookings.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? "default" : "outline"}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
                </div>
            </div>
        </AppLayout>
    );
}
